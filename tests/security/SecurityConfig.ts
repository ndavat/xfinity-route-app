/**
 * Security Configuration for Test Environment
 * Ensures safe testing practices without exposing real network information
 */

import { Platform } from 'react-native';

interface SecurityConfig {
  disableRealLanScanning: boolean;
  useNetInfoMocks: boolean;
  blockExternalNetworkCalls: boolean;
  allowedTestDomains: string[];
  mockServerConfig: {
    host: string;
    port: number;
    baseUrl: string;
    wsUrl: string;
  };
  platformConfig: {
    android: {
      useAdbReverse: boolean;
      reversePort: number;
      targetHost: string;
    };
    ios: {
      useLocalhost: boolean;
      host: string;
    };
  };
  testCredentials: {
    username: string;
    password: string;
    wifiSSID: string;
    wifiPassword: string;
  };
  mockNetworkConfig: {
    gatewayIP: string;
    clientIP: string;
    subnetMask: string;
    dnsServers: string[];
  };
}

/**
 * Load security configuration from environment variables
 */
export function loadSecurityConfig(): SecurityConfig {
  // Validate that we're in test environment
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('SecurityConfig should only be used in test environment');
  }

  return {
    disableRealLanScanning: process.env.DISABLE_REAL_LAN_SCANNING === 'true',
    useNetInfoMocks: process.env.USE_NETINFO_MOCKS === 'true',
    blockExternalNetworkCalls: process.env.BLOCK_EXTERNAL_NETWORK_CALLS === 'true',
    allowedTestDomains: [
      '127.0.0.1',
      'localhost',
      '::1',
      // Add mock server domains
      process.env.MOCK_SERVER_HOST || '127.0.0.1',
    ],
    mockServerConfig: {
      host: process.env.MOCK_SERVER_HOST || '127.0.0.1',
      port: parseInt(process.env.MOCK_SERVER_PORT || '8081', 10),
      baseUrl: process.env.MOCK_SERVER_URL || 'http://127.0.0.1:8081',
      wsUrl: process.env.MOCK_WS_URL || 'ws://127.0.0.1:8081',
    },
    platformConfig: {
      android: {
        useAdbReverse: process.env.ANDROID_USE_ADB_REVERSE === 'true',
        reversePort: 8081,
        targetHost: '127.0.0.1',
      },
      ios: {
        useLocalhost: process.env.IOS_USE_LOCALHOST === 'true',
        host: 'localhost',
      },
    },
    testCredentials: {
      username: process.env.TEST_ROUTER_USERNAME || 'admin',
      password: process.env.TEST_ROUTER_PASSWORD || 'password1',
      wifiSSID: process.env.TEST_WIFI_SSID || 'TestNetwork',
      wifiPassword: process.env.TEST_WIFI_PASSWORD || 'testpass123',
    },
    mockNetworkConfig: {
      gatewayIP: process.env.MOCK_GATEWAY_IP || '192.168.1.1',
      clientIP: process.env.MOCK_CLIENT_IP || '192.168.1.100',
      subnetMask: process.env.MOCK_SUBNET_MASK || '255.255.255.0',
      dnsServers: [
        process.env.MOCK_DNS_PRIMARY || '8.8.8.8',
        process.env.MOCK_DNS_SECONDARY || '8.8.4.4',
      ],
    },
  };
}

/**
 * Get platform-specific mock server URL
 */
export function getMockServerUrl(): string {
  const config = loadSecurityConfig();
  
  if (Platform.OS === 'android' && config.platformConfig.android.useAdbReverse) {
    // Android uses adb reverse mapping
    return `http://${config.platformConfig.android.targetHost}:${config.platformConfig.android.reversePort}`;
  } else if (Platform.OS === 'ios' && config.platformConfig.ios.useLocalhost) {
    // iOS simulator uses localhost
    return config.mockServerConfig.baseUrl.replace('127.0.0.1', config.platformConfig.ios.host);
  }
  
  // Default to configured mock server URL
  return config.mockServerConfig.baseUrl;
}

/**
 * Get platform-specific WebSocket URL
 */
export function getMockWebSocketUrl(): string {
  const config = loadSecurityConfig();
  
  if (Platform.OS === 'android' && config.platformConfig.android.useAdbReverse) {
    // Android uses adb reverse mapping
    return `ws://${config.platformConfig.android.targetHost}:${config.platformConfig.android.reversePort}`;
  } else if (Platform.OS === 'ios' && config.platformConfig.ios.useLocalhost) {
    // iOS simulator uses localhost
    return config.mockServerConfig.wsUrl.replace('127.0.0.1', config.platformConfig.ios.host);
  }
  
  // Default to configured WebSocket URL
  return config.mockServerConfig.wsUrl;
}

/**
 * Validate that a URL is safe for testing
 */
export function isUrlSafeForTesting(url: string): boolean {
  const config = loadSecurityConfig();
  
  if (!config.blockExternalNetworkCalls) {
    return true;
  }
  
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    
    // Check if hostname is in allowed test domains
    return config.allowedTestDomains.some(domain => 
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch (error) {
    // Invalid URL
    return false;
  }
}

/**
 * Get network interceptor configuration
 */
export function getNetworkInterceptorConfig() {
  const config = loadSecurityConfig();
  
  return {
    blockExternalCalls: config.blockExternalNetworkCalls,
    allowedDomains: config.allowedTestDomains,
    mockServerBaseUrl: getMockServerUrl(),
    mockWebSocketUrl: getMockWebSocketUrl(),
    redirectRules: [
      // Redirect router calls to mock server
      {
        from: /^https?:\/\/(10\.0\.0\.1|192\.168\.1\.1|192\.168\.0\.1)/,
        to: getMockServerUrl(),
      },
    ],
  };
}

/**
 * Setup ADB reverse for Android testing
 */
export function getAdbReverseCommand(): string {
  const config = loadSecurityConfig();
  
  if (!config.platformConfig.android.useAdbReverse) {
    throw new Error('ADB reverse is disabled in configuration');
  }
  
  const { reversePort } = config.platformConfig.android;
  const { port } = config.mockServerConfig;
  
  return `adb reverse tcp:${reversePort} tcp:${port}`;
}

/**
 * Validate test environment security
 */
export function validateTestEnvironment(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check if we're in test environment
  if (process.env.NODE_ENV !== 'test') {
    errors.push('NODE_ENV must be set to "test"');
  }
  
  // Check if mock configurations are enabled
  const config = loadSecurityConfig();
  
  if (!config.useNetInfoMocks) {
    errors.push('NetInfo mocks should be enabled for secure testing');
  }
  
  if (!config.disableRealLanScanning) {
    errors.push('Real LAN scanning should be disabled for security');
  }
  
  // Check for production credentials
  if (config.testCredentials.username === 'admin' && 
      config.testCredentials.password === 'admin') {
    errors.push('Default production credentials detected - use test-specific credentials');
  }
  
  // Validate mock server configuration
  if (!config.mockServerConfig.host || !config.mockServerConfig.port) {
    errors.push('Mock server configuration is incomplete');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Export the security configuration
 */
export const securityConfig = loadSecurityConfig();

/**
 * Default export for convenience
 */
export default {
  loadSecurityConfig,
  getMockServerUrl,
  getMockWebSocketUrl,
  isUrlSafeForTesting,
  getNetworkInterceptorConfig,
  getAdbReverseCommand,
  validateTestEnvironment,
  securityConfig,
};
