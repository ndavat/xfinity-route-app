import AsyncStorage from '@react-native-async-storage/async-storage';
import { AxiosInstance } from 'axios';
import { axiosInstance, createAxiosInstance } from '../../utils/axiosConfig';
import { Config } from '../../utils/config';
import { handleSessionCookie, updateAxiosInstanceCookie } from '../../utils/cookieHelpers';
import { SessionManager } from './SessionManager';
import { addLog } from '../debug/LogStore';

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
  private sessionManager: SessionManager;
  private sessionRefreshTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Create a dedicated axios instance for authentication with custom base URL
    this.axiosInstance = createAxiosInstance();
    this.axiosInstance.defaults.baseURL = `http://${Config.router.defaultIp}`;

    // Initialize session manager with enhanced cookie support
    this.sessionManager = new SessionManager(this.axiosInstance);
    
    this.logAuthAttempt('service_init', true, 'AuthenticationService initialized with SessionManager');
  }

  // Removed initializeSession - now handled by SessionManager

  async login(username: string, password: string): Promise<AuthResult> {
    try {
      console.log('Attempting login to router...');
      this.logAuthAttempt('login_attempt', true, `Attempting login for user: ${username}`);
      
      // Clear any existing session
      await this.sessionManager.clearSession();

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

      // Handle session cookies through SessionManager
      const sessionId = await this.sessionManager.handleLoginResponse(response);

      // Check if login was successful (302 redirect is expected)
      if (response.status === 302 && sessionId) {
        // Store session with enhanced cookie management
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        await this.sessionManager.storeSession(sessionId, username, expiresAt);
        
        // Store credentials for auto-login if enabled
        if (Config.app.saveCredentials) {
          await this.storeCredentials(username, password);
        }
        
        console.log('Login successful, session established');
        this.logAuthAttempt('login_success', true, `Login successful for user: ${username}, sessionId: ${sessionId}`);
        
        return {
          success: true,
          sessionId,
          message: 'Login successful',
        };
      } else {
        console.error('Login failed: Invalid response or no session cookie');
        this.logAuthAttempt('login_failed', false, `Login failed - Status: ${response.status}, No session cookie`);
        
        return {
          success: false,
          error: 'Invalid credentials or login failed',
        };
      }
    } catch (error: any) {
      console.error('Login error:', error);
      this.logAuthAttempt('login_error', false, `Login error: ${error.message}`);
      
      return {
        success: false,
        error: error.message || 'Login failed',
      };
    }
  }

  async logout(): Promise<void> {
    try {
      const sessionInfo = this.sessionManager.getSessionInfo();
      
      // Clear session on router if possible
      if (sessionInfo.sessionId) {
        try {
          await this.axiosInstance.post('/logout.cgi', {}, {
            validateStatus: (status) => true,
          });
          this.logAuthAttempt('logout_request', true, 'Router logout request sent');
        } catch (error) {
          console.warn('Router logout request failed:', error);
          this.logAuthAttempt('logout_request', false, `Router logout failed: ${error}`);
        }
      }

      // Clear local session through SessionManager
      await this.sessionManager.clearSession();
      console.log('Logout successful');
      this.logAuthAttempt('logout_success', true, 'Logout completed successfully');
    } catch (error) {
      console.error('Logout error:', error);
      this.logAuthAttempt('logout_error', false, `Logout error: ${error}`);
      // Still clear local session even if router logout fails
      await this.sessionManager.clearSession();
    }
  }

async refreshSession(): Promise<boolean> {
    try {
      const sessionInfo = this.sessionManager.getSessionInfo();
      
      if (!sessionInfo.sessionId) {
        console.log('No session to refresh');
        this.logAuthAttempt('refresh_attempt', false, 'No session available for refresh');
        return false;
      }

      console.log('Refreshing session...');
      this.logAuthAttempt('refresh_attempt', true, 'Attempting session refresh');
      
      // Use SessionManager's refresh functionality
      const refreshResult = await this.sessionManager.refreshSession();
      
      if (!refreshResult) {
        // Try to re-authenticate with stored credentials
        const credentials = await this.getStoredCredentials();
        if (credentials) {
          console.log('Session refresh failed, attempting re-authentication...');
          this.logAuthAttempt('refresh_fallback', true, 'Attempting re-authentication after failed refresh');
          
          const result = await this.login(credentials.username, credentials.password);
          return result.success;
        }
        
        this.logAuthAttempt('refresh_failed', false, 'Session refresh failed and no stored credentials');
        return false;
      }

      console.log('Session refreshed successfully');
      this.logAuthAttempt('refresh_success', true, 'Session refreshed successfully');
      return true;
    } catch (error) {
      console.error('Session refresh error:', error);
      this.logAuthAttempt('refresh_error', false, `Session refresh error: ${error}`);
      return false;
    }
  }

async verifySession(): Promise<boolean> {
    try {
      const sessionInfo = this.sessionManager.getSessionInfo();
      
      if (!sessionInfo.sessionId) {
        // No session, try auto-login if credentials are saved
        this.logAuthAttempt('verify_attempt', false, 'No session available for verification');
        
        if (Config.app.saveCredentials) {
          return await this.tryAutoLogin();
        }
        return false;
      }

      console.log('Verifying session...');
      this.logAuthAttempt('verify_attempt', true, `Verifying session: ${sessionInfo.sessionId}`);
      
      // Use SessionManager's verification functionality
      const isValid = await this.sessionManager.verifySession();
      
      if (!isValid) {
        // Try auto-login if credentials are saved
        if (Config.app.saveCredentials) {
          console.log('Session invalid, attempting auto-login...');
          this.logAuthAttempt('verify_fallback', true, 'Session invalid, attempting auto-login');
          return await this.tryAutoLogin();
        }
        
        this.logAuthAttempt('verify_failed', false, 'Session verification failed');
      } else {
        this.logAuthAttempt('verify_success', true, 'Session verified successfully');
      }
      
      return isValid;
    } catch (error) {
      console.error('Session verification error:', error);
      this.logAuthAttempt('verify_error', false, `Session verification error: ${error}`);
      
      // Try auto-login on error if credentials are saved
      if (Config.app.saveCredentials) {
        return await this.tryAutoLogin();
      }
      
      return false;
    }
  }

  async getSessionInfo(): Promise<SessionInfo | null> {
    try {
      const storedSession = await AsyncStorage.getItem('enhanced_router_session');
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
  // clearSession method is now handled by SessionManager

  // setupSessionRefresh method is now handled by SessionManager

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
        this.logAuthAttempt('auto_login_attempt', true, `Attempting auto-login for user: ${credentials.username}`);
        
        const result = await this.login(credentials.username, credentials.password);
        
        if (result.success) {
          this.logAuthAttempt('auto_login_success', true, 'Auto-login successful');
        } else {
          this.logAuthAttempt('auto_login_failed', false, 'Auto-login failed');
        }
        
        return result.success;
      }
      
      this.logAuthAttempt('auto_login_no_credentials', false, 'No stored credentials for auto-login');
      return false;
    } catch (error) {
      console.error('Auto-login error:', error);
      this.logAuthAttempt('auto_login_error', false, `Auto-login error: ${error}`);
      return false;
    }
  }

// Get axios instance for other services to use
  getAxiosInstance(): AxiosInstance {
    // Session management is now handled automatically by SessionManager
    return this.axiosInstance;
  }

  /**
   * Log authentication attempts with detailed information
   */
  private async logAuthAttempt(action: string, success: boolean, details: string) {
    try {
      const sessionInfo = this.sessionManager.getSessionInfo();
      
      await addLog({
        type: 'auth',
        action,
        success,
        details,
        sessionId: sessionInfo.sessionId,
        username: sessionInfo.username
      });
      
      console.log(`[AuthService] ${action}: ${success ? 'SUCCESS' : 'FAILED'} - ${details}`);
    } catch (error) {
      console.error('Failed to log auth attempt:', error);
    }
  }
}

// Export singleton instance
export const authService = new EnhancedAuthenticationService();
