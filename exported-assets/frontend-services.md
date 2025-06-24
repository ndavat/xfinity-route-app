# Enhanced Services - Secure Storage and Biometric Authentication

## services/secureStorage.ts

```typescript
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RouterCredentials, UserPreferences, AppMode } from '../types/Device';

const STORAGE_KEYS = {
  ROUTER_CREDENTIALS: process.env.EXPO_PUBLIC_ROUTER_CONFIG_KEY || 'xfinity_router_config_secure',
  USER_PREFERENCES: process.env.EXPO_PUBLIC_USER_PREFERENCES_KEY || 'xfinity_user_preferences',
  DEVICE_NAMES: process.env.EXPO_PUBLIC_DEVICE_NAMES_KEY || 'xfinity_device_names',
  APP_MODE: 'xfinity_app_mode',
  BIOMETRIC_ENABLED: 'xfinity_biometric_enabled',
  PIN_HASH: 'xfinity_pin_hash'
};

class SecureStorageService {
  /**
   * Store router credentials securely
   */
  async storeRouterCredentials(credentials: RouterCredentials): Promise<void> {
    try {
      const credentialsData = {
        ...credentials,
        lastConnected: new Date().toISOString()
      };
      
      await SecureStore.setItemAsync(
        STORAGE_KEYS.ROUTER_CREDENTIALS,
        JSON.stringify(credentialsData),
        {
          requireAuthentication: true,
          authenticationPrompt: 'Authenticate to save router credentials'
        }
      );
      
      console.log('Router credentials stored securely');
    } catch (error) {
      console.error('Failed to store router credentials:', error);
      throw new Error('Failed to save credentials securely');
    }
  }

  /**
   * Retrieve router credentials securely
   */
  async getRouterCredentials(): Promise<RouterCredentials | null> {
    try {
      const credentialsJson = await SecureStore.getItemAsync(
        STORAGE_KEYS.ROUTER_CREDENTIALS,
        {
          requireAuthentication: true,
          authenticationPrompt: 'Authenticate to access router credentials'
        }
      );
      
      if (!credentialsJson) return null;
      
      return JSON.parse(credentialsJson);
    } catch (error) {
      console.error('Failed to retrieve router credentials:', error);
      return null;
    }
  }

  /**
   * Store user preferences
   */
  async storeUserPreferences(preferences: UserPreferences): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.USER_PREFERENCES,
        JSON.stringify(preferences)
      );
    } catch (error) {
      console.error('Failed to store user preferences:', error);
      throw new Error('Failed to save preferences');
    }
  }

  /**
   * Retrieve user preferences
   */
  async getUserPreferences(): Promise<UserPreferences | null> {
    try {
      const preferencesJson = await AsyncStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
      if (!preferencesJson) return null;
      
      return JSON.parse(preferencesJson);
    } catch (error) {
      console.error('Failed to retrieve user preferences:', error);
      return null;
    }
  }

  /**
   * Store custom device names
   */
  async storeDeviceNames(deviceNames: Record<string, string>): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.DEVICE_NAMES,
        JSON.stringify(deviceNames)
      );
    } catch (error) {
      console.error('Failed to store device names:', error);
      throw new Error('Failed to save device names');
    }
  }

  /**
   * Retrieve custom device names
   */
  async getDeviceNames(): Promise<Record<string, string>> {
    try {
      const deviceNamesJson = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_NAMES);
      if (!deviceNamesJson) return {};
      
      return JSON.parse(deviceNamesJson);
    } catch (error) {
      console.error('Failed to retrieve device names:', error);
      return {};
    }
  }

  /**
   * Store app mode (Live/Mock)
   */
  async storeAppMode(mode: AppMode): Promise<void> {
    try {
      const modeData = {
        ...mode,
        lastSwitched: new Date().toISOString()
      };
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.APP_MODE,
        JSON.stringify(modeData)
      );
    } catch (error) {
      console.error('Failed to store app mode:', error);
      throw new Error('Failed to save app mode');
    }
  }

  /**
   * Retrieve app mode
   */
  async getAppMode(): Promise<AppMode> {
    try {
      const modeJson = await AsyncStorage.getItem(STORAGE_KEYS.APP_MODE);
      if (!modeJson) {
        // Default to Live Mode as requested
        return {
          isLiveMode: true,
          canToggle: process.env.EXPO_PUBLIC_ENABLE_MOCK_TOGGLE === 'true'
        };
      }
      
      return JSON.parse(modeJson);
    } catch (error) {
      console.error('Failed to retrieve app mode:', error);
      return {
        isLiveMode: true,
        canToggle: true
      };
    }
  }

  /**
   * Clear all stored data
   */
  async clearAllData(): Promise<void> {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(STORAGE_KEYS.ROUTER_CREDENTIALS),
        AsyncStorage.removeItem(STORAGE_KEYS.USER_PREFERENCES),
        AsyncStorage.removeItem(STORAGE_KEYS.DEVICE_NAMES),
        AsyncStorage.removeItem(STORAGE_KEYS.APP_MODE),
        AsyncStorage.removeItem(STORAGE_KEYS.BIOMETRIC_ENABLED),
        SecureStore.deleteItemAsync(STORAGE_KEYS.PIN_HASH)
      ]);
      
      console.log('All stored data cleared');
    } catch (error) {
      console.error('Failed to clear stored data:', error);
      throw new Error('Failed to clear app data');
    }
  }

  /**
   * Store PIN hash securely
   */
  async storePinHash(pinHash: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.PIN_HASH, pinHash);
    } catch (error) {
      console.error('Failed to store PIN hash:', error);
      throw new Error('Failed to save PIN');
    }
  }

  /**
   * Retrieve PIN hash
   */
  async getPinHash(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(STORAGE_KEYS.PIN_HASH);
    } catch (error) {
      console.error('Failed to retrieve PIN hash:', error);
      return null;
    }
  }

  /**
   * Check if biometric authentication is enabled
   */
  async isBiometricEnabled(): Promise<boolean> {
    try {
      const enabled = await AsyncStorage.getItem(STORAGE_KEYS.BIOMETRIC_ENABLED);
      return enabled === 'true';
    } catch (error) {
      console.error('Failed to check biometric status:', error);
      return false;
    }
  }

  /**
   * Set biometric authentication status
   */
  async setBiometricEnabled(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.BIOMETRIC_ENABLED, enabled.toString());
    } catch (error) {
      console.error('Failed to set biometric status:', error);
      throw new Error('Failed to update biometric settings');
    }
  }
}

export default new SecureStorageService();
```

## services/biometricAuth.ts

```typescript
import * as LocalAuthentication from 'expo-local-authentication';
import { Alert } from 'react-native';
import secureStorage from './secureStorage';

export type BiometricType = 'fingerprint' | 'facial' | 'iris' | 'none';

class BiometricAuthService {
  private isInitialized = false;
  private supportedTypes: BiometricType[] = [];

  /**
   * Initialize biometric authentication service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        console.log('Device does not support biometric authentication');
        return;
      }

      const supportedAuthTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      this.supportedTypes = this.mapAuthTypes(supportedAuthTypes);
      
      this.isInitialized = true;
      console.log('Biometric auth initialized. Supported types:', this.supportedTypes);
    } catch (error) {
      console.error('Failed to initialize biometric auth:', error);
    }
  }

  /**
   * Check if biometric authentication is available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    
    return hasHardware && isEnrolled && this.supportedTypes.length > 0;
  }

  /**
   * Get supported biometric types
   */
  getSupportedTypes(): BiometricType[] {
    return this.supportedTypes;
  }

  /**
   * Authenticate user with biometrics
   */
  async authenticate(reason: string = 'Please authenticate to continue'): Promise<boolean> {
    try {
      if (!(await this.isAvailable())) {
        throw new Error('Biometric authentication not available');
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: false
      });

      return result.success;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return false;
    }
  }

  /**
   * Show biometric authentication prompt for app access
   */
  async authenticateForAppAccess(): Promise<boolean> {
    const isEnabled = await secureStorage.isBiometricEnabled();
    if (!isEnabled) return true;

    const isAvailable = await this.isAvailable();
    if (!isAvailable) {
      // Fallback to PIN if biometrics not available
      return this.authenticateWithPin();
    }

    const success = await this.authenticate('Authenticate to access the app');
    if (!success) {
      // Offer PIN fallback
      return this.showFallbackOptions();
    }

    return success;
  }

  /**
   * Show fallback authentication options
   */
  private async showFallbackOptions(): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        'Authentication Failed',
        'Would you like to try using your PIN instead?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false)
          },
          {
            text: 'Use PIN',
            onPress: async () => {
              const pinSuccess = await this.authenticateWithPin();
              resolve(pinSuccess);
            }
          }
        ]
      );
    });
  }

  /**
   * Authenticate with PIN (placeholder - implement PIN logic)
   */
  private async authenticateWithPin(): Promise<boolean> {
    // This would open a PIN input modal
    // For now, return true as placeholder
    console.log('PIN authentication would be implemented here');
    return true;
  }

  /**
   * Enable biometric authentication
   */
  async enableBiometricAuth(): Promise<boolean> {
    try {
      const isAvailable = await this.isAvailable();
      if (!isAvailable) {
        Alert.alert(
          'Biometric Authentication Unavailable',
          'Your device does not support biometric authentication or no biometrics are enrolled.'
        );
        return false;
      }

      const success = await this.authenticate('Authenticate to enable biometric login');
      if (success) {
        await secureStorage.setBiometricEnabled(true);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to enable biometric auth:', error);
      return false;
    }
  }

  /**
   * Disable biometric authentication
   */
  async disableBiometricAuth(): Promise<void> {
    try {
      await secureStorage.setBiometricEnabled(false);
    } catch (error) {
      console.error('Failed to disable biometric auth:', error);
      throw error;
    }
  }

  /**
   * Map Expo auth types to our biometric types
   */
  private mapAuthTypes(authTypes: LocalAuthentication.AuthenticationType[]): BiometricType[] {
    const types: BiometricType[] = [];
    
    authTypes.forEach(type => {
      switch (type) {
        case LocalAuthentication.AuthenticationType.FINGERPRINT:
          types.push('fingerprint');
          break;
        case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
          types.push('facial');
          break;
        case LocalAuthentication.AuthenticationType.IRIS:
          types.push('iris');
          break;
      }
    });

    return types;
  }

  /**
   * Get biometric type display name
   */
  getBiometricDisplayName(): string {
    if (this.supportedTypes.includes('facial')) return 'Face ID';
    if (this.supportedTypes.includes('fingerprint')) return 'Touch ID';
    if (this.supportedTypes.includes('iris')) return 'Iris Scanner';
    return 'Biometric Authentication';
  }
}

export default new BiometricAuthService();
```

## services/routerApi.ts (Enhanced)

```typescript
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { Device, RouterCredentials, BlockSchedule } from '../types/Device';
import secureStorage from './secureStorage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.1.100:3001';
const API_TIMEOUT = parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || '15000');

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

class RouterApiService {
  private client: AxiosInstance;
  private isAuthenticated = false;

  constructor() {
    this.client = axios.create({
      baseURL: `${BACKEND_URL}/api`,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json'
      },
      withCredentials: true // Important for session cookies
    });

    this.setupInterceptors();
  }

  /**
   * Setup axios interceptors for error handling
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        console.log(`API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('Response error:', error.response?.data || error.message);
        
        // Handle authentication errors
        if (error.response?.status === 401) {
          this.isAuthenticated = false;
        }
        
        return Promise.reject(error);
      }
    );
  }

  /**
   * Test connection to router
   */
  async testConnection(routerIP: string): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.post('/auth/test-connection', {
        routerIP
      });
      
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Connection test failed'
      };
    }
  }

  /**
   * Authenticate with router
   */
  async authenticate(credentials: RouterCredentials): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.post('/auth/login', credentials);
      
      if (response.data.success) {
        this.isAuthenticated = true;
        // Store credentials securely
        await secureStorage.storeRouterCredentials(credentials);
      }
      
      return response.data;
    } catch (error: any) {
      this.isAuthenticated = false;
      return {
        success: false,
        error: error.response?.data?.error || 'Authentication failed'
      };
    }
  }

  /**
   * Check authentication status
   */
  async getAuthStatus(): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.get('/auth/status');
      this.isAuthenticated = response.data.authenticated;
      return response.data;
    } catch (error: any) {
      this.isAuthenticated = false;
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to check auth status'
      };
    }
  }

  /**
   * Logout and clear session
   */
  async logout(): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.post('/auth/logout');
      this.isAuthenticated = false;
      return response.data;
    } catch (error: any) {
      this.isAuthenticated = false;
      return {
        success: false,
        error: error.response?.data?.error || 'Logout failed'
      };
    }
  }

  /**
   * Fetch connected devices
   */
  async getDevices(): Promise<ApiResponse<Device[]>> {
    try {
      const response: AxiosResponse<ApiResponse<Device[]>> = await this.client.get('/devices');
      
      // Merge with custom device names
      if (response.data.success && response.data.devices) {
        const deviceNames = await secureStorage.getDeviceNames();
        response.data.devices = response.data.devices.map(device => ({
          ...device,
          customName: deviceNames[device.id] || device.customName
        }));
      }
      
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch devices'
      };
    }
  }

  /**
   * Block a device
   */
  async blockDevice(deviceId: string, duration?: string, schedule?: BlockSchedule): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.post(
        `/devices/${deviceId}/block`,
        { duration, schedule }
      );
      
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to block device'
      };
    }
  }

  /**
   * Unblock a device
   */
  async unblockDevice(deviceId: string): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.post(`/devices/${deviceId}/unblock`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to unblock device'
      };
    }
  }

  /**
   * Rename a device
   */
  async renameDevice(deviceId: string, name: string): Promise<ApiResponse> {
    try {
      // Store locally first
      const deviceNames = await secureStorage.getDeviceNames();
      deviceNames[deviceId] = name;
      await secureStorage.storeDeviceNames(deviceNames);

      // Also send to backend for session storage
      const response: AxiosResponse<ApiResponse> = await this.client.put(
        `/devices/${deviceId}/rename`,
        { name }
      );
      
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to rename device'
      };
    }
  }

  /**
   * Reboot router
   */
  async rebootRouter(): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.post('/router/reboot');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to reboot router'
      };
    }
  }

  /**
   * Get router status
   */
  async getRouterStatus(): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.get('/router/status');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to get router status'
      };
    }
  }

  /**
   * Check if authenticated
   */
  get authenticated(): boolean {
    return this.isAuthenticated;
  }
}

export default new RouterApiService();
```