/**
 * Logging Types and Interfaces
 * Comprehensive type definitions for the mobile application logging system
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  thread: string;
  source: string;
  message: string;
  metadata?: Record<string, any>;
  error?: Error;
  sessionId: string;
}

export interface LoggerConfig {
  logLevel: LogLevel;
  maxFileSize: number; // in bytes
  maxFiles: number;
  enableCrashReporting: boolean;
  requestPermissions: boolean;
  enableConsoleOutput: boolean;
  bufferSize: number;
  flushInterval: number; // in milliseconds
  enableEncryption: boolean;
  logDirectory?: string;
  filePrefix: string;
  enableNetworkLogging: boolean;
  sensitiveDataFilters: string[];
}

export interface LoggerPermissions {
  storagePermission: boolean;
  mediaLibraryPermission: boolean;
}

export interface LogFileInfo {
  fileName: string;
  filePath: string;
  size: number;
  createdAt: Date;
  modifiedAt: Date;
}

export interface LoggerStats {
  totalLogEntries: number;
  currentFileSize: number;
  filesCreated: number;
  errorsLogged: number;
  warningsLogged: number;
  sessionStartTime: Date;
  memoryUsage: number;
}

export interface LogFilter {
  levels?: LogLevel[];
  sources?: string[];
  timeRange?: {
    start: Date;
    end: Date;
  };
  searchTerm?: string;
}

export interface ExportOptions {
  format: 'txt' | 'json' | 'csv';
  includeMetadata: boolean;
  filter?: LogFilter;
  compress: boolean;
}

// Network logging types
export interface NetworkLogEntry {
  url: string;
  method: string;
  statusCode?: number;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: any;
  responseBody?: any;
  duration: number;
  error?: string;
}

// Performance metrics types
export interface PerformanceMetrics {
  cpuUsage?: number;
  memoryUsage: number;
  diskUsage?: number;
  networkLatency?: number;
  renderTime?: number;
  appStartTime?: number;
}

// Crash report types
export interface CrashReport {
  crashId: string;
  timestamp: string;
  stackTrace: string;
  deviceInfo: DeviceInfo;
  appVersion: string;
  osVersion: string;
  freeMemory: number;
  totalMemory: number;
  batteryLevel?: number;
  networkStatus: string;
  logs: LogEntry[];
}

export interface DeviceInfo {
  platform: string;
  model: string;
  osVersion: string;
  appVersion: string;
  buildNumber: string;
  deviceId: string;
  locale: string;
  timezone: string;
  screenResolution: string;
  availableStorage: number;
  totalStorage: number;
}

// Event types for lifecycle tracking
export type AppLifecycleEvent = 
  | 'app_start'
  | 'app_background'
  | 'app_foreground'
  | 'app_terminate'
  | 'memory_warning'
  | 'network_change'
  | 'user_login'
  | 'user_logout'
  | 'crash'
  | 'error'
  | 'api_call'
  | 'navigation'
  | 'user_interaction';

export interface LoggerEventData {
  event: AppLifecycleEvent;
  data?: Record<string, any>;
  source?: string;
}
