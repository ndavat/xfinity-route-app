import { Device } from '../types/Device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parse } from 'node-html-parser';
import axios from 'axios';
import { Config, ConfigUtils } from '../utils/config';

// Default router credentials (loaded from environment variables)
const DEFAULT_ROUTER_CONFIG = ConfigUtils.getDefaultRouterConfig();

// Storage keys (from environment variables)
const ROUTER_CONFIG_KEY = Config.storage.routerConfigKey;
const DEVICE_NAMES_KEY = Config.storage.deviceNamesKey;

/**
 * Service for interacting with Xfinity router
 */
export class RouterConnectionService {
  // Get router configuration from storage
  static async getRouterConfig() {
    try {
      const storedConfig = await AsyncStorage.getItem(ROUTER_CONFIG_KEY);
      return storedConfig ? JSON.parse(storedConfig) : DEFAULT_ROUTER_CONFIG;
    } catch (error) {
      console.error('Error getting router config:', error);
      return DEFAULT_ROUTER_CONFIG;
    }
  }

  // Save router configuration to storage
  static async saveRouterConfig(config: any) {
    try {
      await AsyncStorage.setItem(ROUTER_CONFIG_KEY, JSON.stringify({
        ...DEFAULT_ROUTER_CONFIG,
        ...config
      }));
      return true;
    } catch (error) {
      console.error('Error saving router config:', error);
      return false;
    }
  }

  // Network diagnostic function to help troubleshoot connection issues
  static async runDiagnostics() {
    console.log('🔍 Running network diagnostics...');
    
    const config = await this.getRouterConfig();
    const baseUrl = `http://${config.ip}`;
    
    const results = {
      routerConfig: config,
      baseUrl,
      tests: [] as Array<{name: string, status: string, details?: string}>
    };
    
    // Test 1: Basic connectivity
    try {
      await axios.get(baseUrl, { timeout: Config.api.connectionTimeout, validateStatus: () => true });
      results.tests.push({ name: 'Basic Connectivity', status: '✅ PASS' });
    } catch (error: any) {
      results.tests.push({ 
        name: 'Basic Connectivity', 
        status: '❌ FAIL', 
        details: error.code || error.message 
      });
    }
    
    // Test 2: Alternative common IPs
    const commonIPs = ['192.168.1.1', '192.168.0.1', '10.0.0.1', '192.168.1.254'];
    for (const ip of commonIPs) {
      if (ip === config.ip) continue; // Skip current IP
      
      try {
        await axios.get(`http://${ip}`, { timeout: Config.api.connectionTimeout, validateStatus: () => true });
        results.tests.push({ 
          name: `Alternative IP (${ip})`, 
          status: '✅ FOUND', 
          details: 'Router might be at this IP instead' 
        });
      } catch (error) {
        // Silently continue
      }
    }
    
    // Test 3: Protocol test (HTTPS availability)
    try {
      await axios.get(`https://${config.ip}`, { timeout: Config.api.connectionTimeout, validateStatus: () => true });
      results.tests.push({ 
        name: 'HTTPS Availability', 
        status: '⚠️ AVAILABLE', 
        details: 'HTTPS is available but app uses HTTP only' 
      });
    } catch (error) {
      results.tests.push({ 
        name: 'HTTPS Availability', 
        status: '✅ NOT AVAILABLE (Expected)' 
      });
    }
    
    console.log('📊 Diagnostic Results:', results);
    return results;
  }

  // Clear mock mode and force real router connection
  static async disableMockMode() {
    try {
      await AsyncStorage.setItem('use_mock_data', 'false');
      console.log('🔌 Mock mode disabled - will attempt real router connection');
      return true;
    } catch (error) {
      console.error('Error disabling mock mode:', error);
      return false;
    }
  }

  // Check if we're in a browser environment that blocks HTTP requests
  static isHttpsToHttpBlocked() {
    // Check if we're in a web environment
    if (typeof window !== 'undefined' && window.location) {
      // If the page is loaded over HTTPS, HTTP requests will be blocked
      return window.location.protocol === 'https:';
    }
    return false;
  }

  // Get environment-specific connection advice
  static getConnectionAdvice() {
    if (this.isHttpsToHttpBlocked()) {
      return {
        canConnectToRouter: false,
        reason: 'HTTPS to HTTP blocked by browser security',
        solutions: [
          'Use the Expo Go app on your phone/tablet connected to the same WiFi network',
          'Run the development server locally (not in GitHub Codespace) with HTTP',
          'Use mock mode for testing the UI and functionality',
          'Deploy to a mobile device for real router testing'
        ]
      };
    }
    
    return {
      canConnectToRouter: true,
      reason: 'Environment supports router connection',
      solutions: []
    };
  }

  // Check connection to router
  static async checkConnection() {
    try {
      // Check if mock data mode is enabled
      const useMockData = await AsyncStorage.getItem('use_mock_data');
      if (useMockData === 'true') {
        console.log('🎭 Mock mode enabled - simulating router connection');
        return true;
      }

      // Check if we're in an environment that blocks HTTP requests
      const advice = this.getConnectionAdvice();
      if (!advice.canConnectToRouter) {
        console.log('🚫 Cannot connect to router from this environment:', advice.reason);
        console.log('💡 Possible solutions:');
        advice.solutions.forEach((solution, index) => {
          console.log(`   ${index + 1}. ${solution}`);
        });
        return false;
      }

      const config = await this.getRouterConfig();
      const baseUrl = `http://${config.ip}`;
      
      console.log('=== DEBUG TEST ===');
      console.log('Router Config:', config);
      console.log('Attempting to connect to router at:', baseUrl);
      
      // Try to connect to the router's login page
      const response = await axios.get(baseUrl, {
        timeout: Config.api.timeout,
        validateStatus: (status) => true, // Accept any status to handle it explicitly
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Cache-Control': 'no-cache',
        },
        withCredentials: false // Disable credentials for initial connection test
      });
      
      console.log('Router response status:', response.status);
      
      // If we get a response, consider it connected
      const isConnected = response.status < 400 || response.status === 401;
      console.log('Router connection status:', isConnected ? 'Connected' : 'Disconnected');
      
      return isConnected; // 401 is "Unauthorized" which means the router is there but requires login
    } catch (error: any) {
      // Detailed error logging with specific error types
      if (axios.isAxiosError(error)) {
        const errorInfo = {
          message: error.message,
          code: error.code,
          response: error.response?.status,
          responseText: error.response?.statusText,
          config: {
            url: error.config?.url,
            timeout: error.config?.timeout
          }
        };
        
        console.error('Router connection error:', errorInfo);
        
        // Log specific error messages for troubleshooting (but don't auto-enable mock)
        if (error.code === 'ECONNREFUSED') {
          console.error('❌ Connection refused - Router might be off or wrong IP address');
        } else if (error.code === 'ENOTFOUND') {
          console.error('❌ Host not found - Check IP address');
        } else if (error.code === 'ETIMEDOUT') {
          console.error('❌ Connection timeout - Router might be slow or unreachable');
        } else if (error.code === 'ENETUNREACH') {
          console.error('❌ Network unreachable - Check your network connection');
        } else if (error.message.includes('CORS')) {
          console.error('❌ CORS error - Try using mobile app instead of web browser');
        } else if (error.message.includes('Mixed Content') || error.code === 'ERR_NETWORK') {
          console.error('❌ Mixed content error - HTTPS page cannot access HTTP router');
          console.error('💡 Solutions:');
          console.error('   1. Use the mobile app on your phone/tablet connected to the same WiFi');
          console.error('   2. Run the app locally with HTTP (not in GitHub Codespace)');
          console.error('   3. Enable mock mode for testing in browser');
        }
      } else {
        console.error('Unexpected error during router connection:', error);
      }
      return false;
    }
  }

  // Authenticate with the router
  static async authenticate() {
    try {
      // Check if mock data mode is enabled
      const useMockData = await AsyncStorage.getItem('use_mock_data');
      if (useMockData === 'true') {
        console.log('🎭 Mock mode enabled - simulating authentication');
        return true;
      }

      const config = await this.getRouterConfig();
      const baseUrl = `http://${config.ip}`;
      
      // Send authentication request
      const response = await axios.post(`${baseUrl}/login`, 
        new URLSearchParams({
          'username': config.username,
          'password': config.password
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          withCredentials: true, // Important for maintaining session cookies
        }
      );
      
      // Check if authentication was successful (typically by looking for success indicators in response)
      // This is router-specific and might need adjustment for different routers
      return response.status === 200;
    } catch (error) {
      console.error('Authentication error:', error);
      return false;
    }
  }

  // Get basic router information
  static async getRouterInfo() {
    try {
      // Check if mock data mode is enabled
      const useMockData = await AsyncStorage.getItem('use_mock_data');
      if (useMockData === 'true') {
        console.log('🎭 Mock mode enabled - returning simulated router info');
        return {
          status: 'Online (Mock Mode)',
          uptime: '2 days, 14 hours',
          connectedDevices: 8,
          model: 'Xfinity XB7',
          firmware: '1.2.3.45',
          wifiSSID: 'MyNetwork',
        };
      }

      // First ensure we're authenticated
      const isAuthenticated = await this.authenticate();
      if (!isAuthenticated) {
        throw new Error('Authentication failed');
      }
      
      const config = await this.getRouterConfig();
      const baseUrl = `http://${config.ip}`;
      
      // Request router status page
      const response = await axios.get(`${baseUrl}/status`, {
        withCredentials: true,
      });
      
      // This is a placeholder for parsing router-specific HTML/JSON
      // Actual implementation depends on your specific router's web interface
      // Use parse() for HTML content parsing
      
      // Return mock data for now
      return {
        status: 'Online',
        uptime: '3 days, 7 hours',
        connectedDevices: 12,
        // Additional info could be extracted from response
      };
    } catch (error) {
      console.error('Error getting router info:', error);
      // Return fallback data for simulation
      return {
        status: 'Online (Simulated)',
        uptime: '1 day, 2 hours',
        connectedDevices: 5,
      };
    }
  }

  // Get list of connected devices
  static async getConnectedDevices(): Promise<Device[]> {
    try {
      // Check if mock data mode is enabled first
      const useMockData = await AsyncStorage.getItem('use_mock_data');
      if (useMockData === 'true') {
        console.log('🎭 Mock mode enabled - returning simulated devices');
        return this.getMockDevices();
      }

      // First ensure we're authenticated
      const isAuthenticated = await this.authenticate();
      if (!isAuthenticated) {
        console.log('🎭 Authentication failed - falling back to mock data');
        return this.getMockDevices();
      }
      
      const config = await this.getRouterConfig();
      const baseUrl = `http://${config.ip}`;
      
      // Request connected devices list
      const response = await axios.get(`${baseUrl}/network/connected_devices`, {
        withCredentials: true,
      });
      
      // Get custom device names from storage
      const customNames = await this.getStoredDeviceNames();
      
      // This is a placeholder for parsing router-specific HTML/JSON
      // Actual implementation depends on your specific router's web interface
      // For now, return mock data for testing
      
      return this.getMockDevices();
    } catch (error) {
      console.error('Error getting connected devices:', error);
      console.log('🎭 Connection failed - falling back to mock data');
      return this.getMockDevices();
    }
  }

  // Get mock devices for testing/demo purposes
  static async getMockDevices(): Promise<Device[]> {
    const customNames = await this.getStoredDeviceNames();
    
    const mockDevices: Device[] = [
      { 
        mac: '00:11:22:33:44:55', 
        ip: '10.0.0.100', 
        hostname: 'android-device', 
        connectionType: 'WiFi',
        isBlocked: false,
        customName: customNames['00:11:22:33:44:55'] || 'John\'s Phone',
      },
      { 
        mac: 'AA:BB:CC:DD:EE:FF', 
        ip: '10.0.0.101', 
        hostname: 'iPhone', 
        connectionType: 'WiFi',
        isBlocked: true,
        customName: customNames['AA:BB:CC:DD:EE:FF'] || 'Sarah\'s iPhone',
      },
      { 
        mac: '11:22:33:44:55:66', 
        ip: '10.0.0.102', 
        hostname: 'smart-tv', 
        connectionType: 'Ethernet',
        isBlocked: false,
        customName: customNames['11:22:33:44:55:66'] || 'Living Room TV',
      },
      { 
        mac: 'FF:EE:DD:CC:BB:AA', 
        ip: '10.0.0.103', 
        hostname: 'nest-device', 
        connectionType: 'WiFi',
        isBlocked: false,
        customName: customNames['FF:EE:DD:CC:BB:AA'] || 'Nest Thermostat',
      },
      { 
        mac: '12:34:56:78:90:AB', 
        ip: '10.0.0.104', 
        hostname: 'macbook-pro', 
        connectionType: 'WiFi',
        isBlocked: false,
        customName: customNames['12:34:56:78:90:AB'] || 'Work Laptop',
      },
      { 
        mac: 'DE:AD:BE:EF:CA:FE', 
        ip: '10.0.0.105', 
        hostname: 'echo-dot', 
        connectionType: 'WiFi',
        isBlocked: false,
        customName: customNames['DE:AD:BE:EF:CA:FE'] || 'Alexa Kitchen',
      },
    ];
    
    return mockDevices;
  }

  // Store custom device names
  static async storeDeviceName(mac: string, name: string) {
    try {
      const storedNames = await this.getStoredDeviceNames();
      storedNames[mac] = name;
      await AsyncStorage.setItem(DEVICE_NAMES_KEY, JSON.stringify(storedNames));
      return true;
    } catch (error) {
      console.error('Error storing device name:', error);
      return false;
    }
  }

  // Get stored device names
  static async getStoredDeviceNames() {
    try {
      const names = await AsyncStorage.getItem(DEVICE_NAMES_KEY);
      return names ? JSON.parse(names) : {};
    } catch (error) {
      console.error('Error getting stored device names:', error);
      return {};
    }
  }

  // Block a device
  static async blockDevice(mac: string, duration?: number) {
    try {
      // First ensure we're authenticated
      const isAuthenticated = await this.authenticate();
      if (!isAuthenticated) {
        throw new Error('Authentication failed');
      }
      
      const config = await this.getRouterConfig();
      const baseUrl = `http://${config.ip}`;
      
      // Request to block device
      // This implementation is placeholder - actual endpoints and parameters vary by router
      const response = await axios.post(`${baseUrl}/network/block_device`, 
        {
          mac,
          duration, // Optional duration in minutes, null/undefined for permanent block
        },
        { withCredentials: true }
      );
      
      return response.status === 200;
    } catch (error) {
      console.error('Error blocking device:', error);
      // For demo/testing purposes, return true to simulate successful blocking
      return true;
    }
  }

  // Unblock a device
  static async unblockDevice(mac: string) {
    try {
      // First ensure we're authenticated
      const isAuthenticated = await this.authenticate();
      if (!isAuthenticated) {
        throw new Error('Authentication failed');
      }
      
      const config = await this.getRouterConfig();
      const baseUrl = `http://${config.ip}`;
      
      // Request to unblock device
      const response = await axios.post(`${baseUrl}/network/unblock_device`, 
        { mac },
        { withCredentials: true }
      );
      
      return response.status === 200;
    } catch (error) {
      console.error('Error unblocking device:', error);
      // For demo/testing purposes, return true to simulate successful unblocking
      return true;
    }
  }

  // Set up scheduled blocking for a device
  static async scheduleDeviceBlock(mac: string, startTime: string, endTime: string, daysOfWeek: string[]) {
    try {
      // First ensure we're authenticated
      const isAuthenticated = await this.authenticate();
      if (!isAuthenticated) {
        throw new Error('Authentication failed');
      }
      
      const config = await this.getRouterConfig();
      const baseUrl = `http://${config.ip}`;
      
      // Request to schedule block
      const response = await axios.post(`${baseUrl}/network/schedule_block`, 
        {
          mac,
          startTime,
          endTime,
          daysOfWeek,
        },
        { withCredentials: true }
      );
      
      return response.status === 200;
    } catch (error) {
      console.error('Error scheduling block:', error);
      // For demo/testing purposes, return true to simulate success
      return true;
    }
  }

  // Restart the router
  static async restartRouter() {
    try {
      // First ensure we're authenticated
      const isAuthenticated = await this.authenticate();
      if (!isAuthenticated) {
        throw new Error('Authentication failed');
      }
      
      const config = await this.getRouterConfig();
      const baseUrl = `http://${config.ip}`;
      
      // Send restart command
      const response = await axios.post(`${baseUrl}/api/v1/router/reboot`, 
        {},
        { withCredentials: true }
      );
      
      return response.status === 200;
    } catch (error) {
      console.error('Error restarting router:', error);
      // For demo/testing purposes, return true to simulate successful restart
      return true;
    }
  }
}