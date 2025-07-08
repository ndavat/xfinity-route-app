import { RouterService, RestartResult, RouterInfo } from './ServiceInterfaces';
import { Config } from '../utils/config';
import { axiosInstance } from '../utils/axiosConfig';
import { parse } from 'node-html-parser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GatewayDiscovery } from '../utils/GatewayDiscovery';
import { refreshNetworkState, getCurrentNetworkState, getWifiDetails } from './debug/NetworkMonitor';
import { info, error, warn, debug, logEvent } from './logging/Logger';

export class LiveRouterService implements RouterService {
  private baseUrl: string;
  private timeout: number;
  private retryAttempts: number;
  private username: string;

  constructor() {
    // Note: baseUrl will be set dynamically in initializeBaseUrl()
    this.baseUrl = `http://${Config.router.defaultIp}`; // fallback for synchronous access
    this.timeout = Config.api.timeout;
    this.retryAttempts = Config.api.maxRetryAttempts;
    this.username = Config.router.defaultUsername;
    
    info('LiveRouterService initialized', {
      baseUrl: this.baseUrl,
      timeout: this.timeout,
      retryAttempts: this.retryAttempts,
      username: this.username
    });
    
    if (Config.app.debugMode) {
      debug('[LiveRouterService] Initialized with config:', {
        baseUrl: this.baseUrl,
        timeout: this.timeout,
        retryAttempts: this.retryAttempts,
        username: this.username,
        password: Config.router.defaultPassword,
        deviceEndpoint: Config.router.deviceEndpoint,
        loginEndpoint: Config.router.loginEndpoint,
        connectionStatusEndpoint: Config.router.connectionStatusEndpoint
      });
    }
  }

  private createTimeoutSignal(): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), this.timeout);
    return controller.signal;
  }

  /**
   * Initialize base URL with dynamic gateway discovery
   */
  private async initializeBaseUrl(): Promise<void> {
    try {
      const routerIp = await GatewayDiscovery.getRouterIp();
      this.baseUrl = `http://${routerIp}`;
      
      if (Config.app.debugMode) {
        console.log('[LiveRouterService] Gateway discovery completed:', {
          detectedIp: routerIp,
          baseUrl: this.baseUrl
        });
      }
    } catch (error) {
      console.error('[LiveRouterService] Gateway discovery failed, using fallback:', error);
      this.baseUrl = `http://${Config.router.defaultIp}`;
    }
  }

  /**
   * Check network connectivity and refresh network state
   * Returns false if network is not connected
   */
  private async checkNetworkConnectivity(): Promise<boolean> {
    try {
      // Refresh network state
      await refreshNetworkState();
      
      // Get current network state
      const networkState = getCurrentNetworkState();
      const wifiDetails = getWifiDetails();
      
      if (!networkState?.isConnected) {
        console.log('[LiveRouterService] Network not connected - aborting request');
        return false;
      }
      
      // Log detailed network information
      console.log('[LiveRouterService] Network connectivity check:', {
        isConnected: networkState.isConnected,
        networkType: networkState.type,
        ssid: wifiDetails?.ssid || 'N/A',
        gateway: this.baseUrl,
        ipAddress: wifiDetails?.ipAddress || 'N/A',
        signalStrength: wifiDetails?.strength || 'N/A',
        timestamp: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      console.error('[LiveRouterService] Network connectivity check failed:', error);
      return false;
    }
  }

  async restartRouter(): Promise<RestartResult> {
    // Check network connectivity before proceeding
    const isConnected = await this.checkNetworkConnectivity();
    if (!isConnected) {
      return {
        success: false,
        message: 'Network not connected - unable to restart router'
      };
    }

    // Initialize dynamic gateway discovery
    await this.initializeBaseUrl();
    
    if (Config.app.debugMode) {
      console.log('[LiveRouterService] Initiating router restart:', {
        endpoint: `${this.baseUrl}/api/router/restart`,
        username: this.username,
        timeout: this.timeout,
        maxAttempts: this.retryAttempts
      });
    }
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/api/router/restart`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${btoa(`${this.username}:${Config.router.defaultPassword}`)}`
          },
          signal: this.createTimeoutSignal()
        });
        
        if (response.ok) {
          if (Config.app.debugMode) {
            console.log('[LiveRouterService] Router restart successful:', {
              attempt,
              status: response.status,
              headers: Object.fromEntries(response.headers.entries())
            });
          }
          return {
            success: true,
            message: 'Router restart initiated successfully',
            estimatedDowntime: 120 // seconds
          };
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error: any) {
        if (Config.app.debugMode) {
          console.log('[LiveRouterService] Router restart attempt failed:', {
            attempt,
            error: error.message,
            stack: error.stack,
            remainingAttempts: this.retryAttempts - attempt
          });
        }
        
        if (attempt === this.retryAttempts) {
          return {
            success: false,
            message: `Restart failed after ${this.retryAttempts} attempts: ${error.message}`
          };
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, Config.api.retryDelay * attempt));
      }
    }

    return {
      success: false,
      message: 'Unexpected error occurred'
    };
  }

  isRestartSupported(): boolean {
    return Config.router.defaultIp !== null && Config.router.defaultIp !== '';
  }

  async checkConnection(): Promise<boolean> {
    debug('Checking router connection', { baseUrl: this.baseUrl });
    
    // Check network connectivity before proceeding
    const isConnected = await this.checkNetworkConnectivity();
    if (!isConnected) {
      warn('Network connectivity check failed');
      return false;
    }

    // Initialize dynamic gateway discovery
    await this.initializeBaseUrl();
    
    try {
      // First try the login endpoint
      const loginResponse = await fetch(`${this.baseUrl}${Config.router.loginEndpoint}`, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Cache-Control': 'no-cache',
          'Authorization': `Basic ${btoa(`${this.username}:${Config.router.defaultPassword}`)}`,
        },
        signal: this.createTimeoutSignal()
      });
      
      info('Router connection attempt', {
        url: `${this.baseUrl}${Config.router.loginEndpoint}`,
        status: loginResponse.status,
        ok: loginResponse.ok
      });
      
      if (Config.app.debugMode) {
        debug('[LiveRouterService] Login check:', {
          endpoint: `${this.baseUrl}${Config.router.loginEndpoint}`,
          status: loginResponse.status,
          ok: loginResponse.ok,
          statusText: loginResponse.statusText,
          headers: Object.fromEntries(loginResponse.headers.entries())
        });
      }
  
      if (!loginResponse.ok) {
        return false;
      }
  
      // If login successful, check connection status
      const statusResponse = await fetch(`${this.baseUrl}${Config.router.connectionStatusEndpoint}`, {
        headers: {
          'Authorization': `Basic ${btoa(`${this.username}:${Config.router.defaultPassword}`)}`,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: this.createTimeoutSignal()
      });
  
      if (Config.app.debugMode) {
        console.log('[LiveRouterService] Connection status check:', {
          endpoint: `${this.baseUrl}${Config.router.connectionStatusEndpoint}`,
          status: statusResponse.status,
          ok: statusResponse.ok,
          statusText: statusResponse.statusText,
          headers: Object.fromEntries(statusResponse.headers.entries())
        });
      }
      
      return statusResponse.ok;
    } catch (error: any) {
      if (Config.app.debugMode) {
        const isTimeout = error.name === 'AbortError';
        console.log('Router connection failed:', {
          error: error.message,
          type: error.name,
          isTimeout,
          timeout: this.timeout,
          endpoint: `${this.baseUrl}${Config.router.loginEndpoint}`
        });
      }
      return false;
    }
  }
// Authenticate with the router
   async authenticate(force: boolean = false): Promise<boolean> {
    try {
      // Check network connectivity before proceeding
      const isConnected = await this.checkNetworkConnectivity();
      if (!isConnected) {
        return false;
      }

      // Initialize dynamic gateway discovery
      await this.initializeBaseUrl();
      
      // If we have a session and aren't forcing re-auth, verify the session first
      if (!force && await this.verifySession()) {
        return true;
      }

      const config = await this.getRouterConfig();
      const baseUrl = this.baseUrl; // Use dynamically discovered gateway

      console.log('Authenticating with router...');
      
      const response = await axiosInstance.post(
        `${baseUrl}/check.php`,
        `username=${config.username}&password=${config.password}`,
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          withCredentials: true,
        }
      );

      // Check if authentication was successful
      const isAuthenticated = 
        response.data.includes('success') || 
        response.data.includes('Authentication successful') ||
        response.status === 200;

      if (!isAuthenticated) {
        console.error('Authentication failed:', response.data);
        throw new Error('Authentication failed');
      }

      console.log('Authentication successful');
      return true;
    } catch (error) {
      console.error('Authentication error:', error);
      return false;
    }
  }
  async getRouterConfig() {
    try {
      const storedConfig = await AsyncStorage.getItem(Config.storage.routerConfigKey);
      // Use stored config if it exists, otherwise use default
      const config = storedConfig ? JSON.parse(storedConfig) : {
        ip: '10.0.0.1',
        username: Config.router.defaultUsername,
        password: Config.router.defaultPassword,
      };
      
      // Always ensure mock mode is disabled
      config.useMockData = false;
      return config;
    } catch (error) {
      console.error('Error getting router config:', error);
      // Fallback to default configuration
      return {
        ip: '10.0.0.1',
        username: Config.router.defaultUsername,
        password: Config.router.defaultPassword,
        useMockData: false
      };
    }
  }
   async verifySession(): Promise<boolean> {
    try {
      // Check network connectivity before proceeding
      const isConnected = await this.checkNetworkConnectivity();
      if (!isConnected) {
        return false;
      }

      // Initialize dynamic gateway discovery
      await this.initializeBaseUrl();
      
      const config = await this.getRouterConfig();
      const baseUrl = this.baseUrl; // Use dynamically discovered gateway

      // Try to access a protected endpoint
      const response = await axiosInstance.get(`${baseUrl}${Config.router.deviceEndpoint}`, {
        withCredentials: true,
      });

      // If we don't get a login redirect, session is valid
      return !response.data.includes('Please Login First!');
    } catch (error) {
      console.error('Session verification error:', error);
      return false;
    }
  }
  async getRouterInfo(): Promise<RouterInfo> {
    try {
      // Check network connectivity before proceeding
      const isConnected = await this.checkNetworkConnectivity();
      if (!isConnected) {
        throw new Error('Network not connected');
      }

      // Initialize dynamic gateway discovery
      await this.initializeBaseUrl();
      
      // First ensure we're authenticated
      const isAuthenticated = await this.authenticate();
      if (!isAuthenticated) {
        throw new Error('Authentication failed');
      }
      
      const config = await this.getRouterConfig();
      const baseUrl = this.baseUrl; // Use dynamically discovered gateway
      
      // Request router status page
      const response = await axiosInstance.get(`${baseUrl}/status`, {
        withCredentials: true,
      });
      
      // This is a placeholder for parsing router-specific HTML/JSON
      // Actual implementation depends on your specific router's web interface
      // Use parse() for HTML content parsing
      // Navigate to network_setup.php to get Internet status and System Uptime
      const networkSetupResponse = await axiosInstance.get(`${baseUrl}/network_setup.php`, {
        withCredentials: true,
      });
      
      // Parse the HTML response
      const networkSetupRoot = parse(networkSetupResponse.data);
      
      // Extract Internet status
      let internetStatus = 'Unknown';
      const internetStatusElement = networkSetupRoot.querySelector('div.form-row span.readonlyLabel:contains("Internet:")');
      if (internetStatusElement) {
        const valueElement = internetStatusElement.parentNode.querySelector('span.value');
        if (valueElement) {
          internetStatus = valueElement.text.trim();
        }
      }
      
      // Extract System Uptime
      let systemUptime = 'Unknown';
      const uptimeElement = networkSetupRoot.querySelector('div.form-row span.readonlyLabel:contains("System Uptime:")');
      if (uptimeElement) {
        const valueElement = uptimeElement.parentNode.querySelector('span.value');
        if (valueElement) {
          systemUptime = valueElement.text.trim();
        }
      }
      
      // Get connected devices count
      let connectedDevices = 0;
      try {
        const connectionStatusResponse = await fetch(`${this.baseUrl}/connection_status.php`, {
          headers: {
            'Authorization': `Basic ${btoa(`${this.username}:${Config.router.defaultPassword}`)}`,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          signal: this.createTimeoutSignal()
        });
        console.log('Connection status response:', connectionStatusResponse);
        if (connectionStatusResponse.ok) {
          const connectionStatusText = await connectionStatusResponse.text();
          const connectionStatusRoot = parse(connectionStatusText);
          
          // Find the element containing "No of Clients connected:" label
          const clientsElement = connectionStatusRoot.querySelector('div.form-row span.readonlyLabel:contains("No of Clients connected:")');
          if (clientsElement) {
            const valueElement = clientsElement.parentNode.querySelector('span.value');
            if (valueElement) {
              const clientsText = valueElement.text.trim();
              connectedDevices = parseInt(clientsText, 10) || 0;
              if (Config.app.debugMode) {
                console.log(`Found ${connectedDevices} connected clients`);
              }
            }
          } else if (Config.app.debugMode) {
            console.log('Could not find "No of Clients connected:" element');
          }
        }
      } catch (connectionError: any) {
        if (Config.app.debugMode) {
          console.error('Error fetching connection status:', connectionError);
        }
      }
      
      // Use default values for model and firmware since they're router-specific
      const model = Config.router.model || 'Xfinity Gateway';
      const firmware = Config.router.firmwareVersion || '2.0.1.7';
      const wifiSSID = Config.router.defaultSSID || 'HOME-WIFI';
  
      return {
        status: internetStatus,
        uptime: systemUptime,
        connectedDevices,
        model,
        firmware,
        wifiSSID
      };
    } catch (error: any) {
      if (Config.app.debugMode) {
        console.error('Failed to get router info:', error.message);
      }
      
      return {
        status: 'Unknown',
        uptime: 'Unknown',
        connectedDevices: 0,
        model: Config.router.model || 'Unknown',
        firmware: Config.router.firmwareVersion || 'Unknown',
        wifiSSID: Config.router.defaultSSID || 'Unknown'
      };
    }
  }
}
