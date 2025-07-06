import AsyncStorage from '@react-native-async-storage/async-storage';

const LOG_STORE_KEY = 'debug_log_store';
const MAX_LOG_ENTRIES = 100; // Maximum number of log entries to keep

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'request' | 'response' | 'error' | 'retry' | 'auth';
  url?: string;
  method?: string;
  gatewayIp?: string;
  requestTime?: number;
  responseTime?: number;
  statusCode?: number;
  errorType?: 'timeout' | 'dns' | 'connection_refused' | 'cors' | 'network' | 'server' | 'client' | 'unknown';
  errorMessage?: string;
  retryAttempt?: number;
  maxRetries?: number;
  backoffDelay?: number;
  requestId?: string;
  headers?: Record<string, any>;
  config?: {
    timeout?: number;
    retries?: number;
    url?: string;
    method?: string;
  };
  metadata?: Record<string, any>;
  // Auth-specific fields
  action?: string;
  success?: boolean;
  details?: string;
  sessionId?: string | null;
  username?: string | null;
  platform?: string;
  cookieCount?: number;
}

export class LogStore {
  private static instance: LogStore;
  private logs: LogEntry[] = [];
  private isLoaded = false;

  private constructor() {}

  static getInstance(): LogStore {
    if (!LogStore.instance) {
      LogStore.instance = new LogStore();
    }
    return LogStore.instance;
  }

  /**
   * Initialize the log store by loading existing logs from AsyncStorage
   */
  async initialize(): Promise<void> {
    if (this.isLoaded) return;

    try {
      const storedLogs = await AsyncStorage.getItem(LOG_STORE_KEY);
      if (storedLogs) {
        this.logs = JSON.parse(storedLogs);
        // Ensure we don't exceed the maximum number of entries
        if (this.logs.length > MAX_LOG_ENTRIES) {
          this.logs = this.logs.slice(-MAX_LOG_ENTRIES);
          await this.persist();
        }
      }
      this.isLoaded = true;
    } catch (error) {
      console.error('Failed to load logs from AsyncStorage:', error);
      this.logs = [];
      this.isLoaded = true;
    }
  }

  /**
   * Add a new log entry
   */
  async addLog(entry: Omit<LogEntry, 'id' | 'timestamp'>): Promise<void> {
    await this.initialize();

    const logEntry: LogEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: new Date().toISOString(),
    };

    this.logs.push(logEntry);

    // Keep only the latest entries
    if (this.logs.length > MAX_LOG_ENTRIES) {
      this.logs = this.logs.slice(-MAX_LOG_ENTRIES);
    }

    await this.persist();
  }

  /**
   * Get all log entries
   */
  async getLogs(): Promise<LogEntry[]> {
    await this.initialize();
    return [...this.logs];
  }

  /**
   * Get log entries filtered by type
   */
  async getLogsByType(type: LogEntry['type']): Promise<LogEntry[]> {
    await this.initialize();
    return this.logs.filter(log => log.type === type);
  }

  /**
   * Get log entries filtered by error type
   */
  async getLogsByErrorType(errorType: LogEntry['errorType']): Promise<LogEntry[]> {
    await this.initialize();
    return this.logs.filter(log => log.errorType === errorType);
  }

  /**
   * Get log entries for a specific request ID
   */
  async getLogsByRequestId(requestId: string): Promise<LogEntry[]> {
    await this.initialize();
    return this.logs.filter(log => log.requestId === requestId);
  }

  /**
   * Get log entries within a time range
   */
  async getLogsByTimeRange(startTime: string, endTime: string): Promise<LogEntry[]> {
    await this.initialize();
    return this.logs.filter(log => {
      const logTime = new Date(log.timestamp).getTime();
      const start = new Date(startTime).getTime();
      const end = new Date(endTime).getTime();
      return logTime >= start && logTime <= end;
    });
  }

  /**
   * Get recent log entries (last N entries)
   */
  async getRecentLogs(count: number = 20): Promise<LogEntry[]> {
    await this.initialize();
    return this.logs.slice(-count);
  }

  /**
   * Clear all logs
   */
  async clearLogs(): Promise<void> {
    this.logs = [];
    await this.persist();
  }

  /**
   * Get log statistics
   */
  async getLogStats(): Promise<{
    total: number;
    errors: number;
    retries: number;
    auths: number;
    successfulAuths: number;
    averageResponseTime: number;
    errorBreakdown: Record<string, number>;
  }> {
    await this.initialize();

    const authLogs = this.logs.filter(log => log.type === 'auth');
    const stats = {
      total: this.logs.length,
      errors: this.logs.filter(log => log.type === 'error').length,
      retries: this.logs.filter(log => log.type === 'retry').length,
      auths: authLogs.length,
      successfulAuths: authLogs.filter(log => log.success === true).length,
      averageResponseTime: 0,
      errorBreakdown: {} as Record<string, number>,
    };

    // Calculate average response time
    const responseLogs = this.logs.filter(log => log.responseTime !== undefined);
    if (responseLogs.length > 0) {
      const totalTime = responseLogs.reduce((sum, log) => sum + (log.responseTime || 0), 0);
      stats.averageResponseTime = Math.round(totalTime / responseLogs.length);
    }

    // Calculate error breakdown
    this.logs.forEach(log => {
      if (log.errorType) {
        stats.errorBreakdown[log.errorType] = (stats.errorBreakdown[log.errorType] || 0) + 1;
      }
    });

    return stats;
  }

  /**
   * Export logs as JSON string
   */
  async exportLogs(): Promise<string> {
    await this.initialize();
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Persist logs to AsyncStorage
   */
  private async persist(): Promise<void> {
    try {
      await AsyncStorage.setItem(LOG_STORE_KEY, JSON.stringify(this.logs));
    } catch (error) {
      console.error('Failed to persist logs to AsyncStorage:', error);
    }
  }

  /**
   * Generate a unique ID for log entries
   */
  private generateId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const logStore = LogStore.getInstance();

// Convenience functions
export const addLog = (entry: Omit<LogEntry, 'id' | 'timestamp'>) => logStore.addLog(entry);
export const getLogs = () => logStore.getLogs();
export const getLogsByType = (type: LogEntry['type']) => logStore.getLogsByType(type);
export const getLogsByErrorType = (errorType: LogEntry['errorType']) => logStore.getLogsByErrorType(errorType);
export const getRecentLogs = (count?: number) => logStore.getRecentLogs(count);
export const clearLogs = () => logStore.clearLogs();
export const getLogStats = () => logStore.getLogStats();
export const exportLogs = () => logStore.exportLogs();
