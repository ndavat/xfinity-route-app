/**
 * Logger Module Index
 * Main entry point for the logging system
 */

// Main Logger class and convenience functions
export { default as Logger, debug, info, warn, error, fatal, logEvent } from './logging/Logger';

// Types and interfaces
export * from './logging/LoggerTypes';

// Configuration management
export { LoggerConfigManager } from './logging/LoggerConfig';

// File management
export { LoggerFileManager } from './logging/LoggerFileManager';

// Permission management
export { LoggerPermissionManager } from './logging/LoggerPermissionManager';

// Data sanitization
export { LoggerDataSanitizer } from './logging/LoggerDataSanitizer';

// Performance monitoring
export { LoggerPerformanceMonitor } from './logging/LoggerPerformanceMonitor';

// Utility functions
export * from './LoggerUtils';

// React components
export { default as LoggerManager } from '../components/LoggerManager';

// Quick start functions
export {
  initializeLogger,
  initializeProductionLogger,
  initializeDevelopmentLogger,
  initializeLoggerWithNetworking,
  initializeLoggerWithCustomFilters,
  initializeTestLogger
} from './LoggerUtils';
