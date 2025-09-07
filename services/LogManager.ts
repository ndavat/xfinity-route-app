import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '../utils/config';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  data?: any;
  source?: string;
  stack?: string;
}

export interface LogManagerConfig {
  enabled: boolean;
  maxLogs: number;
  logLevel: LogLevel;
  showAlerts: boolean;
  alertOnError: boolean;
  alertOnWarn: boolean;
  persistLogs: boolean;
}

class LogManagerService {
  private logs: LogEntry[] = [];
  private config: LogManagerConfig = {
    enabled: Config.logging.enabled,
    maxLogs: Config.logging.maxEntries,
    logLevel: Config.logging.level,
    showAlerts: Config.logging.showAlerts,
    alertOnError: Config.logging.alertOnError,
    alertOnWarn: Config.logging.alertOnWarn,
    persistLogs: Config.logging.persistLogs,
  };
  private originalConsole: any = {};
  private isInitialized = false;

  private readonly STORAGE_KEY = 'app_logs';
  private readonly CONFIG_KEY = 'log_manager_config';

  /**
   * Initialize the log manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load configuration
      await this.loadConfig();
      
      // Load persisted logs
      if (this.config.persistLogs) {
        await this.loadLogs();
      }

      // Override console methods if enabled
      if (this.config.enabled) {
        this.overrideConsole();
      }

      this.isInitialized = true;
      this.log('info', 'LogManager initialized', { config: this.config });
    } catch (error) {
      console.error('Failed to initialize LogManager:', error);
    }
  }

  /**
   * Load configuration from storage
   */
  private async loadConfig(): Promise<void> {
    try {
      const configStr = await AsyncStorage.getItem(this.CONFIG_KEY);
      if (configStr) {
        const savedConfig = JSON.parse(configStr);
        this.config = { ...this.config, ...savedConfig };
      }
    } catch (error) {
      console.error('Failed to load log config:', error);
    }
  }

  /**
   * Save configuration to storage
   */
  async saveConfig(newConfig: Partial<LogManagerConfig>): Promise<void> {
    try {
      this.config = { ...this.config, ...newConfig };
      await AsyncStorage.setItem(this.CONFIG_KEY, JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save log config:', error);
    }
  }

  /**
   * Load persisted logs from storage
   */
  private async loadLogs(): Promise<void> {
    try {
      const logsStr = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (logsStr) {
        const savedLogs = JSON.parse(logsStr);
        this.logs = savedLogs.map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp)
        }));
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  }

  /**
   * Persist logs to storage
   */
  private async persistLogs(): Promise<void> {
    if (!this.config.persistLogs) return;

    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.logs));
    } catch (error) {
      console.error('Failed to persist logs:', error);
    }
  }

  /**
   * Override console methods to capture logs
   */
  private overrideConsole(): void {
    // Store original console methods
    this.originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
    };

    // Override console methods
    console.log = (...args) => {
      this.originalConsole.log(...args);
      this.captureLog('info', args);
    };

    console.info = (...args) => {
      this.originalConsole.info(...args);
      this.captureLog('info', args);
    };

    console.warn = (...args) => {
      this.originalConsole.warn(...args);
      this.captureLog('warn', args);
    };

    console.error = (...args) => {
      this.originalConsole.error(...args);
      this.captureLog('error', args);
    };

    console.debug = (...args) => {
      this.originalConsole.debug(...args);
      this.captureLog('debug', args);
    };
  }

  /**
   * Capture a log entry
   */
  private captureLog(level: LogLevel, args: any[]): void {
    if (!this.shouldLog(level)) return;

    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');

    const logEntry: LogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      level,
      message,
      data: args.length > 1 ? args.slice(1) : undefined,
      source: this.getCallerInfo(),
    };

    // Add to logs array
    this.logs.unshift(logEntry);

    // Trim logs if exceeding max
    if (this.logs.length > this.config.maxLogs) {
      this.logs = this.logs.slice(0, this.config.maxLogs);
    }

    // Persist logs
    this.persistLogs();

    // Show alert if configured
    this.maybeShowAlert(logEntry);
  }

  /**
   * Add a log entry manually
   */
  log(level: LogLevel, message: string, data?: any, source?: string): void {
    if (!this.shouldLog(level)) return;

    const logEntry: LogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      level,
      message,
      data,
      source: source || this.getCallerInfo(),
    };

    this.logs.unshift(logEntry);

    if (this.logs.length > this.config.maxLogs) {
      this.logs = this.logs.slice(0, this.config.maxLogs);
    }

    this.persistLogs();
    this.maybeShowAlert(logEntry);
  }

  /**
   * Check if we should log at this level
   */
  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;

    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.logLevel);
    const logLevelIndex = levels.indexOf(level);

    return logLevelIndex >= currentLevelIndex;
  }

  /**
   * Maybe show an alert for this log entry
   */
  private maybeShowAlert(logEntry: LogEntry): void {
    if (!this.config.showAlerts) return;
    if (Platform.OS !== 'android') return; // Only show on Android as requested

    const shouldAlert = 
      (logEntry.level === 'error' && this.config.alertOnError) ||
      (logEntry.level === 'warn' && this.config.alertOnWarn);

    if (shouldAlert) {
      this.showLogAlert(logEntry);
    }
  }

  /**
   * Show an alert for a log entry
   */
  private showLogAlert(logEntry: LogEntry): void {
    const title = `${logEntry.level.toUpperCase()} Log`;
    const message = `${logEntry.message}\n\nTime: ${logEntry.timestamp.toLocaleString()}\nSource: ${logEntry.source || 'Unknown'}`;

    Alert.alert(
      title,
      message,
      [
        {
          text: 'View All Logs',
          onPress: () => this.showAllLogsAlert(),
        },
        {
          text: 'Dismiss',
          style: 'cancel',
        },
      ]
    );
  }

  /**
   * Show all logs in an alert
   */
  showAllLogsAlert(level?: LogLevel): void {
    const filteredLogs = level 
      ? this.logs.filter(log => log.level === level)
      : this.logs.slice(0, 20); // Show last 20 logs

    const logText = filteredLogs.map(log => 
      `[${log.timestamp.toLocaleTimeString()}] ${log.level.toUpperCase()}: ${log.message}`
    ).join('\n\n');

    Alert.alert(
      'Application Logs',
      logText || 'No logs available',
      [
        {
          text: 'Clear Logs',
          style: 'destructive',
          onPress: () => this.clearLogs(),
        },
        {
          text: 'Export',
          onPress: () => this.exportLogs(),
        },
        {
          text: 'Close',
          style: 'cancel',
        },
      ]
    );
  }

  /**
   * Get all logs
   */
  getLogs(level?: LogLevel, limit?: number): LogEntry[] {
    let filteredLogs = level 
      ? this.logs.filter(log => log.level === level)
      : this.logs;

    if (limit) {
      filteredLogs = filteredLogs.slice(0, limit);
    }

    return filteredLogs;
  }

  /**
   * Clear all logs
   */
  async clearLogs(): Promise<void> {
    this.logs = [];
    if (this.config.persistLogs) {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
    }
  }

  /**
   * Export logs as text
   */
  exportLogs(): string {
    return this.logs.map(log => 
      `[${log.timestamp.toISOString()}] ${log.level.toUpperCase()}: ${log.message}${
        log.data ? '\nData: ' + JSON.stringify(log.data, null, 2) : ''
      }`
    ).join('\n\n');
  }

  /**
   * Generate a unique ID for log entries
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Get caller information (simplified)
   */
  private getCallerInfo(): string {
    try {
      const stack = new Error().stack;
      if (stack) {
        const lines = stack.split('\n');
        // Find the first line that's not from this file
        for (let i = 3; i < lines.length; i++) {
          const line = lines[i];
          if (line && !line.includes('LogManager')) {
            return line.trim();
          }
        }
      }
    } catch (error) {
      // Ignore errors getting stack trace
    }
    return 'Unknown';
  }

  /**
   * Get current configuration
   */
  getConfig(): LogManagerConfig {
    return { ...this.config };
  }

  /**
   * Restore original console methods
   */
  restoreConsole(): void {
    if (this.originalConsole.log) {
      console.log = this.originalConsole.log;
      console.info = this.originalConsole.info;
      console.warn = this.originalConsole.warn;
      console.error = this.originalConsole.error;
      console.debug = this.originalConsole.debug;
    }
  }
}

// Create singleton instance
export const LogManager = new LogManagerService();

// Initialize on import
LogManager.initialize();
