/**
 * Main Logger Class
 * Comprehensive logging system for mobile applications
 * Handles all logging operations, file management, permissions, and performance monitoring
 */

import { Platform, AppState, AppStateStatus } from 'react-native';
import { LogLevel, LogEntry, LoggerConfig, AppLifecycleEvent, LoggerEventData, NetworkLogEntry, CrashReport, DeviceInfo, ExportOptions } from './LoggerTypes';
import { LoggerConfigManager } from './LoggerConfig';
import { LoggerFileManager } from './LoggerFileManager';
import { LoggerPermissionManager } from './LoggerPermissionManager';
import { LoggerDataSanitizer } from './LoggerDataSanitizer';
import { LoggerPerformanceMonitor } from './LoggerPerformanceMonitor';
import { SentryTransport } from './SentryTransport';
import { getAppInfo } from '../../utils/appInfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class Logger {
  private static instance: Logger | null = null;
  
  private configManager: LoggerConfigManager;
  private fileManager: LoggerFileManager;
  private permissionManager: LoggerPermissionManager;
  private dataSanitizer: LoggerDataSanitizer;
  private performanceMonitor: LoggerPerformanceMonitor;
  
  private isInitialized: boolean = false;
  private sessionId: string = '';
  private logBuffer: LogEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private appStateSubscription: any = null;
  
  // Thread identifier for logging
  private threadId: string = 'main';
  
  private constructor() {
    this.configManager = new LoggerConfigManager();
    this.fileManager = new LoggerFileManager();
    this.permissionManager = new LoggerPermissionManager();
    this.dataSanitizer = new LoggerDataSanitizer(this.configManager.getConfig());
    this.performanceMonitor = new LoggerPerformanceMonitor();
    
    // Generate session ID
    this.sessionId = this.generateSessionId();
    
    // Set up uncaught exception handler
    this.setupCrashHandler();
  }

  /**
   * Get singleton instance of Logger
   */
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Initialize the logger with configuration
   */
  public static async initialize(config?: Partial<LoggerConfig>): Promise<Logger> {
    const logger = Logger.getInstance();
    await logger.init(config);
    return logger;
  }

  /**
   * Internal initialization method
   */
  private async init(config?: Partial<LoggerConfig>): Promise<void> {
    if (this.isInitialized) {
      console.warn('Logger already initialized');
      return;
    }

    try {
      // Initialize configuration
      const finalConfig = await this.configManager.initialize(config);
      
      // Update sanitizer with new config
      this.dataSanitizer = new LoggerDataSanitizer(finalConfig);
      
      // Initialize permissions if requested
      if (finalConfig.requestPermissions) {
        await this.permissionManager.initializePermissions(true);
      }
      
      // Initialize file manager
      const logDirectory = this.permissionManager.getRecommendedStorageLocation();
      this.fileManager = new LoggerFileManager(
        logDirectory,
        finalConfig.filePrefix,
        finalConfig.maxFileSize,
        finalConfig.maxFiles
      );
      await this.fileManager.initialize();
      
      // Initialize performance monitor
      await this.performanceMonitor.initialize();
      
      // Start buffer flush timer
      this.startFlushTimer();
      
      // Set up app lifecycle monitoring
      this.setupAppLifecycleMonitoring();
      
      this.isInitialized = true;
      
      // Log initialization
      await this.logAppStart();
      
      this.info('Logger initialized successfully', {
        sessionId: this.sessionId,
        config: this.sanitizeConfig(finalConfig)
      });
      
    } catch (error) {
      console.error('Failed to initialize logger:', error);
      throw new Error(`Logger initialization failed: ${error}`);
    }
  }

  /**
   * Log debug message
   */
  public debug(message: string, metadata?: Record<string, any>, source?: string): void {
    this.log(LogLevel.DEBUG, message, metadata, source);
  }

  /**
   * Log info message
   */
  public info(message: string, metadata?: Record<string, any>, source?: string): void {
    this.log(LogLevel.INFO, message, metadata, source);
  }

  /**
   * Log warning message
   */
  public warn(message: string, metadata?: Record<string, any>, source?: string): void {
    this.log(LogLevel.WARN, message, metadata, source);
  }

  /**
   * Log error message
   */
  public error(message: string, error?: Error | any, metadata?: Record<string, any>, source?: string): void {
    const enhancedMetadata = {
      ...metadata,
      error: error ? this.dataSanitizer.sanitizeError(error) : undefined
    };
    this.log(LogLevel.ERROR, message, enhancedMetadata, source);
  }

  /**
   * Log fatal error message
   */
  public fatal(message: string, error?: Error | any, metadata?: Record<string, any>, source?: string): void {
    const enhancedMetadata = {
      ...metadata,
      error: error ? this.dataSanitizer.sanitizeError(error) : undefined
    };
    this.log(LogLevel.FATAL, message, enhancedMetadata, source);
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, metadata?: Record<string, any>, source?: string): void {
    if (!this.configManager.shouldLog(level)) {
      return;
    }

    try {
      const logEntry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        thread: this.threadId,
        source: source || this.getCallerInfo(),
        message: this.dataSanitizer.sanitizeMessage(message),
        metadata: metadata ? this.dataSanitizer.sanitizeObject(metadata) : undefined,
        sessionId: this.sessionId
      };

      // Add to buffer
      this.logBuffer.push(logEntry);

      // Console output if enabled
      if (this.configManager.isConsoleOutputEnabled()) {
        this.outputToConsole(logEntry);
      }

      // Record performance metrics
      const entrySize = JSON.stringify(logEntry).length;
      this.performanceMonitor.recordLogEntry(LogLevel[level], entrySize);

      // Immediate flush for high-priority logs or if buffer is full
      if (level >= LogLevel.ERROR || this.logBuffer.length >= this.configManager.getBufferSize()) {
        this.flushBuffer();
      }

      // Send to Sentry
      SentryTransport.log(logEntry);

    } catch (error) {
      console.error('Failed to log message:', error);
    }
  }

  /**
   * Log application lifecycle events
   */
  public logEvent(event: AppLifecycleEvent, data?: Record<string, any>, source?: string): void {
    const eventData: LoggerEventData = {
      event,
      data: data ? this.dataSanitizer.sanitizeObject(data) : undefined,
      source
    };

    this.info(`App Event: ${event}`, eventData, source || 'LifecycleMonitor');
  }

  /**
   * Log network request/response
   */
  public logNetworkActivity(networkData: NetworkLogEntry): void {
    if (!this.configManager.isNetworkLoggingEnabled()) {
      return;
    }

    const sanitizedData = this.dataSanitizer.sanitizeHttpData(networkData);
    this.debug('Network Activity', sanitizedData, 'NetworkLogger');
  }

  /**
   * Flush log buffer to file
   */
  public async flushBuffer(): Promise<void> {
    if (this.logBuffer.length === 0 || !this.isInitialized) {
      return;
    }

    const entries = [...this.logBuffer];
    this.logBuffer = [];

    try {
      for (const entry of entries) {
        const logLine = this.formatLogEntry(entry);
        await this.fileManager.writeLogEntry(logLine);
      }
    } catch (error) {
      console.error('Failed to flush log buffer:', error);
      // Put entries back in buffer for retry
      this.logBuffer = [...entries, ...this.logBuffer];
    }
  }

  /**
   * Export logs with options
   */
  public async exportLogs(options?: ExportOptions): Promise<string> {
    await this.flushBuffer();
    return await this.fileManager.exportLogs(options);
  }

  /**
   * Share current log file
   */
  public async shareCurrentLogFile(): Promise<void> {
    await this.flushBuffer();
    const currentFile = this.fileManager.getCurrentLogFile();
    if (currentFile) {
      await this.fileManager.shareLogFile(currentFile);
    } else {
      throw new Error('No current log file to share');
    }
  }

  /**
   * Get current log file path
   */
  public getCurrentLogFile(): string | null {
    return this.fileManager.getCurrentLogFile();
  }

  /**
   * Clear all log files
   */
  public async clearOldLogs(): Promise<void> {
    await this.fileManager.cleanupOldFiles();
  }

  /**
   * Clear all logs (including current)
   */
  public async clearAllLogs(): Promise<void> {
    await this.fileManager.clearAllLogs();
    this.performanceMonitor.resetStats();
    this.info('All logs cleared', { sessionId: this.sessionId });
  }

  /**
   * Get logger statistics
   */
  public getStats(): any {
    return {
      performance: this.performanceMonitor.getStats(),
      permissions: this.permissionManager.getPermissions(),
      config: this.sanitizeConfig(this.configManager.getConfig()),
      sessionId: this.sessionId,
      bufferSize: this.logBuffer.length,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Update logger configuration
   */
  public async updateConfig(updates: Partial<LoggerConfig>): Promise<void> {
    await this.configManager.updateConfig(updates);
    
    // Update sanitizer with new config
    this.dataSanitizer = new LoggerDataSanitizer(this.configManager.getConfig());
    
    // Restart flush timer if interval changed
    if (updates.flushInterval) {
      this.stopFlushTimer();
      this.startFlushTimer();
    }
    
    this.info('Logger configuration updated', { updates });
  }

  /**
   * Set log level at runtime
   */
  public async setLogLevel(level: LogLevel): Promise<void> {
    await this.configManager.setLogLevel(level);
    this.info(`Log level changed to ${LogLevel[level]}`, { level });
  }

  /**
   * Set user information for logging
   */
  public setUser(user: { id?: string; username?: string; email?: string; [key: string]: any } | null): void {
    SentryTransport.setUser(user);
  }

  /**
   * Get performance analysis
   */
  public getPerformanceAnalysis(): any {
    return this.performanceMonitor.analyzePerformance();
  }

  /**
   * Generate crash report
   */
  private async generateCrashReport(error: Error): Promise<CrashReport> {
    const deviceInfo = await this.getDeviceInfo();
    
    return {
      crashId: this.generateId(),
      timestamp: new Date().toISOString(),
      stackTrace: error.stack || 'No stack trace available',
      deviceInfo,
      appVersion: deviceInfo.appVersion,
      osVersion: deviceInfo.osVersion,
      freeMemory: 0, // Would need native module for accurate memory info
      totalMemory: 0,
      batteryLevel: 0, // Would need native module for battery info
      networkStatus: 'unknown',
      logs: this.logBuffer.slice(-50) // Last 50 log entries
    };
  }

  /**
   * Set up crash handler for uncaught exceptions
   */
  private setupCrashHandler(): void {
    if (this.configManager.isCrashReportingEnabled()) {
      const originalHandler = ErrorUtils.getGlobalHandler();
      
      ErrorUtils.setGlobalHandler(async (error: Error, isFatal?: boolean) => {
        try {
          const crashReport = await this.generateCrashReport(error);
          this.fatal('Uncaught Exception', error, { crashReport, isFatal });
          
          // Send crash report to Sentry
          SentryTransport.captureException(error, { crashReport, isFatal });

          await this.flushBuffer();
        } catch (reportError) {
          console.error('Failed to generate crash report:', reportError);
        }
        
        // Call original handler
        if (originalHandler) {
          originalHandler(error, isFatal);
        }
      });
    }
  }

  /**
   * Set up app lifecycle monitoring
   */
  private setupAppLifecycleMonitoring(): void {
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      switch (nextAppState) {
        case 'active':
          this.logEvent('app_foreground');
          break;
        case 'background':
          this.logEvent('app_background');
          this.flushBuffer(); // Ensure logs are saved when going to background
          break;
        case 'inactive':
          // iOS only - app is in transition
          break;
      }
    });
  }

  /**
   * Log application start information
   */
  private async logAppStart(): Promise<void> {
    const deviceInfo = await this.getDeviceInfo();
    
    this.info('Application Started', {
      sessionId: this.sessionId,
      deviceInfo,
      timestamp: new Date().toISOString(),
      platform: Platform.OS,
      version: Platform.Version
    });
  }

  /**
   * Start buffer flush timer
   */
  private startFlushTimer(): void {
    const interval = this.configManager.getFlushInterval();
    this.flushTimer = setInterval(() => {
      this.flushBuffer().catch(error => 
        console.error('Failed to flush buffer on timer:', error)
      );
    }, interval);
  }

  /**
   * Stop buffer flush timer
   */
  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Format log entry for file output
   */
  private formatLogEntry(entry: LogEntry): string {
    const level = LogLevel[entry.level].padEnd(5);
    const source = entry.source.length > 30 ? entry.source.substring(0, 27) + '...' : entry.source.padEnd(30);
    
    let formatted = `[${entry.timestamp}] [${level}] [${entry.thread}] [${source}] - ${entry.message}`;
    
    if (entry.metadata) {
      formatted += ` | Metadata: ${JSON.stringify(entry.metadata)}`;
    }
    
    return formatted;
  }

  /**
   * Output log entry to console
   */
  private outputToConsole(entry: LogEntry): void {
    const message = `[${LogLevel[entry.level]}] ${entry.source}: ${entry.message}`;
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, entry.metadata);
        break;
      case LogLevel.INFO:
        console.info(message, entry.metadata);
        break;
      case LogLevel.WARN:
        console.warn(message, entry.metadata);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(message, entry.metadata);
        break;
    }
  }

  /**
   * Get caller information from stack trace
   */
  private getCallerInfo(): string {
    try {
      const stack = new Error().stack;
      if (!stack) return 'Unknown';
      
      const lines = stack.split('\n');
      // Skip first few lines (Error, this method, log method)
      const callerLine = lines[4] || lines[3] || 'Unknown';
      
      // Extract function name and location
      const match = callerLine.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
      if (match) {
        const [, functionName, file, line] = match;
        const fileName = file.split('/').pop() || file;
        return `${functionName} (${fileName}:${line})`;
      }
      
      return 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get device information
   */
  private async getDeviceInfo(): Promise<DeviceInfo> {
    const appInfo = getAppInfo();
    
    return {
      platform: appInfo.platform,
      model: appInfo.deviceName || 'Unknown',
      osVersion: appInfo.osVersion,
      appVersion: appInfo.version,
      buildNumber: appInfo.buildNumber,
      deviceId: await this.getDeviceId(),
      locale: 'en-US', // Would need native module for accurate locale
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screenResolution: 'Unknown', // Would need native module
      availableStorage: 0, // Would need native module
      totalStorage: 0 // Would need native module
    };
  }

  /**
   * Get or generate device ID
   */
  private async getDeviceId(): Promise<string> {
    const DEVICE_ID_KEY = '@device_id';
    
    try {
      let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
      if (!deviceId) {
        deviceId = this.generateId();
        await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
      }
      return deviceId;
    } catch {
      return 'unknown_device';
    }
  }

  /**
   * Sanitize configuration for logging
   */
  private sanitizeConfig(config: LoggerConfig): any {
    const sanitized = { ...config };
    // Remove sensitive data from config if any
    return sanitized;
  }

  /**
   * Clean shutdown of logger
   */
  public async shutdown(): Promise<void> {
    this.info('Logger shutting down', { sessionId: this.sessionId });
    
    // Flush remaining logs
    await this.flushBuffer();
    
    // Stop timers
    this.stopFlushTimer();
    
    // Remove app state listener
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    
    this.isInitialized = false;
  }

  /**
   * Check if logger is initialized
   */
  public isReady(): boolean {
    return this.isInitialized;
  }
}

// Export convenience methods for global access
export const debug = (message: string, metadata?: Record<string, any>, source?: string) => 
  Logger.getInstance().debug(message, metadata, source);

export const info = (message: string, metadata?: Record<string, any>, source?: string) => 
  Logger.getInstance().info(message, metadata, source);

export const warn = (message: string, metadata?: Record<string, any>, source?: string) => 
  Logger.getInstance().warn(message, metadata, source);

export const error = (message: string, error?: Error | any, metadata?: Record<string, any>, source?: string) => 
  Logger.getInstance().error(message, error, metadata, source);

export const fatal = (message: string, error?: Error | any, metadata?: Record<string, any>, source?: string) => 
  Logger.getInstance().fatal(message, error, metadata, source);

export const logEvent = (event: AppLifecycleEvent, data?: Record<string, any>, source?: string) =>
  Logger.getInstance().logEvent(event, data, source);

export default Logger;
