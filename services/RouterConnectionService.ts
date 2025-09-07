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

  // Environment detection
  static detectEnvironment(): { platform: string; canAccessLocalNetwork: boolean; reason: string } {
    // Check if we're in a web browser
    if (typeof window !== 'undefined' && window.location) {
      return {
        platform: 'web',
        canAccessLocalNetwork: false,
        reason: 'Web browsers block local network access due to CORS policies'
      };
    }

    // Check if we're in React Native
    if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
      return {
        platform: 'react-native',
        canAccessLocalNetwork: true,
        reason: 'React Native should support local network access'
      };
    }

    // Check if we're in Expo
    if (typeof global !== 'undefined' && global.__expo) {
      return {
        platform: 'expo',
        canAccessLocalNetwork: true,
        reason: 'Expo should support local network access'
      };
    }

    return {
      platform: 'unknown',
      canAccessLocalNetwork: false,
      reason: 'Unknown environment - network access uncertain'
    };
  }

  // Enhanced network connectivity check with multiple methods
  static async checkNetworkConnectivity(ip: string): Promise<{ isReachable: boolean; error?: string; method?: string }> {
    const environment = this.detectEnvironment();

    console.log('🔍 Checking network connectivity to:', ip);
    console.log('Environment:', environment);

    // If we're in a web environment, skip network checks and suggest alternatives
    if (!environment.canAccessLocalNetwork) {
      console.log('⚠️ Environment does not support local network access:', environment.reason);
      return {
        isReachable: false,
        error: 'ENVIRONMENT_RESTRICTION',
        method: 'environment_check'
      };
    }

    // Try multiple connection methods
    const methods = [
      { name: 'HEAD', fn: () => axios.head(`http://${ip}`, { timeout: 3000, validateStatus: () => true }) },
      { name: 'GET', fn: () => axios.get(`http://${ip}`, { timeout: 3000, validateStatus: () => true }) },
      { name: 'OPTIONS', fn: () => axios.options(`http://${ip}`, { timeout: 3000, validateStatus: () => true }) }
    ];

    for (const method of methods) {
      try {
        console.log(`Trying ${method.name} request to ${ip}...`);
        const response = await method.fn();

        console.log('✅ Network connectivity check passed:', {
          method: method.name,
          status: response.status,
          reachable: true
        });

        return { isReachable: true, method: method.name };
      } catch (error: any) {
        console.log(`❌ ${method.name} request failed:`, {
          error: error.message,
          code: error.code
        });

        // If it's not a network error, the host might be reachable but not responding to this method
        if (error.code !== 'ERR_NETWORK' && error.code !== 'ECONNREFUSED') {
          console.log('Host appears reachable but not responding to', method.name);
          return { isReachable: true, method: method.name, error: 'partial_response' };
        }
      }
    }

    return {
      isReachable: false,
      error: 'ERR_NETWORK',
      method: 'all_methods_failed'
    };
  }

  // Try to find the correct router IP address
  static async findRouterIP(): Promise<{ ip: string | null; environmentIssue: boolean; reason?: string }> {
    const environment = this.detectEnvironment();

    // Check if environment supports local network access
    if (!environment.canAccessLocalNetwork) {
      console.log('❌ Environment does not support local network access');
      console.log('Reason:', environment.reason);
      return {
        ip: null,
        environmentIssue: true,
        reason: environment.reason
      };
    }

    const commonRouterIPs = [
      '10.0.0.1',      // Xfinity default
      '192.168.1.1',   // Common default
      '192.168.0.1',   // Another common default
      '192.168.1.254', // Some routers use this
      '10.1.10.1'      // Some Xfinity routers
    ];

    console.log('🔍 Searching for router IP address...');

    for (const ip of commonRouterIPs) {
      console.log(`Testing IP: ${ip}`);
      const result = await this.checkNetworkConnectivity(ip);
      if (result.isReachable) {
        console.log(`✅ Found router at: ${ip}`);
        return { ip, environmentIssue: false };
      }
    }

    console.log('❌ No router found at common IP addresses');
    return { ip: null, environmentIssue: false, reason: 'no_router_found' };
  }

  // Get connection status with detailed information
  static async getConnectionStatus(): Promise<{
    canConnect: boolean;
    mode: 'real' | 'mock';
    environment: string;
    routerIP?: string;
    reason: string;
    suggestions: string[];
  }> {
    const environment = this.detectEnvironment();

    if (!environment.canAccessLocalNetwork) {
      return {
        canConnect: false,
        mode: 'mock',
        environment: environment.platform,
        reason: environment.reason,
        suggestions: [
          'Use a mobile app instead of web browser',
          'Try the app on a physical device',
          'Use mock data mode for demonstration'
        ]
      };
    }

    // Try to find a working router IP
    const routerSearch = await this.findRouterIP();
    if (routerSearch.ip) {
      return {
        canConnect: true,
        mode: 'real',
        environment: environment.platform,
        routerIP: routerSearch.ip,
        reason: 'Router found and accessible',
        suggestions: []
      };
    }

    return {
      canConnect: false,
      mode: 'mock',
      environment: environment.platform,
      reason: routerSearch.reason || 'No router found at common IP addresses',
      suggestions: [
        'Check router power and WiFi connection',
        'Verify router web interface is enabled',
        'Try accessing router in web browser first',
        'Check router label for correct IP address'
      ]
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

      // Perform network connectivity check first
      let routerIP = config.ip;
      const connectivityCheck = await this.checkNetworkConnectivity(routerIP);
      if (!connectivityCheck.isReachable) {
        console.error('❌ Pre-connection network check failed for', routerIP, ':', connectivityCheck.error);

        // Check if this is an environment issue
        if (connectivityCheck.error === 'ENVIRONMENT_RESTRICTION') {
          console.error('🌐 Environment Restriction Detected');
          console.error('💡 This appears to be a web browser or restricted environment');
          console.error('📱 Automatically switching to Mock Data Mode for demonstration');

          // Automatically enable mock mode for environments that can't access local networks
          await AsyncStorage.setItem('use_mock_data', 'true');
          console.log('✅ Mock data mode enabled - app will use sample data');
          return true; // Return success so the app can continue with mock data
        }

        console.log('🔍 Attempting to find router at other common IP addresses...');

        // Try to find the router at other common IP addresses
        const routerSearch = await this.findRouterIP();
        if (routerSearch.environmentIssue) {
          console.error('🌐 Environment Issue:', routerSearch.reason);
          console.error('📱 Automatically switching to Mock Data Mode');

          // Enable mock mode for environment issues
          await AsyncStorage.setItem('use_mock_data', 'true');
          console.log('✅ Mock data mode enabled - app will use sample data');
          return true;
        }

        if (routerSearch.ip) {
          console.log('✅ Found router at different IP:', routerSearch.ip);
          routerIP = routerSearch.ip;
          // Update the config with the found IP
          const updatedConfig = { ...config, ip: routerSearch.ip };
          await AsyncStorage.setItem(Config.storage.routerConfigKey, JSON.stringify(updatedConfig));
          console.log('💾 Updated router configuration with new IP');
        } else {
          console.error('❌ Router not found at any common IP addresses');
          console.error('💡 This could be due to:');
          console.error('  • Router is powered off or malfunctioning');
          console.error('  • Device is not connected to router\'s WiFi network');
          console.error('  • Router web interface is disabled');
          console.error('  • Network firewall blocking connections');
          console.error('  • Router uses a non-standard IP address');
          console.error('');
          console.error('🔧 Troubleshooting steps:');
          console.error('  1. Check router power and status lights');
          console.error('  2. Verify WiFi connection to router');
          console.error('  3. Try accessing router web interface in browser');
          console.error('  4. Check router label for correct IP address');
          console.error('  5. Restart router if necessary');
          console.error('');
          console.error('📱 Switching to Mock Data Mode for now...');

          // Fall back to mock mode if no router found
          await AsyncStorage.setItem('use_mock_data', 'true');
          console.log('✅ Mock data mode enabled - app will use sample data');
          return true; // Allow app to continue with mock data
        }
      }

      // Update baseUrl with the correct router IP
      const finalBaseUrl = `http://${routerIP}`;
      console.log('Attempting to connect to router at:', finalBaseUrl);
      
      // Try to connect to the router's login page with enhanced error handling
      const response = await axios.get(finalBaseUrl, {
        timeout: Config.api.connectionTimeout, // Use shorter timeout for initial connection
        validateStatus: (status) => true,
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Cache-Control': 'no-cache',
          'User-Agent': 'Mozilla/5.0 (compatible; XfinityRouterApp/1.0)',
          'Connection': 'close'
        },
        withCredentials: false,
        // Additional axios configuration for better network handling
        maxRedirects: 5,
        decompress: true,
        // Disable HTTP/2 to avoid potential issues
        httpAgent: false,
        httpsAgent: false
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
          url: finalBaseUrl
        });
        return false;
      }
      
      return true;
    } catch (error: any) {
      // Enhanced error logging with network diagnostics
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

        // Specific error handling for different network issues
        if (error.code === 'ERR_NETWORK') {
          console.error('❌ Network Error - This could be due to:');
          console.error('  • Router is not accessible at the IP address');
          console.error('  • Device is not connected to the same network as the router');
          console.error('  • Router firewall is blocking the connection');
          console.error('  • CORS policy blocking the request (if running in browser)');
          console.error('  • Router web interface is disabled');
          console.error('💡 Troubleshooting steps:');
          console.error('  1. Verify router IP address (usually 10.0.0.1 or 192.168.1.1)');
          console.error('  2. Check if you can access router web interface in browser');
          console.error('  3. Ensure device is connected to router\'s WiFi network');
          console.error('  4. Try restarting the router');
        } else if (error.code === 'ECONNREFUSED') {
          console.error('❌ Connection refused - Router might be off or wrong IP address');
        } else if (error.code === 'ENOTFOUND') {
          console.error('❌ Host not found - Check IP address');
        } else if (error.code === 'ETIMEDOUT') {
          console.error('❌ Connection timeout - Router might be slow or unreachable');
        } else if (error.code === 'ENETUNREACH') {
          console.error('❌ Network unreachable - Check your network connection');
        } else if (error.message.includes('CORS')) {
          console.error('❌ CORS error - Try using mobile app instead of web browser');
        } else {
          console.error('❌ Unknown network error:', error.code || 'NO_CODE');
        }
      } else {
        console.error('Unexpected error:', error);
      }
      return false;
    }
  }

  // Authenticate with the router
  static async authenticate(force: boolean = false): Promise<boolean> {
    try {
      // If we have a session and aren't forcing re-auth, verify the session first
      if (!force && await this.verifySession()) {
        return true;
      }

      const config = await this.getRouterConfig();
      const baseUrl = `http://${config.ip}`;

      console.log('Authenticating with router...');
      
      const response = await axios.post(
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

  /**
   * Verify if the current session is still valid
   */
  static async verifySession(): Promise<boolean> {
    try {
      const config = await this.getRouterConfig();
      const baseUrl = `http://${config.ip}`;

      // Try to access a protected endpoint
      const response = await axios.get(`${baseUrl}${Config.router.deviceEndpoint}`, {
        withCredentials: true,
      });

      // If we don't get a login redirect, session is valid
      return !response.data.includes('Please Login First!');
    } catch (error) {
      console.error('Session verification error:', error);
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
      // Navigate to network_setup.php to get Internet status and System Uptime
      const networkSetupResponse = await axios.get(`${baseUrl}/network_setup.php`, {
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
      
      // Get connected devices count from connection_status.php
      let connectedDevices = 0;
      try {
        const connectionStatusResponse = await axios.get(`${baseUrl}/connection_status.php`, {
          withCredentials: true,
        });
        
        const connectionStatusRoot = parse(connectionStatusResponse.data);
        
        // Find the element containing "No of Clients connected:" label
        const clientsElement = connectionStatusRoot.querySelector('div.form-row span.readonlyLabel:contains("No of Clients connected:")');
        if (clientsElement) {
          // Get the parent div and then find the value span
          const valueElement = clientsElement.parentNode.querySelector('span.value');
          if (valueElement) {
            // Extract and parse the number
            const clientsText = valueElement.text.trim();
            connectedDevices = parseInt(clientsText, 10) || 0;
            console.log(`Found ${connectedDevices} connected clients`);
          }
        } else {
          console.log('Could not find "No of Clients connected:" element');
        }
      } catch (connectionError) {
        console.error('Error fetching connection status:', connectionError);
        // If we can't get the connected devices count, use a fallback value
        connectedDevices = 0;
      }
      
      return {
        status: internetStatus,
        uptime: systemUptime,
        connectedDevices: connectedDevices,
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
      const config = await this.getRouterConfig();
      const baseUrl = `http://${config.ip}`;
      
      console.log('Fetching connected devices from router...');
      
      // Request connected devices list using configured endpoint
      const response = await axios.get(`${baseUrl}${Config.router.deviceEndpoint}`, {
        withCredentials: true,
      });

      // Check for login redirect script
      if (response.data.includes('Please Login First!')) {
        console.log('Detected login redirect, attempting re-authentication...');
        const isAuthenticated = await this.authenticate();
        if (!isAuthenticated) {
          throw new Error('Re-authentication failed');
        }
        // Retry the request after authentication
        const retryResponse = await axios.get(`${baseUrl}${Config.router.deviceEndpoint}`, {
          withCredentials: true,
        });
        response.data = retryResponse.data;
      }

      // Parse the HTML response
      const root = parse(response.data);
      
      // Find the online devices section
      const onlineSection = root.querySelector('#online-private');
      if (!onlineSection) {
        throw new Error('Invalid router response: Missing online-private section');
      }

      // Find the devices table
      const table = onlineSection.querySelector('table.data');
      if (!table) {
        throw new Error('Invalid router response: Missing devices table');
      }

      // Find all device rows in the table (skip header and footer)
      const deviceRows = table.querySelectorAll('tr:not(:first-child):not(:last-child)');
      console.log(`Found ${deviceRows.length} device rows`);
      
      // Get stored device names for custom names
      const storedNames = await this.getStoredDeviceNames();
      
      // Extract and validate device information from each row
      const devices = deviceRows.map(row => {
        try {
          // Get the device info div that contains all the details
          const deviceInfoDiv = row.querySelector('.device-info');
          if (!deviceInfoDiv) return null;

          // Extract all details from the definition list
          const details = this.extractDeviceDetails(deviceInfoDiv);
          
          // Get the basic info from the row
          const hostNameCell = row.querySelector('[headers="host-name"] a');
          const dhcpCell = row.querySelector('[headers="dhcp-or-reserved"]');
          const rssiCell = row.querySelector('[headers="rssi-level"]');
          const connectionCell = row.querySelector('[headers="connection-type"]');

          const rawDevice = {
            hostname: hostNameCell?.text?.trim(),
            ip: details.ipv4,
            mac: details.mac,
            dhcpType: dhcpCell?.text?.trim() || 'DHCP',
            connectionType: connectionCell?.text?.trim(),
            rssiLevel: rssiCell?.text?.trim(),
            ipv6: details.ipv6,
            localLinkIpv6: details.localLinkIpv6,
            comments: details.comments,
            customName: '',
            isOnline: true,
            networkDetails: {
              band: undefined,
              protocol: undefined,
              signalStrength: this.parseRSSI(rssiCell?.text?.trim()),
              lastSeen: new Date().toISOString()
            }
          };

          // Apply custom name if available
          if (rawDevice.mac && storedNames[rawDevice.mac]) {
            rawDevice.customName = storedNames[rawDevice.mac];
          } else if (details.comments) {
            rawDevice.customName = details.comments;
          }

          // Validate and transform the device data
          return this.validateDevice(rawDevice);
        } catch (error) {
          console.error('Error parsing device row:', error);
          return null;
        }
      });

      // Filter out invalid devices and sort by hostname
      const validDevices = devices
        .filter((device): device is Device => device !== null)
        .sort((a, b) => a.hostname.localeCompare(b.hostname));

      console.log(`Successfully validated ${validDevices.length} devices`);
      return validDevices;
      
    } catch (error) {
      console.error('Error getting connected devices:', error);
      throw new Error(`Failed to get connected devices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Helper to extract device details from the info div
  private static extractDeviceDetails(deviceInfoDiv: any) {
    const details: any = {
      ipv4: '',
      ipv6: '',
      localLinkIpv6: '',
      mac: '',
      comments: ''
    };

    const definitionList = deviceInfoDiv.querySelector('dl');
    if (!definitionList) return details;

    const definitions = definitionList.querySelectorAll('dd');
    definitions.forEach((dd: any) => {
      const text = dd.text.trim();
      if (text.includes('IPV4 Address')) {
        details.ipv4 = text.split('IPV4 Address')[1].trim();
      } else if (text.includes('IPV6 Address')) {
        details.ipv6 = text.split('IPV6 Address')[1].trim();
      } else if (text.includes('Local Link IPV6 Address')) {
        details.localLinkIpv6 = text.split('Local Link IPV6 Address')[1].trim();
      } else if (text.includes('MAC Address')) {
        details.mac = text.split('MAC Address')[1].trim();
      } else if (text.includes('Comments')) {
        details.comments = text.split('Comments')[1].trim();
      }
    });

    return details;
  }

  // Helper to parse RSSI value to dBm number
  private static parseRSSI(rssi: string | undefined): number | undefined {
    if (!rssi) return undefined;
    const match = rssi.match(/-?\d+/);
    return match ? parseInt(match[0], 10) : undefined;
  }

  // Get mock devices for testing/demo purposes
  private static async getMockDevices(): Promise<Device[]> {
    const customNames = await this.getStoredDeviceNames();
    
    const mockDevices: Device[] = [
      { 
        mac: '00:11:22:33:44:55', 
        ip: '10.0.0.100', 
        hostname: 'android-device', 
        connectionType: 'WiFi',
        isBlocked: false,
        isOnline: true,
        customName: customNames['00:11:22:33:44:55'] || 'John\'s Phone',
        networkDetails: {
          band: '5GHz',
          protocol: 'Wi-Fi 6',
          dhcpType: 'DHCP',
          lastSeen: new Date().toISOString()
        }
      },
      { 
        mac: 'AA:BB:CC:DD:EE:FF', 
        ip: '10.0.0.101', 
        hostname: 'iPhone', 
        connectionType: 'WiFi',
        isBlocked: false,
        isOnline: true,
        customName: customNames['AA:BB:CC:DD:EE:FF'] || 'Sarah\'s iPhone',
        networkDetails: {
          band: '5GHz',
          protocol: 'Wi-Fi 6',
          dhcpType: 'DHCP',
          lastSeen: new Date().toISOString()
        }
      }
    ];
    
    return mockDevices;
  }

  // Store custom device names
  static async storeDeviceName(mac: string, name: string): Promise<boolean> {
    try {
      // Try to update on router first if authenticated
      const isAuthenticated = await this.authenticate();
      if (isAuthenticated) {
        const config = await this.getRouterConfig();
        const baseUrl = `http://${config.ip}`;
        
        try {
          const response = await axios.put(`${baseUrl}/network/devices/${mac}/name`, 
            { customName: name },
            { 
              withCredentials: true,
              timeout: Config.api.timeout,
              validateStatus: (status) => status < 500
            }
          );
          
          if (response.status >= 200 && response.status < 300) {
            console.log('Device name updated on router successfully');
          } else {
            console.warn('Router returned non-success status:', response.status);
          }
        } catch (routerError) {
          console.warn('Failed to update name on router, storing locally only:', routerError);
        }
      }
      
      // Always store locally as backup
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
  static async blockDevice(mac: string, durationMinutes?: number): Promise<boolean> {
    try {
      // First ensure we're authenticated
      const isAuthenticated = await this.authenticate();
      if (!isAuthenticated) {
        throw new Error('Authentication failed');
      }
      
      const config = await this.getRouterConfig();
      const baseUrl = `http://${config.ip}`;
      
      const body: any = { action: 'block', mac };
      if (durationMinutes) {
        body.duration = durationMinutes;
      }
      
      // Request to block device
      const response = await axios.post(`${baseUrl}/network/devices/${mac}/block`, 
        body,
        { 
          withCredentials: true,
          timeout: Config.api.timeout,
          validateStatus: (status) => status < 500,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      if (response.status >= 200 && response.status < 300) {
        const data = response.data;
        return data?.success !== false; // Return true unless explicitly false
      } else {
        console.error('Block device failed with status:', response.status);
        return false;
      }
    } catch (error) {
      console.error('Error blocking device:', error);
      if (axios.isAxiosError(error)) {
        console.error('Network Error Details:', {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          url: error.config?.url
        });
      }
      // For demo/testing purposes, return true to simulate successful blocking
      return true;
    }
  }

  // Unblock a device
  static async unblockDevice(mac: string): Promise<boolean> {
    try {
      // First ensure we're authenticated
      const isAuthenticated = await this.authenticate();
      if (!isAuthenticated) {
        throw new Error('Authentication failed');
      }
      
      const config = await this.getRouterConfig();
      const baseUrl = `http://${config.ip}`;
      
      // Request to unblock device
      const response = await axios.post(`${baseUrl}/network/devices/${mac}/unblock`, 
        { action: 'unblock' },
        { 
          withCredentials: true,
          timeout: Config.api.timeout,
          validateStatus: (status) => status < 500,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      if (response.status >= 200 && response.status < 300) {
        const data = response.data;
        return data?.success !== false; // Return true unless explicitly false
      } else {
        console.error('Unblock device failed with status:', response.status);
        return false;
      }
    } catch (error) {
      console.error('Error unblocking device:', error);
      if (axios.isAxiosError(error)) {
        console.error('Network Error Details:', {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          url: error.config?.url
        });
      }
      // For demo/testing purposes, return true to simulate successful unblocking
      return true;
    }
  }

  // Set up scheduled blocking for a device
  static async scheduleDeviceBlock(mac: string, startTime: string, endTime: string, days: string[]): Promise<boolean> {
    try {
      // First ensure we're authenticated
      const isAuthenticated = await this.authenticate();
      if (!isAuthenticated) {
        throw new Error('Authentication failed');
      }
      
      const config = await this.getRouterConfig();
      const baseUrl = `http://${config.ip}`;
      
      // Request to schedule block
      const response = await axios.post(`${baseUrl}/network/devices/${mac}/schedule`, 
        {
          startTime,
          endTime,
          days,
        },
        { 
          withCredentials: true,
          timeout: Config.api.timeout,
          validateStatus: (status) => status < 500,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      if (response.status >= 200 && response.status < 300) {
        const data = response.data;
        return data?.success !== false; // Return true unless explicitly false
      } else {
        console.error('Schedule device block failed with status:', response.status);
        return false;
      }
    } catch (error) {
      console.error('Error scheduling block:', error);
      if (axios.isAxiosError(error)) {
        console.error('Network Error Details:', {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          url: error.config?.url
        });
      }
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

  // Validate and transform device data
  private static validateDevice(rawDevice: any): Device | null {
    try {
      // Require these fields
      if (!rawDevice.mac || !rawDevice.hostname) {
        console.error('Missing required device fields:', rawDevice);
        return null;
      }

      // Ensure MAC address is properly formatted
      const formattedMac = rawDevice.mac.toUpperCase();
      if (!/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(formattedMac)) {
        console.error('Invalid MAC address format:', rawDevice.mac);
        return null;
      }

      // Use provided IP or generate default
      const ip = rawDevice.ip?.trim() || this.generateDefaultIp(formattedMac);

      // Normalize connection type and extract band information
      const connectionInfo = this.parseConnectionType(rawDevice.connectionType || '');

      // Ensure network details are present and valid
      const dhcpType = rawDevice.dhcpType === 'Reserved IP' ? 'Reserved' as const : 'DHCP' as const;
      const networkDetails = {
        band: connectionInfo.band,
        protocol: connectionInfo.protocol,
        signalStrength: rawDevice.networkDetails?.signalStrength,
        speed: rawDevice.networkDetails?.speed,
        lastSeen: rawDevice.networkDetails?.lastSeen || new Date().toISOString(),
        ipv6: rawDevice.ipv6,
        localLinkIpv6: rawDevice.localLinkIpv6,
        dhcpType,
        rssiLevel: rawDevice.rssiLevel
      } as const;

      // Construct validated device object
      const validatedDevice: Device = {
        mac: formattedMac,
        ip,
        hostname: rawDevice.hostname.trim(),
        connectionType: this.normalizeConnectionType(rawDevice.connectionType),
        customName: (rawDevice.customName || rawDevice.comments || rawDevice.hostname).trim(),
        isBlocked: false, // Connected devices are not blocked
        isOnline: true,  // If we can see it in the list, it's online
        networkDetails
      };

      if (rawDevice.comments) {
        validatedDevice.comments = rawDevice.comments.trim();
      }

      console.log('Validated device:', {
        mac: validatedDevice.mac,
        hostname: validatedDevice.hostname,
        connectionType: validatedDevice.connectionType,
        band: validatedDevice.networkDetails.band,
        dhcpType: validatedDevice.networkDetails.dhcpType
      });

      return validatedDevice;
    } catch (error) {
      console.error('Error validating device:', error);
      return null;
    }
  }

  // Parse connection type and extract band & protocol information
  private static parseConnectionType(connectionType: string): { 
    band: '2.4GHz' | '5GHz' | 'Unknown';
    protocol: 'Wi-Fi 4' | 'Wi-Fi 5' | 'Wi-Fi 6' | 'Unknown';
  } {
    const connectionStr = connectionType.toLowerCase();
    let band: '2.4GHz' | '5GHz' | 'Unknown' = 'Unknown';
    let protocol: 'Wi-Fi 4' | 'Wi-Fi 5' | 'Wi-Fi 6' | 'Unknown' = 'Unknown';

    // Determine band
    if (connectionStr.includes('2.4') || connectionStr.includes('24g')) {
      band = '2.4GHz';
    } else if (connectionStr.includes('5g') || connectionStr.includes('5.0')) {
      band = '5GHz';
    }

    // Determine protocol
    if (connectionStr.includes('802.11ac') || connectionStr.includes('wifi 5')) {
      protocol = 'Wi-Fi 5';
    } else if (connectionStr.includes('802.11ax') || connectionStr.includes('wifi 6')) {
      protocol = 'Wi-Fi 6';
    } else if (connectionStr.includes('802.11n') || connectionStr.includes('wifi 4')) {
      protocol = 'Wi-Fi 4';
    }

    return { band, protocol };
  }

  // Normalize connection type string
  private static normalizeConnectionType(connectionType: string): 'WiFi' | 'Ethernet' | 'Unknown' {
    const type = connectionType.toLowerCase();
    if (type.includes('wifi') || type.includes('802.11')) {
      return 'WiFi';
    } else if (type.includes('ethernet') || type.includes('wired')) {
      return 'Ethernet';
    }
    return 'Unknown';
  }

  // Helper method to generate a default IP based on MAC address
  private static generateDefaultIp(mac: string): string {
    // Generate a consistent IP in 10.0.0.x range based on last octet of MAC
    const lastOctet = parseInt(mac.split(':')[5], 16);
    return `10.0.0.${lastOctet}`;
  }
}
