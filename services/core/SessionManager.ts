import { AxiosInstance, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addLog } from '../debug/LogStore';
import { isNode } from '../../utils/platform';

export interface SessionInfo {
  sessionId: string;
  username: string;
  createdAt: Date;
  expiresAt: Date;
  isValid: boolean;
  cookies?: CookieStore;
}

export interface CookieStore {
  [domain: string]: { [name: string]: string };
}

export class SessionManager {
  private sessionId: string | null = null;
  private username: string | null = null;
  private memoryCookies: CookieStore = {}; // React Native in-memory cookies
  private axiosInstance: AxiosInstance;
  private sessionRefreshTimer: NodeJS.Timeout | null = null;

  // Storage keys
  private static readonly SESSION_KEY = 'enhanced_router_session';
  private static readonly COOKIES_KEY = 'enhanced_router_cookies';

  constructor(axiosInstance: AxiosInstance) {
    this.axiosInstance = axiosInstance;
    this.initializeMemoryCookies();
    this.initializeSession();
  }

  /**
   * Initialize platform-specific cookie handling
   */
  private initializeForPlatform() {
    // React Native: Use manual cookie management
    this.initializeMemoryCookies();
    console.log('SessionManager: Initialized with React Native memory cookies');
    this.logAuthAttempt('memory_cookies_init', true, 'React Native memory cookies initialized');
  }

  /**
   * Initialize memory-based cookie management for React Native
   */
  private async initializeMemoryCookies() {
    try {
      const storedCookies = await AsyncStorage.getItem(SessionManager.COOKIES_KEY);
      if (storedCookies) {
        this.memoryCookies = JSON.parse(storedCookies);
        this.applyCookiesToAxios();
      }
    } catch (error) {
      console.error('Failed to load stored cookies:', error);
      this.logAuthAttempt('cookie_load', false, `Cookie load failed: ${error}`);
    }
  }

  /**
   * Apply memory cookies to axios instance
   */
  private applyCookiesToAxios() {
    if (isNode()) return; // Node.js uses cookie jar automatically

    // Build cookie header from memory cookies
    const cookieHeaders: string[] = [];
    
    Object.entries(this.memoryCookies).forEach(([domain, cookies]) => {
      Object.entries(cookies).forEach(([name, value]) => {
        cookieHeaders.push(`${name}=${value}`);
      });
    });

    if (cookieHeaders.length > 0) {
      this.axiosInstance.defaults.headers.common['Cookie'] = cookieHeaders.join('; ');
    }
  }

  /**
   * Store cookies from response
   */
  private async storeCookiesFromResponse(response: AxiosResponse, domain: string = 'default') {
    const setCookieHeader = response.headers['set-cookie'];
    if (!setCookieHeader) return;

    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
    
    // React Native: Handle cookies manually

    // React Native: Parse and store cookies manually
    if (!this.memoryCookies[domain]) {
      this.memoryCookies[domain] = {};
    }

    cookies.forEach(cookieStr => {
      const [nameValue] = cookieStr.split(';');
      const [name, value] = nameValue.split('=');
      
      if (name && value) {
        this.memoryCookies[domain][name.trim()] = value.trim();
        
        // Special handling for session cookies
        if (name.trim().toUpperCase() === 'SESSIONID') {
          this.sessionId = value.trim();
        }
      }
    });

    // Save to AsyncStorage and apply to axios
    await AsyncStorage.setItem(SessionManager.COOKIES_KEY, JSON.stringify(this.memoryCookies));
    this.applyCookiesToAxios();
  }

  /**
   * Initialize session from storage
   */
  private async initializeSession() {
    try {
      const storedSession = await AsyncStorage.getItem(SessionManager.SESSION_KEY);
      if (storedSession) {
        const sessionInfo: SessionInfo = JSON.parse(storedSession);
        sessionInfo.createdAt = new Date(sessionInfo.createdAt);
        sessionInfo.expiresAt = new Date(sessionInfo.expiresAt);

        if (sessionInfo.expiresAt > new Date()) {
          this.sessionId = sessionInfo.sessionId;
          this.username = sessionInfo.username;
          
          // Restore cookies if available
          if (sessionInfo.cookies && !isNode()) {
            Object.assign(this.memoryCookies, sessionInfo.cookies);
            this.applyCookiesToAxios();
          }

          this.setupSessionRefresh(sessionInfo.expiresAt);
          console.log('SessionManager: Session restored from storage');
          this.logAuthAttempt('session_restore', true, 'Session restored from storage');
        } else {
          await this.clearSession();
          console.log('SessionManager: Stored session expired, cleared');
          this.logAuthAttempt('session_restore', false, 'Stored session expired');
        }
      }
    } catch (error) {
      console.error('SessionManager: Error initializing session:', error);
      this.logAuthAttempt('session_init', false, `Session init failed: ${error}`);
    }
  }

  /**
   * Store session information
   */
  async storeSession(sessionId: string, username: string, expiresAt: Date) {
    try {
      this.sessionId = sessionId;
      this.username = username;

      const sessionInfo: SessionInfo = {
        sessionId,
        username,
        createdAt: new Date(),
        expiresAt,
        isValid: true,
        cookies: isNode() ? undefined : this.memoryCookies
      };

      await AsyncStorage.setItem(SessionManager.SESSION_KEY, JSON.stringify(sessionInfo));
      this.setupSessionRefresh(expiresAt);
      
      console.log('SessionManager: Session stored successfully');
      this.logAuthAttempt('session_store', true, 'Session stored successfully');
    } catch (error) {
      console.error('SessionManager: Error storing session:', error);
      this.logAuthAttempt('session_store', false, `Session store failed: ${error}`);
    }
  }

  /**
   * Clear session and cookies
   */
  async clearSession() {
    try {
      this.sessionId = null;
      this.username = null;
      this.memoryCookies = {};

      if (this.sessionRefreshTimer) {
        clearTimeout(this.sessionRefreshTimer);
        this.sessionRefreshTimer = null;
      }

      // Clear stored data
      await AsyncStorage.multiRemove([SessionManager.SESSION_KEY, SessionManager.COOKIES_KEY]);
      
      // Clear axios headers
      delete this.axiosInstance.defaults.headers.common['Cookie'];

      console.log('SessionManager: Session cleared successfully');
      this.logAuthAttempt('session_clear', true, 'Session cleared successfully');
    } catch (error) {
      console.error('SessionManager: Error clearing session:', error);
      this.logAuthAttempt('session_clear', false, `Session clear failed: ${error}`);
    }
  }

  /**
   * Verify session validity
   */
  async verifySession(): Promise<boolean> {
    try {
      if (!this.sessionId) {
        this.logAuthAttempt('session_verify', false, 'No session ID available');
        return false;
      }

      // Make a test request to verify session
      const response = await this.axiosInstance.get('/gateway_settings.asp', {
        validateStatus: (status) => true,
      });

      // Store any new cookies from the response
      await this.storeCookiesFromResponse(response);

      const isValid = response.status === 200 && !response.data.includes('login.cgi');
      
      if (!isValid) {
        await this.clearSession();
        this.logAuthAttempt('session_verify', false, `Session invalid - Status: ${response.status}`);
      } else {
        this.logAuthAttempt('session_verify', true, 'Session verified successfully');
      }

      return isValid;
    } catch (error) {
      console.error('SessionManager: Session verification failed:', error);
      this.logAuthAttempt('session_verify', false, `Session verify error: ${error}`);
      return false;
    }
  }

  /**
   * Refresh session
   */
  async refreshSession(): Promise<boolean> {
    try {
      if (!this.sessionId) {
        this.logAuthAttempt('session_refresh', false, 'No session to refresh');
        return false;
      }

      console.log('SessionManager: Refreshing session...');
      
      const response = await this.axiosInstance.get('/wlanRadio.asp', {
        validateStatus: (status) => true,
      });

      // Store any new cookies from the response
      await this.storeCookiesFromResponse(response);

      if (response.status === 401 || response.data.includes('login.cgi')) {
        await this.clearSession();
        this.logAuthAttempt('session_refresh', false, 'Session expired during refresh');
        return false;
      }

      // Update expiry time
      const newExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      if (this.username) {
        await this.storeSession(this.sessionId, this.username, newExpiresAt);
      }

      console.log('SessionManager: Session refreshed successfully');
      this.logAuthAttempt('session_refresh', true, 'Session refreshed successfully');
      return true;
    } catch (error) {
      console.error('SessionManager: Session refresh failed:', error);
      this.logAuthAttempt('session_refresh', false, `Session refresh error: ${error}`);
      return false;
    }
  }

  /**
   * Handle cookies from login response
   */
  async handleLoginResponse(response: AxiosResponse, domain: string = 'default'): Promise<string | null> {
    await this.storeCookiesFromResponse(response, domain);
    return this.sessionId;
  }

  /**
   * Setup automatic session refresh
   */
  private setupSessionRefresh(expiresAt: Date) {
    if (this.sessionRefreshTimer) {
      clearTimeout(this.sessionRefreshTimer);
    }

    const refreshTime = expiresAt.getTime() - Date.now() - 5 * 60 * 1000; // 5 minutes before expiry
    
    if (refreshTime > 0) {
      this.sessionRefreshTimer = setTimeout(() => {
        this.refreshSession();
      }, refreshTime);
    }
  }

  /**
   * Get current session info
   */
  getSessionInfo(): { sessionId: string | null; username: string | null; isValid: boolean } {
    return {
      sessionId: this.sessionId,
      username: this.username,
      isValid: !!this.sessionId
    };
  }

  /**
   * Get cookies for a specific domain
   */
  getCookiesForDomain(domain: string = 'default'): { [name: string]: string } {
    // Return cookies from memory store
    return this.memoryCookies[domain] || {};
  }

  /**
   * Log authentication attempts with detailed information
   */
  private async logAuthAttempt(action: string, success: boolean, details: string) {
    try {
      await addLog({
        type: 'auth',
        action,
        success,
        details,
        sessionId: this.sessionId,
        username: this.username,
        platform: isNode() ? 'Node.js' : 'React Native',
        cookieCount: Object.keys(this.memoryCookies).length
      });
      
      console.log(`[SessionManager Auth] ${action}: ${success ? 'SUCCESS' : 'FAILED'} - ${details}`);
    } catch (error) {
      console.error('Failed to log auth attempt:', error);
    }
  }
}
