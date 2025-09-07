import { Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Config } from '../utils/config';

export interface AuthToken {
  token: string;
  sessionId?: string;
  csrfToken?: string;
  expires?: number;
  routerIP: string;
  timestamp: number;
}

export interface AuthResult {
  success: boolean;
  token?: AuthToken;
  error?: string;
  message: string;
}

export class BrowserAuthService {
  private static readonly AUTH_STORAGE_KEY = 'router_auth_token';
  private static readonly AUTH_TIMEOUT = 5 * 60 * 1000; // 5 minutes timeout
  
  // Open router login page in browser
  static async openRouterLogin(routerIP: string): Promise<void> {
    const loginUrl = `http://${routerIP}`;
    
    try {
      console.log('🌐 Opening router login page:', loginUrl);
      
      // Check if URL can be opened
      const canOpen = await Linking.canOpenURL(loginUrl);
      if (!canOpen) {
        throw new Error('Cannot open router URL in browser');
      }
      
      // Open the router login page
      await Linking.openURL(loginUrl);
      
      console.log('✅ Router login page opened in browser');
    } catch (error: any) {
      console.error('❌ Failed to open router login page:', error.message);
      throw new Error(`Failed to open router login: ${error.message}`);
    }
  }

  // Extract authentication token from router response
  static extractAuthToken(html: string, cookies: string[] = []): AuthToken | null {
    try {
      console.log('🔍 Extracting authentication token from response...');
      
      let token = '';
      let sessionId = '';
      let csrfToken = '';
      
      // Common token patterns for different router types
      const tokenPatterns = [
        // Xfinity/Comcast patterns
        /token["\s]*[:=]["\s]*([a-zA-Z0-9+/=]+)/i,
        /sessionToken["\s]*[:=]["\s]*([a-zA-Z0-9+/=]+)/i,
        /authToken["\s]*[:=]["\s]*([a-zA-Z0-9+/=]+)/i,
        /X-Xsrf-Token["\s]*[:=]["\s]*([a-zA-Z0-9+/=]+)/i,
        
        // Generic patterns
        /csrf[_-]?token["\s]*[:=]["\s]*([a-zA-Z0-9+/=]+)/i,
        /session[_-]?id["\s]*[:=]["\s]*([a-zA-Z0-9+/=]+)/i,
        /auth[_-]?key["\s]*[:=]["\s]*([a-zA-Z0-9+/=]+)/i,
      ];
      
      // Try to find token in HTML content
      for (const pattern of tokenPatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          token = match[1];
          console.log('✅ Found token in HTML:', token.substring(0, 20) + '...');
          break;
        }
      }
      
      // Extract session ID from cookies
      for (const cookie of cookies) {
        const sessionMatch = cookie.match(/session[_-]?id=([^;]+)/i);
        if (sessionMatch) {
          sessionId = sessionMatch[1];
        }
        
        const csrfMatch = cookie.match(/csrf[_-]?token=([^;]+)/i);
        if (csrfMatch) {
          csrfToken = csrfMatch[1];
        }
      }
      
      // If no token found in HTML, try to extract from cookies
      if (!token) {
        for (const cookie of cookies) {
          const tokenMatch = cookie.match(/(?:token|auth|key)=([^;]+)/i);
          if (tokenMatch) {
            token = tokenMatch[1];
            console.log('✅ Found token in cookies:', token.substring(0, 20) + '...');
            break;
          }
        }
      }
      
      if (!token) {
        console.log('❌ No authentication token found');
        return null;
      }
      
      return {
        token,
        sessionId: sessionId || undefined,
        csrfToken: csrfToken || undefined,
        expires: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        routerIP: '',
        timestamp: Date.now()
      };
      
    } catch (error: any) {
      console.error('❌ Error extracting auth token:', error.message);
      return null;
    }
  }

  // Attempt to get authentication token by accessing router
  static async attemptTokenExtraction(routerIP: string, username: string, password: string): Promise<AuthResult> {
    try {
      console.log('🔐 Attempting to extract authentication token...');
      
      // First, try to access the login page
      const loginResponse = await axios.get(`http://${routerIP}`, {
        timeout: 10000,
        validateStatus: () => true,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; XfinityRouterApp/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });
      
      console.log('📄 Login page response status:', loginResponse.status);
      
      // Extract any initial tokens or session info
      const cookies = loginResponse.headers['set-cookie'] || [];
      let authToken = this.extractAuthToken(loginResponse.data, cookies);
      
      if (authToken) {
        authToken.routerIP = routerIP;
        console.log('✅ Successfully extracted authentication token');
        return {
          success: true,
          token: authToken,
          message: 'Authentication token extracted successfully'
        };
      }
      
      // If no token found, try to perform login
      console.log('🔑 No initial token found, attempting login...');
      
      // Common login endpoints
      const loginEndpoints = [
        '/login',
        '/api/login',
        '/cgi-bin/login',
        '/admin/login',
        '/auth/login'
      ];
      
      for (const endpoint of loginEndpoints) {
        try {
          const loginData = new URLSearchParams({
            username: username,
            password: password,
            login: 'Login'
          });
          
          const loginAttempt = await axios.post(`http://${routerIP}${endpoint}`, loginData, {
            timeout: 10000,
            validateStatus: () => true,
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'Mozilla/5.0 (compatible; XfinityRouterApp/1.0)',
              'Cookie': cookies.join('; ')
            }
          });
          
          if (loginAttempt.status === 200 || loginAttempt.status === 302) {
            const loginCookies = loginAttempt.headers['set-cookie'] || [];
            authToken = this.extractAuthToken(loginAttempt.data, [...cookies, ...loginCookies]);
            
            if (authToken) {
              authToken.routerIP = routerIP;
              console.log('✅ Successfully logged in and extracted token');
              return {
                success: true,
                token: authToken,
                message: 'Login successful, authentication token extracted'
              };
            }
          }
        } catch (error) {
          console.log(`❌ Login attempt failed for ${endpoint}`);
        }
      }
      
      return {
        success: false,
        error: 'NO_TOKEN_FOUND',
        message: 'Could not extract authentication token. Please try manual browser login.'
      };
      
    } catch (error: any) {
      console.error('❌ Token extraction failed:', error.message);
      return {
        success: false,
        error: error.code || 'EXTRACTION_FAILED',
        message: `Token extraction failed: ${error.message}`
      };
    }
  }

  // Save authentication token
  static async saveAuthToken(token: AuthToken): Promise<void> {
    try {
      await AsyncStorage.setItem(this.AUTH_STORAGE_KEY, JSON.stringify(token));
      console.log('💾 Authentication token saved');
    } catch (error: any) {
      console.error('❌ Failed to save auth token:', error.message);
      throw error;
    }
  }

  // Load saved authentication token
  static async loadAuthToken(): Promise<AuthToken | null> {
    try {
      const tokenData = await AsyncStorage.getItem(this.AUTH_STORAGE_KEY);
      if (!tokenData) {
        return null;
      }
      
      const token: AuthToken = JSON.parse(tokenData);
      
      // Check if token is expired
      if (token.expires && Date.now() > token.expires) {
        console.log('⏰ Authentication token expired');
        await this.clearAuthToken();
        return null;
      }
      
      console.log('✅ Loaded valid authentication token');
      return token;
    } catch (error: any) {
      console.error('❌ Failed to load auth token:', error.message);
      return null;
    }
  }

  // Clear saved authentication token
  static async clearAuthToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.AUTH_STORAGE_KEY);
      console.log('🗑️ Authentication token cleared');
    } catch (error: any) {
      console.error('❌ Failed to clear auth token:', error.message);
    }
  }

  // Check if we have a valid authentication token
  static async hasValidToken(routerIP?: string): Promise<boolean> {
    const token = await this.loadAuthToken();
    if (!token) {
      return false;
    }
    
    // If router IP specified, check if token is for the same router
    if (routerIP && token.routerIP !== routerIP) {
      console.log('⚠️ Token is for different router IP');
      return false;
    }
    
    return true;
  }

  // Get authentication headers for API calls
  static async getAuthHeaders(routerIP?: string): Promise<Record<string, string>> {
    const token = await this.loadAuthToken();
    if (!token) {
      return {};
    }
    
    // If router IP specified, check if token is for the same router
    if (routerIP && token.routerIP !== routerIP) {
      return {};
    }
    
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token.token}`,
      'X-Auth-Token': token.token,
    };
    
    if (token.sessionId) {
      headers['X-Session-ID'] = token.sessionId;
    }
    
    if (token.csrfToken) {
      headers['X-CSRF-Token'] = token.csrfToken;
      headers['X-Xsrf-Token'] = token.csrfToken;
    }
    
    return headers;
  }

  // Manual token input (for when user gets token from browser)
  static async setManualToken(tokenString: string, routerIP: string): Promise<AuthResult> {
    try {
      if (!tokenString || tokenString.trim().length === 0) {
        return {
          success: false,
          error: 'INVALID_TOKEN',
          message: 'Token cannot be empty'
        };
      }
      
      const token: AuthToken = {
        token: tokenString.trim(),
        expires: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        routerIP,
        timestamp: Date.now()
      };
      
      await this.saveAuthToken(token);
      
      return {
        success: true,
        token,
        message: 'Authentication token saved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'SAVE_FAILED',
        message: `Failed to save token: ${error.message}`
      };
    }
  }
}
