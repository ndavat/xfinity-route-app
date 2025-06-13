/**
 * Configuration utility for handling environment variables
 * Provides centralized access to all app configuration settings
 */

// Helper function to get environment variable with fallback
const getEnvVar = (key: string, fallback: string): string => {
  const value = process.env[key];
  return value !== undefined ? value : fallback;
};

// Helper function to get boolean environment variable
const getEnvBoolean = (key: string, fallback: boolean): boolean => {
  const value = process.env[key];
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true';
};

// Helper function to get number environment variable
const getEnvNumber = (key: string, fallback: number): number => {
  const value = process.env[key];
  if (value === undefined) return fallback;
  const num = parseInt(value, 10);
  return isNaN(num) ? fallback : num;
};

/**
 * App Configuration Object
 * Contains all configuration settings with environment variable fallbacks
 */
export const Config = {
  // Router Configuration
  router: {
    defaultIp: getEnvVar('EXPO_PUBLIC_DEFAULT_ROUTER_IP', '10.0.0.1'),
    defaultUsername: getEnvVar('EXPO_PUBLIC_DEFAULT_USERNAME', 'admin'),
    defaultPassword: getEnvVar('EXPO_PUBLIC_DEFAULT_PASSWORD', 'password1'),
    enableHttps: getEnvBoolean('EXPO_PUBLIC_ROUTER_ENABLE_HTTPS', false)
  },

  // API Configuration
  api: {
    timeout: getEnvNumber('EXPO_PUBLIC_API_TIMEOUT', 15000),
    connectionTimeout: getEnvNumber('EXPO_PUBLIC_CONNECTION_TIMEOUT', 5000),
    maxRetryAttempts: getEnvNumber('EXPO_PUBLIC_MAX_RETRY_ATTEMPTS', 3),
    retryDelay: getEnvNumber('EXPO_PUBLIC_RETRY_DELAY', 1000)
  },

  // App Configuration
  app: {
    name: getEnvVar('EXPO_PUBLIC_APP_NAME', 'Xfinity Router App'),
    version: getEnvVar('EXPO_PUBLIC_APP_VERSION', '1.0.0'),
    debugMode: getEnvBoolean('EXPO_PUBLIC_DEBUG_MODE', false),
    // Force mock mode to always be false
    mockDataMode: false,
    forceRealMode: getEnvBoolean('EXPO_PUBLIC_FORCE_REAL_MODE', true)
  },

  // Development Settings
  development: {
    enableDiagnostics: getEnvBoolean('EXPO_PUBLIC_ENABLE_DIAGNOSTICS', true),
    enableAdvancedSettings: getEnvBoolean('EXPO_PUBLIC_ENABLE_ADVANCED_SETTINGS', false)
  },

  // Storage Keys
  storage: {
    routerConfigKey: getEnvVar('EXPO_PUBLIC_ROUTER_CONFIG_KEY', 'xfinity_router_config'),
    deviceNamesKey: getEnvVar('EXPO_PUBLIC_DEVICE_NAMES_KEY', 'xfinity_device_names')
  },

  // Supabase Configuration (if used)
  supabase: {
    url: getEnvVar('EXPO_PUBLIC_SUPABASE_URL', ''),
    anonKey: getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY', '')
  }
};

/**
 * Utility functions for configuration
 */
export const ConfigUtils = {
  /**
   * Check if we're in development mode
   */
  isDevelopment: () => {
    return __DEV__ || Config.app.debugMode;
  },

  /**
   * Check if diagnostics are enabled
   */
  isDiagnosticsEnabled: () => {
    return Config.development.enableDiagnostics;
  },

  /**
   * Check if mock data mode is enabled
   */
  isMockDataMode: () => {
    return Config.app.mockDataMode;
  },

  /**
   * Get the default router configuration
   */
  getDefaultRouterConfig: () => ({
    ip: Config.router.defaultIp,
    username: Config.router.defaultUsername,
    password: Config.router.defaultPassword,
    useHttps: Config.router.enableHttps
  }),

  /**
   * Get API configuration for axios
   */
  getApiConfig: () => ({
    timeout: Config.api.timeout,
    maxRetries: Config.api.maxRetryAttempts,
    retryDelay: Config.api.retryDelay
  }),

  /**
   * Validate required environment variables
   */
  validateConfig: () => {
    const errors: string[] = [];

    // Check for required Supabase config if it's being used
    if (Config.supabase.url && !Config.supabase.anonKey) {
      errors.push('EXPO_PUBLIC_SUPABASE_ANON_KEY is required when EXPO_PUBLIC_SUPABASE_URL is set');
    }

    // Validate router IP format
    const ipRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    if (!ipRegex.test(Config.router.defaultIp)) {
      errors.push(`Invalid router IP format: ${Config.router.defaultIp}`);
    }

    if (errors.length > 0) {
      console.warn('Configuration validation errors:', errors);
    }

    return errors.length === 0;
  }
};

// Validate configuration on load
if (ConfigUtils.isDevelopment()) {
  ConfigUtils.validateConfig();
}

export default Config;
