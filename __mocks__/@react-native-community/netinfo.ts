/**
 * Mock implementation of @react-native-community/netinfo
 * Provides controlled network state for testing without real LAN scanning
 * Ensures security by avoiding actual network discovery operations
 */

interface NetInfoState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
  details?: {
    ssid?: string;
    bssid?: string;
    strength?: number;
    ipAddress?: string;
    subnet?: string;
    frequency?: number;
    linkSpeed?: number;
    [key: string]: any;
  };
}

interface NetInfoConfiguration {
  shouldFetchWiFiSSID?: boolean;
  reachabilityUrl?: string;
  reachabilityTest?: (response: Response) => Promise<boolean>;
  reachabilityLongTimeout?: number;
  reachabilityShortTimeout?: number;
  reachabilityRequestTimeout?: number;
  reachabilityShouldRun?: () => boolean;
  useNativeReachability?: boolean;
}

// Mock network states for different test scenarios
const MOCK_NETWORK_STATES = {
  wifi_connected: {
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
    details: {
      ssid: 'TestNetwork',
      bssid: '00:11:22:33:44:55',
      strength: -45,
      ipAddress: '192.168.1.100',
      subnet: '255.255.255.0',
      frequency: 5000,
      linkSpeed: 150,
    },
  },
  wifi_no_internet: {
    isConnected: true,
    isInternetReachable: false,
    type: 'wifi',
    details: {
      ssid: 'TestNetwork',
      bssid: '00:11:22:33:44:55',
      strength: -60,
      ipAddress: '192.168.1.100',
      subnet: '255.255.255.0',
      frequency: 2400,
      linkSpeed: 54,
    },
  },
  cellular: {
    isConnected: true,
    isInternetReachable: true,
    type: 'cellular',
    details: {
      cellularGeneration: '4g',
      carrier: 'Test Carrier',
    },
  },
  none: {
    isConnected: false,
    isInternetReachable: false,
    type: 'none',
    details: {},
  },
  unknown: {
    isConnected: null,
    isInternetReachable: null,
    type: 'unknown',
    details: {},
  },
} as const;

// Internal state management
let currentState: NetInfoState = MOCK_NETWORK_STATES.wifi_connected;
let listeners: Array<(state: NetInfoState) => void> = [];
let isConfigured = false;
let mockConfiguration: NetInfoConfiguration = {};

// Mock NetInfo object
const NetInfo = {
  /**
   * Fetch current network state
   * Returns mock data instead of performing real network operations
   */
  fetch(): Promise<NetInfoState> {
    console.log('[NetInfo Mock] Fetching network state:', currentState.type);
    return Promise.resolve({ ...currentState });
  },

  /**
   * Add network state change listener
   * Provides controlled state changes for testing
   */
  addEventListener(listener: (state: NetInfoState) => void): () => void {
    console.log('[NetInfo Mock] Adding network state listener');
    listeners.push(listener);
    
    // Immediately call listener with current state
    setTimeout(() => listener({ ...currentState }), 0);
    
    // Return unsubscribe function
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
        console.log('[NetInfo Mock] Removed network state listener');
      }
    };
  },

  /**
   * Configure NetInfo behavior (mock implementation)
   */
  configure(configuration: NetInfoConfiguration): void {
    console.log('[NetInfo Mock] Configuring with options:', configuration);
    mockConfiguration = { ...mockConfiguration, ...configuration };
    isConfigured = true;
  },

  /**
   * Get current configuration (mock implementation)
   */
  getConfiguration(): NetInfoConfiguration {
    return { ...mockConfiguration };
  },

  /**
   * Refresh network state (mock implementation)
   */
  refresh(): Promise<NetInfoState> {
    console.log('[NetInfo Mock] Refreshing network state');
    return this.fetch();
  },
};

// Test utilities for controlling mock behavior
export const NetInfoMockUtils = {
  /**
   * Set the current mock network state
   */
  setNetworkState(stateKey: keyof typeof MOCK_NETWORK_STATES | NetInfoState): void {
    const newState = typeof stateKey === 'string' 
      ? MOCK_NETWORK_STATES[stateKey] 
      : stateKey;
    
    if (!newState) {
      console.warn('[NetInfo Mock] Invalid state key:', stateKey);
      return;
    }

    console.log('[NetInfo Mock] Changing network state from', currentState.type, 'to', newState.type);
    currentState = { ...newState };
    
    // Notify all listeners of the state change
    listeners.forEach(listener => {
      try {
        listener({ ...currentState });
      } catch (error) {
        console.warn('[NetInfo Mock] Error in listener:', error);
      }
    });
  },

  /**
   * Simulate network disconnection
   */
  simulateDisconnection(): void {
    this.setNetworkState('none');
  },

  /**
   * Simulate network reconnection to WiFi
   */
  simulateWiFiConnection(): void {
    this.setNetworkState('wifi_connected');
  },

  /**
   * Simulate cellular connection
   */
  simulateCellularConnection(): void {
    this.setNetworkState('cellular');
  },

  /**
   * Get current mock state
   */
  getCurrentState(): NetInfoState {
    return { ...currentState };
  },

  /**
   * Reset to default state
   */
  reset(): void {
    console.log('[NetInfo Mock] Resetting to default state');
    currentState = MOCK_NETWORK_STATES.wifi_connected;
    listeners = [];
    isConfigured = false;
    mockConfiguration = {};
  },

  /**
   * Get available mock states
   */
  getAvailableStates(): typeof MOCK_NETWORK_STATES {
    return MOCK_NETWORK_STATES;
  },

  /**
   * Check if mock is configured
   */
  isConfigured(): boolean {
    return isConfigured;
  },

  /**
   * Simulate signal strength change
   */
  simulateSignalStrengthChange(strength: number): void {
    if (currentState.details) {
      currentState.details.strength = strength;
      listeners.forEach(listener => listener({ ...currentState }));
    }
  },

  /**
   * Simulate SSID change (for WiFi testing)
   */
  simulateSSIDChange(ssid: string): void {
    if (currentState.type === 'wifi' && currentState.details) {
      currentState.details.ssid = ssid;
      listeners.forEach(listener => listener({ ...currentState }));
    }
  },
};

// Export the mock as default
export default NetInfo;

// Additional named exports for compatibility
export const { fetch, addEventListener, configure } = NetInfo;

// Type exports for TypeScript compatibility
export type { NetInfoState, NetInfoConfiguration };
