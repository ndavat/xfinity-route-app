import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Type definitions
interface NetworkState {
  isConnected: boolean;
  type: string;
  isWifiEnabled?: boolean;
  details?: {
    ssid?: string;
    bssid?: string;
    strength?: number;
    ipAddress?: string;
    subnet?: string;
    [key: string]: any;
  };
  timestamp: string;
}

interface NetworkLog {
  event: string;
  previousState?: NetworkState;
  currentState: NetworkState;
  timestamp: string;
}

// Network monitoring state
let isMonitoring = false;
let unsubscribeNetInfo: (() => void) | null = null;
let networkLogs: NetworkLog[] = [];
let currentNetworkState: NetworkState | null = null;
let networkChangeCallback: ((state: NetworkState) => void) | null = null;

// Storage keys
const NETWORK_STATE_KEY = 'network_state';
const NETWORK_LOGS_KEY = 'network_logs';

/**
 * Start monitoring network changes
 */
export const startMonitoring = async (): Promise<void> => {
  if (isMonitoring) {
    console.log('Network monitoring already active');
    return;
  }

  try {
    console.log('🔍 Starting network monitoring...');
    
    // Subscribe to network state changes
    unsubscribeNetInfo = NetInfo.addEventListener(handleNetworkChange);
    
    // Get initial network state
    const initialState = await NetInfo.fetch();
    await handleNetworkChange(initialState);
    
    isMonitoring = true;
    console.log('✓ Network monitoring started successfully');
    
  } catch (error) {
    console.error('Failed to start network monitoring:', error);
    throw error;
  }
};

/**
 * Stop monitoring network changes
 */
export const stopMonitoring = (): void => {
  if (!isMonitoring) {
    console.log('Network monitoring not active');
    return;
  }

  try {
    console.log('🛑 Stopping network monitoring...');
    
    // Unsubscribe from network state changes
    if (unsubscribeNetInfo) {
      unsubscribeNetInfo();
      unsubscribeNetInfo = null;
    }
    
    isMonitoring = false;
    console.log('✓ Network monitoring stopped');
    
  } catch (error) {
    console.error('Failed to stop network monitoring:', error);
  }
};

/**
 * Handle network state changes
 */
const handleNetworkChange = async (state: any): Promise<void> => {
  try {
    const networkState: NetworkState = {
      isConnected: state.isConnected ?? false,
      type: state.type ?? 'unknown',
      isWifiEnabled: state.isWifiEnabled,
      details: state.details || {},
      timestamp: new Date().toISOString(),
    };

    // Log the network change
    const logEntry: NetworkLog = {
      event: 'network_state_change',
      previousState: currentNetworkState || undefined,
      currentState: networkState,
      timestamp: new Date().toISOString(),
    };

    // Update current state
    currentNetworkState = networkState;
    
    // Add to logs
    networkLogs.push(logEntry);
    
    // Keep only last 50 logs to prevent memory issues
    if (networkLogs.length > 50) {
      networkLogs = networkLogs.slice(-50);
    }

    // Store state and logs
    await storeNetworkState(networkState);
    await storeNetworkLogs(networkLogs);

    // Call callback if registered
    if (networkChangeCallback) {
      networkChangeCallback(networkState);
    }

    // Log important changes
    if (logEntry.previousState) {
      const wasConnected = logEntry.previousState.isConnected;
      const isNowConnected = networkState.isConnected;
      
      if (wasConnected !== isNowConnected) {
        console.log(
          `📡 Network connectivity changed: ${wasConnected ? 'Connected' : 'Disconnected'} → ${isNowConnected ? 'Connected' : 'Disconnected'}`
        );
      }
      
      if (logEntry.previousState.type !== networkState.type) {
        console.log(
          `📡 Network type changed: ${logEntry.previousState.type} → ${networkState.type}`
        );
      }
    } else {
      console.log(`📡 Initial network state: ${networkState.isConnected ? 'Connected' : 'Disconnected'} (${networkState.type})`);
    }

  } catch (error) {
    console.error('Failed to handle network change:', error);
  }
};

/**
 * Store network state to AsyncStorage
 */
const storeNetworkState = async (state: NetworkState): Promise<void> => {
  try {
    await AsyncStorage.setItem(NETWORK_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to store network state:', error);
  }
};

/**
 * Store network logs to AsyncStorage
 */
const storeNetworkLogs = async (logs: NetworkLog[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(NETWORK_LOGS_KEY, JSON.stringify(logs));
  } catch (error) {
    console.error('Failed to store network logs:', error);
  }
};

/**
 * Get current network state
 */
export const getCurrentNetworkState = (): NetworkState | null => {
  return currentNetworkState;
};

/**
 * Get stored network state from AsyncStorage
 */
export const getStoredNetworkState = async (): Promise<NetworkState | null> => {
  try {
    const storedState = await AsyncStorage.getItem(NETWORK_STATE_KEY);
    return storedState ? JSON.parse(storedState) : null;
  } catch (error) {
    console.error('Failed to get stored network state:', error);
    return null;
  }
};

/**
 * Get network logs
 */
export const getNetworkLogs = (): NetworkLog[] => {
  return [...networkLogs];
};

/**
 * Get stored network logs from AsyncStorage
 */
export const getStoredNetworkLogs = async (): Promise<NetworkLog[]> => {
  try {
    const storedLogs = await AsyncStorage.getItem(NETWORK_LOGS_KEY);
    return storedLogs ? JSON.parse(storedLogs) : [];
  } catch (error) {
    console.error('Failed to get stored network logs:', error);
    return [];
  }
};

/**
 * Clear network logs
 */
export const clearNetworkLogs = async (): Promise<void> => {
  try {
    networkLogs = [];
    await AsyncStorage.removeItem(NETWORK_LOGS_KEY);
    console.log('Network logs cleared');
  } catch (error) {
    console.error('Failed to clear network logs:', error);
  }
};

/**
 * Register callback for network state changes
 */
export const onNetworkChange = (callback: (state: NetworkState) => void): void => {
  networkChangeCallback = callback;
};

/**
 * Unregister network change callback
 */
export const offNetworkChange = (): void => {
  networkChangeCallback = null;
};

/**
 * Check if device is connected to WiFi
 */
export const isConnectedToWifi = (): boolean => {
  return currentNetworkState?.type === 'wifi' && currentNetworkState?.isConnected === true;
};

/**
 * Check if device is connected to cellular
 */
export const isConnectedToCellular = (): boolean => {
  return currentNetworkState?.type === 'cellular' && currentNetworkState?.isConnected === true;
};

/**
 * Get WiFi details if connected
 */
export const getWifiDetails = (): NetworkState['details'] | null => {
  if (isConnectedToWifi()) {
    return currentNetworkState?.details || null;
  }
  return null;
};

/**
 * Force refresh network state
 */
export const refreshNetworkState = async (): Promise<NetworkState | null> => {
  try {
    const state = await NetInfo.fetch();
    await handleNetworkChange(state);
    return currentNetworkState;
  } catch (error) {
    console.error('Failed to refresh network state:', error);
    return null;
  }
};

/**
 * Get monitoring status
 */
export const isNetworkMonitoringActive = (): boolean => {
  return isMonitoring;
};

/**
 * Export network monitoring utilities
 */
export default {
  startMonitoring,
  stopMonitoring,
  getCurrentNetworkState,
  getStoredNetworkState,
  getNetworkLogs,
  getStoredNetworkLogs,
  clearNetworkLogs,
  onNetworkChange,
  offNetworkChange,
  isConnectedToWifi,
  isConnectedToCellular,
  getWifiDetails,
  refreshNetworkState,
  isNetworkMonitoringActive,
};
