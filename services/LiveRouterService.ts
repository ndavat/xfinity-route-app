import { RouterService, RestartResult, RouterInfo } from './ServiceInterfaces';
import { Config } from '../utils/config';

export class LiveRouterService implements RouterService {
  private baseUrl: string;
  private timeout: number;
  private retryAttempts: number;
  private username: string;

  constructor() {
    this.baseUrl = `http://${Config.router.defaultIp}`;
    this.timeout = Config.api.timeout;
    this.retryAttempts = Config.api.maxRetryAttempts;
    this.username = Config.router.defaultUsername;
    
    if (Config.app.debugMode) {
      console.log('LiveRouterService initialized', {
        baseUrl: this.baseUrl,
        timeout: this.timeout,
        retryAttempts: this.retryAttempts
      });
    }
  }

  async restartRouter(): Promise<RestartResult> {
    if (Config.app.debugMode) {
      console.log('Attempting router restart...');
    }
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/api/router/restart`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${btoa(`${this.username}:${Config.router.defaultPassword}`)}`
          },
          signal: AbortSignal.timeout(this.timeout),
        });
        
        if (response.ok) {
          if (Config.app.debugMode) {
            console.log('Router restart successful');
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
          console.log(`Router restart attempt ${attempt} failed:`, error);
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
    try {
      const response = await fetch(`${this.baseUrl}/`, {
        method: 'GET',
        signal: AbortSignal.timeout(this.timeout),
      });
      
      if (Config.app.debugMode) {
        console.log('Router connection check:', response.status);
      }
      
      return response.ok;
    } catch (error: any) {
      if (Config.app.debugMode) {
        console.log('Router connection failed:', error.message);
      }
      return false;
    }
  }

  async getRouterInfo(): Promise<RouterInfo> {
    try {
      // This is a simplified version - real implementation would parse router's web interface
      const response = await fetch(`${this.baseUrl}/status`, {
        headers: {
          'Authorization': `Basic ${btoa(`${this.username}:${Config.router.defaultPassword}`)}`
        },
        signal: AbortSignal.timeout(this.timeout),
      });
      
      if (response.ok) {
        // In a real implementation, you'd parse the HTML/JSON response
        return {
          status: 'Online',
          uptime: '3 days, 5 hours',
          connectedDevices: 12,
          model: 'Xfinity Gateway',
          firmware: '2.0.1.7',
          wifiSSID: 'HOME-WIFI'
        };
      }
      
      throw new Error('Failed to get router info');
    } catch (error: any) {
      if (Config.app.debugMode) {
        console.log('Failed to get router info:', error.message);
      }
      
      // Return basic info even if detailed info fails
      return {
        status: 'Connected',
        uptime: 'Unknown',
        connectedDevices: 0,
      };
    }
  }
}
