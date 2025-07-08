/**
 * Logger Initialization Utility
 * Simple utility to initialize the logger with sensible defaults
 */

import Logger from './logging/Logger';
import { LogLevel, LoggerConfig } from './logging/LoggerTypes';
import { Platform } from 'react-native';

/**
 * Initialize logger with default configuration for mobile app
 */
export async function initializeLogger(customConfig?: Partial<LoggerConfig>): Promise<Logger> {
  const defaultConfig: Partial<LoggerConfig> = {
    logLevel: __DEV__ ? LogLevel.DEBUG : LogLevel.INFO,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    enableCrashReporting: true,
    requestPermissions: true,
    enableConsoleOutput: __DEV__,
    bufferSize: 50,
    flushInterval: 5000, // 5 seconds
    enableEncryption: false,
    filePrefix: 'xfinity_app_log',
    enableNetworkLogging: __DEV__,
    sensitiveDataFilters: [
      'password',
      'token',
      'api_key',
      'secret',
      'auth',
      'credential',
      'ssn',
      'credit_card'
    ]
  };

  const finalConfig = { ...defaultConfig, ...customConfig };

  try {
    const logger = await Logger.initialize(finalConfig);
    
    // Log initialization success
    logger.info('Logger initialized successfully', {
      platform: Platform.OS,
      version: Platform.Version,
      isDev: __DEV__,
      config: {
        logLevel: LogLevel[finalConfig.logLevel || LogLevel.INFO],
        maxFileSize: finalConfig.maxFileSize,
        maxFiles: finalConfig.maxFiles,
        enableCrashReporting: finalConfig.enableCrashReporting,
        enableNetworkLogging: finalConfig.enableNetworkLogging
      }
    });

    return logger;
  } catch (error) {
    console.error('Failed to initialize logger:', error);
    throw error;
  }
}

/**
 * Quick setup for production environment
 */
export async function initializeProductionLogger(): Promise<Logger> {
  return initializeLogger({
    logLevel: LogLevel.WARN, // Only warnings and errors in production
    enableConsoleOutput: false,
    enableNetworkLogging: false,
    maxFileSize: 5 * 1024 * 1024, // 5MB for production
    maxFiles: 3,
    flushInterval: 10000 // 10 seconds
  });
}

/**
 * Quick setup for development environment
 */
export async function initializeDevelopmentLogger(): Promise<Logger> {
  return initializeLogger({
    logLevel: LogLevel.DEBUG,
    enableConsoleOutput: true,
    enableNetworkLogging: true,
    maxFileSize: 50 * 1024 * 1024, // 50MB for development
    maxFiles: 10,
    flushInterval: 2000 // 2 seconds
  });
}

/**
 * Setup logger with network request/response logging
 */
export async function initializeLoggerWithNetworking(): Promise<Logger> {
  const logger = await initializeLogger({
    enableNetworkLogging: true
  });

  // You can add axios interceptors here to automatically log network requests
  // Example:
  /*
  import axios from 'axios';
  
  axios.interceptors.request.use(
    (config) => {
      logger.logNetworkActivity({
        url: config.url || '',
        method: config.method?.toUpperCase() || 'GET',
        requestHeaders: config.headers,
        requestBody: config.data,
        duration: 0
      });
      return config;
    },
    (error) => {
      logger.error('Network request failed', error);
      return Promise.reject(error);
    }
  );

  axios.interceptors.response.use(
    (response) => {
      logger.logNetworkActivity({
        url: response.config.url || '',
        method: response.config.method?.toUpperCase() || 'GET',
        statusCode: response.status,
        responseHeaders: response.headers,
        responseBody: response.data,
        duration: 0 // You'd need to calculate this
      });
      return response;
    },
    (error) => {
      logger.logNetworkActivity({
        url: error.config?.url || '',
        method: error.config?.method?.toUpperCase() || 'GET',
        statusCode: error.response?.status,
        error: error.message,
        duration: 0
      });
      return Promise.reject(error);
    }
  );
  */

  return logger;
}

/**
 * Create logger with custom sensitive data filters
 */
export async function initializeLoggerWithCustomFilters(
  additionalFilters: string[]
): Promise<Logger> {
  return initializeLogger({
    sensitiveDataFilters: [
      'password',
      'token',
      'api_key',
      'secret',
      'auth',
      'credential',
      'ssn',
      'credit_card',
      ...additionalFilters
    ]
  });
}

/**
 * Initialize logger for testing environment
 */
export async function initializeTestLogger(): Promise<Logger> {
  return initializeLogger({
    logLevel: LogLevel.ERROR, // Only errors in tests
    enableConsoleOutput: false,
    enableNetworkLogging: false,
    requestPermissions: false,
    maxFileSize: 1024 * 1024, // 1MB
    maxFiles: 1,
    enableCrashReporting: false
  });
}
