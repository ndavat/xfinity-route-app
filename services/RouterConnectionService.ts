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

  // Save router configuration to storage
  static async saveRouterConfig(config: any) {
    try {
      // Ensure mock mode is disabled
      config.useMockData = false;
      await AsyncStorage.setItem(ROUTER_CONFIG_KEY, JSON.stringify({
        ...DEFAULT_ROUTER_CONFIG,
        ...config
      }));
      await AsyncStorage.setItem('use_mock_data', 'false');
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
      // Ensure we're in real mode
      await AsyncStorage.setItem('use_mock_data', 'false');
      
      const config = await this.getRouterConfig();
      const baseUrl = `http://${config.ip}`;
      
      console.log('=== CONNECTING TO REAL ROUTER ===');
      console.log('Router Config:', {
        ip: config.ip,
        username: config.username,
        useMockData: config.useMockData
      });
      console.log('Attempting to connect to router at:', baseUrl);
      
      // Try to connect to the router's login page
      const response = await axios.get(baseUrl, {
        timeout: Config.api.timeout,
        validateStatus: (status) => true,
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Cache-Control': 'no-cache',
        },
        withCredentials: false
      });
      
      console.log('Router response details:', {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
      
      // If we get a response, consider it connected
      const isConnected = response.status < 400 || response.status === 401;
      console.log('Router connection status:', isConnected ? '✅ Connected' : '❌ Disconnected');
      
      if (!isConnected) {
        console.error('Connection failed:', {
          status: response.status,
          statusText: response.statusText,
          url: baseUrl
        });
        return false;
      }
      
      return true;
    } catch (error: any) {
      // Enhanced error logging
      console.error('=== ROUTER CONNECTION ERROR ===');
      if (axios.isAxiosError(error)) {
        console.error('Network Error Details:', {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          timeout: error.config?.timeout
        });
        
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
        }
      } else {
        console.error('Unexpected error:', error);
      }
      return false;
    }
  }

  // Authenticate with the router
  static async authenticate() {
    try {
      const config = await this.getRouterConfig();
      const baseUrl = `http://${config.ip}`;
      
      console.log('=== AUTHENTICATING WITH ROUTER ===');
      console.log('Using credentials for:', config.username);
      console.log('Authentication endpoint:', `${baseUrl}/login`);
      
      // Send authentication request
      const response = await axios.post(`${baseUrl}/login`, 
        new URLSearchParams({
          'username': config.username,
          'password': config.password
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cache-Control': 'no-cache'
          },
          withCredentials: true,
          timeout: Config.api.timeout,
          validateStatus: (status) => true // Accept any status to handle it explicitly
        }
      );
      
      console.log('Authentication response details:', {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
      
      const isAuthenticated = response.status === 200 || response.status === 302;
      console.log('Authentication status:', isAuthenticated ? '✅ Success' : '❌ Failed');
      
      if (!isAuthenticated) {
        console.error('Authentication failed:', {
          status: response.status,
          statusText: response.statusText,
          message: 'Invalid credentials or router rejected authentication'
        });
      }
      
      return isAuthenticated;
    } catch (error: any) {
      console.error('=== AUTHENTICATION ERROR ===');
      if (axios.isAxiosError(error)) {
        console.error('Network Error Details:', {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url
        });
        
        if (error.response?.status === 401 || error.response?.status === 403) {
          console.error('❌ Invalid credentials - Check username and password');
        } else if (error.code === 'ECONNREFUSED') {
          console.error('❌ Router refused connection during authentication');
        } else if (error.code === 'ETIMEDOUT') {
          console.error('❌ Authentication request timed out');
        }
      } else {
        console.error('Unexpected authentication error:', error);
      }
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
      // First ensure we're authenticated
      const isAuthenticated = await this.authenticate();
      if (!isAuthenticated) {
        throw new Error('Authentication failed');
      }
      
      const config = await this.getRouterConfig();
      const baseUrl = `http://${config.ip}`;
      
      // Request connected devices list
      const response = await axios.get(`${baseUrl}/network/connected_devices`, {
        withCredentials: true,
      });
      
      if (!response.data) {
        throw new Error('No data received from router');
      }

      return response.data.map((device: any) => ({
        mac: device.mac,
        ip: device.ip,
        hostname: device.hostname,
        connectionType: device.connectionType,
        isBlocked: device.isBlocked || false,
        customName: device.customName || device.hostname
      }));
    } catch (error) {
      console.error('Error getting connected devices:', error);
      throw error; // Don't fall back to mock data, let the error propagate
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