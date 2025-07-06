import AsyncStorage from '@react-native-async-storage/async-storage';
import { AxiosInstance } from 'axios';
import { axiosInstance, createAxiosInstance } from '../../utils/axiosConfig';
import { Config } from '../../utils/config';
import { handleSessionCookie, updateAxiosInstanceCookie } from '../../utils/cookieHelpers';

// Authentication result types
export interface AuthResult {
  success: boolean;
  sessionId?: string;
  message?: string;
  error?: string;
}

export interface SessionInfo {
  sessionId: string;
  username: string;
  createdAt: Date;
  expiresAt: Date;
  isValid: boolean;
}

export interface AuthenticationService {
  login(username: string, password: string): Promise<AuthResult>;
  logout(): Promise<void>;
  refreshSession(): Promise<boolean>;
  verifySession(): Promise<boolean>;
  getSessionInfo(): Promise<SessionInfo | null>;
  enableBiometric(): Promise<boolean>;
  authenticateWithBiometric(): Promise<boolean>;
}

// Storage keys
const SESSION_KEY = 'router_session';
const CREDENTIALS_KEY = 'router_credentials';
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

export class EnhancedAuthenticationService implements AuthenticationService {
  private axiosInstance: AxiosInstance;
  private sessionId: string | null = null;
  private sessionRefreshTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Create a dedicated axios instance for authentication with custom base URL
    this.axiosInstance = createAxiosInstance();
    this.axiosInstance.defaults.baseURL = `http://${Config.router.defaultIp}`;

    // Initialize session from storage
    this.initializeSession();
  }

  private async initializeSession() {
    try {
      const storedSession = await AsyncStorage.getItem(SESSION_KEY);
      if (storedSession) {
        const sessionInfo = JSON.parse(storedSession);
        const expiresAt = new Date(sessionInfo.expiresAt);
        
// Check if session is still valid
        if (expiresAt > new Date()) {
          this.sessionId = sessionInfo.sessionId;
          // Update axios instance with the restored session cookie
          updateAxiosInstanceCookie(this.axiosInstance, `SESSIONID=${this.sessionId}`);
          this.setupSessionRefresh(expiresAt);
          console.log('Session restored from storage');
        } else {
          // Session expired, clear it
          await this.clearSession();
          console.log('Stored session expired, cleared');
        }
      }
    } catch (error) {
      console.error('Error initializing session:', error);
    }
  }

  async login(username: string, password: string): Promise<AuthResult> {
    try {
      console.log('Attempting login to router...');
      
      // Clear any existing session
      await this.clearSession();

      // According to the manual, login endpoint is /login.cgi
      const response = await this.axiosInstance.post(
        '/login.cgi',
        new URLSearchParams({
          username,
          password,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          maxRedirects: 0,
          validateStatus: (status) => status < 400, // Accept redirects
        }
      );

// Extract and handle session cookie
      const sessionId = handleSessionCookie(response, this.axiosInstance);

      // Check if login was successful (302 redirect is expected)
      if (response.status === 302 && sessionId) {
        this.sessionId = sessionId;
        
        // Store session info
        const sessionInfo: SessionInfo = {
          sessionId,
          username,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
          isValid: true,
        };
        
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(sessionInfo));
        
        // Store credentials for auto-login if enabled
        if (Config.app.saveCredentials) {
          await this.storeCredentials(username, password);
        }
        
        // Setup session refresh
        this.setupSessionRefresh(sessionInfo.expiresAt);
        
        console.log('Login successful, session established');
        return {
          success: true,
          sessionId,
          message: 'Login successful',
        };
      } else {
        console.error('Login failed: Invalid response or no session cookie');
        return {
          success: false,
          error: 'Invalid credentials or login failed',
        };
      }
    } catch (error: any) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.message || 'Login failed',
      };
    }
  }

  async logout(): Promise<void> {
    try {
      // Clear session on router if possible
      if (this.sessionId) {
        try {
          await this.axiosInstance.post('/logout.cgi', {}, {
            headers: {
              'Cookie': `SESSIONID=${this.sessionId}`,
            },
          });
        } catch (error) {
          console.warn('Router logout request failed:', error);
        }
      }

      // Clear local session
      await this.clearSession();
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local session even if router logout fails
      await this.clearSession();
    }
  }

async refreshSession(): Promise<boolean> {
    try {
      if (!this.sessionId) {
        console.log('No session to refresh');
        return false;
      }

      console.log('Refreshing session...');
      
      // Try to access a protected endpoint to refresh session
      const response = await this.axiosInstance.get('/wlanRadio.asp', {
        headers: {
          'Cookie': `SESSIONID=${this.sessionId}`,
        },
        validateStatus: (status) => true,
      });

      // Extract and handle session cookie
      handleSessionCookie(response, this.axiosInstance);

      // If we get a login redirect, session is invalid
      if (response.status === 401 || response.data.includes('login.cgi')) {
        console.log('Session expired, attempting re-authentication...');
        
        // Try to re-authenticate with stored credentials
        const credentials = await this.getStoredCredentials();
        if (credentials) {
          const result = await this.login(credentials.username, credentials.password);
          return result.success;
        }
        
        return false;
      }

      // Session is still valid, update expiry
      const sessionInfo = await this.getSessionInfo();
      if (sessionInfo) {
        sessionInfo.expiresAt = new Date(Date.now() + 30 * 60 * 1000);
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(sessionInfo));
        this.setupSessionRefresh(sessionInfo.expiresAt);
      }

      console.log('Session refreshed successfully');
      return true;
    } catch (error) {
      console.error('Session refresh error:', error);
      return false;
    }
  }

async verifySession(): Promise<boolean> {
    try {
      if (!this.sessionId) {
        // No session, try auto-login if credentials are saved
        if (Config.app.saveCredentials) {
          return await this.tryAutoLogin();
        }
        return false;
      }

      // Try to access a protected endpoint
      const response = await this.axiosInstance.get('/gateway_settings.asp', {
        headers: {
          'Cookie': `SESSIONID=${this.sessionId}`,
        },
        validateStatus: (status) => true,
      });

      // Extract and handle session cookie
      handleSessionCookie(response, this.axiosInstance);

      // Check if we're redirected to login
      const isValid = response.status === 200 && !response.data.includes('login.cgi');
      
      if (!isValid) {
        await this.clearSession();
        
        // Try auto-login if credentials are saved
        if (Config.app.saveCredentials) {
          console.log('Session invalid, attempting auto-login...');
          return await this.tryAutoLogin();
        }
      }
      
      return isValid;
    } catch (error) {
      console.error('Session verification error:', error);
      
      // Try auto-login on error if credentials are saved
      if (Config.app.saveCredentials) {
        return await this.tryAutoLogin();
      }
      
      return false;
    }
  }

  async getSessionInfo(): Promise<SessionInfo | null> {
    try {
      const storedSession = await AsyncStorage.getItem(SESSION_KEY);
      if (storedSession) {
        const sessionInfo = JSON.parse(storedSession);
        sessionInfo.createdAt = new Date(sessionInfo.createdAt);
        sessionInfo.expiresAt = new Date(sessionInfo.expiresAt);
        sessionInfo.isValid = sessionInfo.expiresAt > new Date();
        return sessionInfo;
      }
      return null;
    } catch (error) {
      console.error('Error getting session info:', error);
      return null;
    }
  }

  async enableBiometric(): Promise<boolean> {
    try {
      // Check if we have stored credentials first
      const credentials = await this.getStoredCredentials();
      if (!credentials) {
        console.warn('Cannot enable biometric without stored credentials');
        return false;
      }

      // In a real implementation, you would use expo-local-authentication
      // For now, just store the preference
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
      console.log('Biometric authentication enabled');
      return true;
    } catch (error) {
      console.error('Error enabling biometric:', error);
      return false;
    }
  }

  async authenticateWithBiometric(): Promise<boolean> {
    try {
      const biometricEnabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
      if (biometricEnabled !== 'true') {
        console.log('Biometric authentication not enabled');
        return false;
      }

      // In a real implementation, you would:
      // 1. Use expo-local-authentication to verify biometric
      // 2. If successful, retrieve stored credentials and login
      
      // For now, simulate biometric auth
      console.log('Simulating biometric authentication...');
      
      const credentials = await this.getStoredCredentials();
      if (credentials) {
        const result = await this.login(credentials.username, credentials.password);
        return result.success;
      }
      
      return false;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  }

// Private helper methods
  private async clearSession() {
    this.sessionId = null;
    if (this.sessionRefreshTimer) {
      clearTimeout(this.sessionRefreshTimer);
      this.sessionRefreshTimer = null;
    }
    await AsyncStorage.removeItem(SESSION_KEY);
    // Clear cookies from axios instance
    updateAxiosInstanceCookie(this.axiosInstance, null);
  }

  private setupSessionRefresh(expiresAt: Date) {
    // Clear existing timer
    if (this.sessionRefreshTimer) {
      clearTimeout(this.sessionRefreshTimer);
    }

    // Calculate when to refresh (5 minutes before expiry)
    const refreshTime = expiresAt.getTime() - Date.now() - 5 * 60 * 1000;
    
    if (refreshTime > 0) {
      this.sessionRefreshTimer = setTimeout(() => {
        this.refreshSession();
      }, refreshTime);
    }
  }

  private async storeCredentials(username: string, password: string) {
    try {
      // In a real app, you would use expo-secure-store or similar
      // For now, using AsyncStorage with a warning
      console.warn('Storing credentials in AsyncStorage - use secure storage in production!');
      
      const credentials = {
        username,
        password: Buffer.from(password).toString('base64'), // Basic encoding
      };
      
      await AsyncStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
    } catch (error) {
      console.error('Error storing credentials:', error);
    }
  }

private async getStoredCredentials(): Promise<{ username: string; password: string } | null> {
    try {
      const stored = await AsyncStorage.getItem(CREDENTIALS_KEY);
      if (stored) {
        const credentials = JSON.parse(stored);
        return {
          username: credentials.username,
          password: Buffer.from(credentials.password, 'base64').toString(), // Decode
        };
      }
      return null;
    } catch (error) {
      console.error('Error retrieving credentials:', error);
      return null;
    }
  }

  private async tryAutoLogin(): Promise<boolean> {
    try {
      const credentials = await this.getStoredCredentials();
      if (credentials) {
        console.log('Attempting automatic login with stored credentials...');
        const result = await this.login(credentials.username, credentials.password);
        return result.success;
      }
      return false;
    } catch (error) {
      console.error('Auto-login error:', error);
      return false;
    }
  }

// Get axios instance for other services to use
  getAxiosInstance(): AxiosInstance {
    // Add session cookie to all requests
    updateAxiosInstanceCookie(
      this.axiosInstance, 
      this.sessionId ? `SESSIONID=${this.sessionId}` : null
    );
    return this.axiosInstance;
  }
}

// Export singleton instance
export const authService = new EnhancedAuthenticationService();
