/**
 * Security Tests for Network Operations
 * Validates that no real LAN scanning occurs during testing
 */

import { NetInfoMockUtils } from '../../__mocks__/@react-native-community/netinfo';
import SecurityConfig from './SecurityConfig';

// Ensure test environment is properly configured
process.env.NODE_ENV = 'test';
process.env.DISABLE_REAL_LAN_SCANNING = 'true';
process.env.USE_NETINFO_MOCKS = 'true';
process.env.BLOCK_EXTERNAL_NETWORK_CALLS = 'true';
process.env.ANDROID_USE_ADB_REVERSE = 'true';
process.env.IOS_USE_LOCALHOST = 'true';

describe('Network Security Tests', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Reset NetInfo mock state before each test
    NetInfoMockUtils.reset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Security Configuration', () => {
    it('should validate test environment security settings', () => {
      const validation = SecurityConfig.validateTestEnvironment();
      
      if (!validation.valid) {
        console.log('Security validation errors:', validation.errors);
      }
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should prevent real LAN scanning', () => {
      const config = SecurityConfig.loadSecurityConfig();
      
      expect(config.disableRealLanScanning).toBe(true);
      expect(config.useNetInfoMocks).toBe(true);
      expect(config.blockExternalNetworkCalls).toBe(true);
    });

    it('should provide safe mock server URLs', () => {
      const mockServerUrl = SecurityConfig.getMockServerUrl();
      const mockWebSocketUrl = SecurityConfig.getMockWebSocketUrl();
      
      // Should use local addresses only
      expect(mockServerUrl).toMatch(/^https?:\/\/(127\.0\.0\.1|localhost)/);
      expect(mockWebSocketUrl).toMatch(/^wss?:\/\/(127\.0\.0\.1|localhost)/);
      
      // Should not contain real router IPs
      expect(mockServerUrl).not.toMatch(/192\.168\./);
      expect(mockServerUrl).not.toMatch(/10\.0\.0\.1/);
    });

    it('should validate URLs for test safety', () => {
      // Safe URLs (should pass)
      expect(SecurityConfig.isUrlSafeForTesting('http://127.0.0.1:8081')).toBe(true);
      expect(SecurityConfig.isUrlSafeForTesting('http://localhost:3001')).toBe(true);
      
      // Unsafe URLs (should fail in secure mode)
      expect(SecurityConfig.isUrlSafeForTesting('http://192.168.1.1')).toBe(false);
      expect(SecurityConfig.isUrlSafeForTesting('http://10.0.0.1')).toBe(false);
      expect(SecurityConfig.isUrlSafeForTesting('http://google.com')).toBe(false);
    });
  });

  describe('NetInfo Mock Security', () => {
    it('should use mocked network state instead of real network', async () => {
      // Import NetInfo after mocks are set up
      const NetInfo = require('@react-native-community/netinfo').default;
      
      const networkState = await NetInfo.fetch();
      
      // Should return mock data, not real network information
      expect(networkState).toHaveProperty('isConnected');
      expect(networkState).toHaveProperty('type');
      expect(networkState.details?.ssid).toBe('TestNetwork'); // Mock SSID
      expect(networkState.details?.ipAddress).toBe('192.168.1.100'); // Mock IP
    });

    it('should allow controlled network state changes', () => {
      const mockNetworkStates = NetInfoMockUtils.getAvailableStates();
      
      // Should have predefined safe states
      expect(mockNetworkStates).toHaveProperty('wifi_connected');
      expect(mockNetworkStates).toHaveProperty('wifi_no_internet');
      expect(mockNetworkStates).toHaveProperty('cellular');
      expect(mockNetworkStates).toHaveProperty('none');
      
      // Test state change simulation
      NetInfoMockUtils.setNetworkState('none');
      const currentState = NetInfoMockUtils.getCurrentState();
      expect(currentState.isConnected).toBe(false);
      expect(currentState.type).toBe('none');
    });

    it('should simulate network events safely', async () => {
      const NetInfo = require('@react-native-community/netinfo').default;
      
      let callCount = 0;
      let resolveFn: (value: void) => void;
      const networkChangePromise = new Promise<void>((resolve) => {
        resolveFn = resolve;
      });
      
      const unsubscribe = NetInfo.addEventListener((state) => {
        callCount++;
        // Skip initial call with wifi state
        if (callCount === 1) return;
        
        if (state.type === 'cellular') {
          expect(state.isConnected).toBe(true);
          expect(state.type).toBe('cellular');
          unsubscribe();
          resolveFn();
        }
      });
      
      // Simulate network change
      setTimeout(() => {
        NetInfoMockUtils.simulateCellularConnection();
      }, 100);
      
      // Run the timer to execute the setTimeout callback
      jest.runAllTimers();
      
      await networkChangePromise;
    });

    it('should prevent exposure of real network information', async () => {
      const NetInfo = require('@react-native-community/netinfo').default;
      const networkState = await NetInfo.fetch();
      
      // Ensure no real network details leak through
      if (networkState.details) {
        // Mock SSID should not contain real network names
        expect(networkState.details.ssid).not.toMatch(/linksys|netgear|xfinity|comcast/i);
        
        // Mock IPs should be in test ranges
        if (networkState.details.ipAddress) {
          expect(networkState.details.ipAddress).toMatch(/^(127\.|192\.168\.1\.)/);
        }
      }
    });
  });

  describe('Platform-Specific Configuration', () => {
    it('should provide Android ADB reverse command', () => {
      // Mock Platform.OS for Android
      jest.doMock('react-native', () => ({
        Platform: { OS: 'android' }
      }));
      
      const adbCommand = SecurityConfig.getAdbReverseCommand();
      expect(adbCommand).toBe('adb reverse tcp:8081 tcp:8081');
    });

    it('should handle iOS localhost configuration', () => {
      // This test should verify that when iOS is configured, localhost URLs are returned
      // Since Platform.OS is mocked in setup, we test the configuration logic
      const config = SecurityConfig.loadSecurityConfig();
      expect(config.platformConfig.ios.useLocalhost).toBe(true);
      expect(config.platformConfig.ios.host).toBe('localhost');
    });
  });

  describe('Mock Server Security', () => {
    it('should only accept test credentials', () => {
      const config = SecurityConfig.loadSecurityConfig();
      
      // Should use test-specific credentials from environment
      expect(config.testCredentials.username).toBe('admin');
      expect(config.testCredentials.password).toBe('password1');
      
      // Should have secure test SSID
      expect(config.testCredentials.wifiSSID).toBe('TestNetwork');
      expect(config.testCredentials.wifiPassword).toBe('testpass123');
    });

    it('should provide safe mock network configuration', () => {
      const config = SecurityConfig.loadSecurityConfig();
      
      // Should use RFC 1918 private addresses for mocking
      expect(config.mockNetworkConfig.gatewayIP).toMatch(/^(192\.168\.|10\.|172\.)/);
      expect(config.mockNetworkConfig.clientIP).toMatch(/^(192\.168\.|10\.|172\.)/);
      
      // Should use safe DNS servers
      expect(config.mockNetworkConfig.dnsServers).toContain('8.8.8.8');
      expect(config.mockNetworkConfig.dnsServers).toContain('8.8.4.4');
    });
  });

  describe('Network Interceptor', () => {
    it('should redirect router calls to mock server', () => {
      const interceptorConfig = SecurityConfig.getNetworkInterceptorConfig();
      
      expect(interceptorConfig.blockExternalCalls).toBe(true);
      expect(interceptorConfig.allowedDomains).toContain('127.0.0.1');
      expect(interceptorConfig.allowedDomains).toContain('localhost');
      
      // Should have redirect rules for common router IPs
      expect(interceptorConfig.redirectRules).toHaveLength(1);
      expect(interceptorConfig.redirectRules[0].from).toBeInstanceOf(RegExp);
    });
  });
});

describe('Environment Validation', () => {
  it('should ensure test environment is secure', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.DISABLE_REAL_LAN_SCANNING).toBe('true');
    expect(process.env.USE_NETINFO_MOCKS).toBe('true');
    expect(process.env.BLOCK_EXTERNAL_NETWORK_CALLS).toBe('true');
  });

  it('should prevent running in production', () => {
    // Temporarily change environment
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    expect(() => {
      SecurityConfig.loadSecurityConfig();
    }).toThrow('SecurityConfig should only be used in test environment');
    
    // Restore environment
    process.env.NODE_ENV = originalEnv;
  });
});
