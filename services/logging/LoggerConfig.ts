/**
 * Logger Configuration Manager
 * Handles logger configuration, validation, and runtime adjustments
 */

import { LogLevel, LoggerConfig } from './LoggerTypes';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class LoggerConfigManager {
  private static readonly CONFIG_KEY = '@logger_config';
  private static readonly DEFAULT_CONFIG: LoggerConfig = {
    logLevel: LogLevel.INFO,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    enableCrashReporting: true,
    requestPermissions: true,
    enableConsoleOutput: __DEV__,
    bufferSize: 100,
    flushInterval: 5000, // 5 seconds
    enableEncryption: false,
    filePrefix: 'app_log',
    enableNetworkLogging: false,
    sensitiveDataFilters: [
      'password',
      'token',
      'api_key',
      'secret',
      'auth',
      'credential',
      'ssn',
      'credit_card',
      'social_security'
    ]
  };

  private config: LoggerConfig;

  constructor(initialConfig?: Partial<LoggerConfig>) {
    this.config = { ...LoggerConfigManager.DEFAULT_CONFIG, ...initialConfig };
  }

  /**
   * Initialize configuration from storage or use defaults
   */
  public async initialize(overrides?: Partial<LoggerConfig>): Promise<LoggerConfig> {
    try {
      const savedConfig = await this.loadFromStorage();
      this.config = { 
        ...LoggerConfigManager.DEFAULT_CONFIG, 
        ...savedConfig, 
        ...overrides 
      };
    } catch (error) {
      console.warn('Failed to load logger config from storage, using defaults:', error);
      this.config = { ...LoggerConfigManager.DEFAULT_CONFIG, ...overrides };
    }

    this.validateConfig();
    await this.saveToStorage();
    return this.config;
  }

  /**
   * Get current configuration
   */
  public getConfig(): LoggerConfig {
    return { ...this.config };
  }

  /**
   * Update configuration at runtime
   */
  public async updateConfig(updates: Partial<LoggerConfig>): Promise<void> {
    this.config = { ...this.config, ...updates };
    this.validateConfig();
    await this.saveToStorage();
  }

  /**
   * Get log level threshold
   */
  public getLogLevel(): LogLevel {
    return this.config.logLevel;
  }

  /**
   * Set log level at runtime
   */
  public async setLogLevel(level: LogLevel): Promise<void> {
    await this.updateConfig({ logLevel: level });
  }

  /**
   * Check if a log level should be logged
   */
  public shouldLog(level: LogLevel): boolean {
    return level >= this.config.logLevel;
  }

  /**
   * Get maximum file size in bytes
   */
  public getMaxFileSize(): number {
    return this.config.maxFileSize;
  }

  /**
   * Get maximum number of log files to keep
   */
  public getMaxFiles(): number {
    return this.config.maxFiles;
  }

  /**
   * Check if crash reporting is enabled
   */
  public isCrashReportingEnabled(): boolean {
    return this.config.enableCrashReporting;
  }

  /**
   * Check if console output is enabled
   */
  public isConsoleOutputEnabled(): boolean {
    return this.config.enableConsoleOutput;
  }

  /**
   * Get buffer size for batched writes
   */
  public getBufferSize(): number {
    return this.config.bufferSize;
  }

  /**
   * Get flush interval in milliseconds
   */
  public getFlushInterval(): number {
    return this.config.flushInterval;
  }

  /**
   * Check if encryption is enabled
   */
  public isEncryptionEnabled(): boolean {
    return this.config.enableEncryption;
  }

  /**
   * Get log directory path
   */
  public getLogDirectory(): string | undefined {
    return this.config.logDirectory;
  }

  /**
   * Get file prefix for log files
   */
  public getFilePrefix(): string {
    return this.config.filePrefix;
  }

  /**
   * Check if network logging is enabled
   */
  public isNetworkLoggingEnabled(): boolean {
    return this.config.enableNetworkLogging;
  }

  /**
   * Get sensitive data filters
   */
  public getSensitiveDataFilters(): string[] {
    return [...this.config.sensitiveDataFilters];
  }

  /**
   * Add sensitive data filter
   */
  public async addSensitiveDataFilter(filter: string): Promise<void> {
    const filters = [...this.config.sensitiveDataFilters];
    if (!filters.includes(filter.toLowerCase())) {
      filters.push(filter.toLowerCase());
      await this.updateConfig({ sensitiveDataFilters: filters });
    }
  }

  /**
   * Remove sensitive data filter
   */
  public async removeSensitiveDataFilter(filter: string): Promise<void> {
    const filters = this.config.sensitiveDataFilters.filter(
      f => f.toLowerCase() !== filter.toLowerCase()
    );
    await this.updateConfig({ sensitiveDataFilters: filters });
  }

  /**
   * Reset configuration to defaults
   */
  public async resetToDefaults(): Promise<void> {
    this.config = { ...LoggerConfigManager.DEFAULT_CONFIG };
    await this.saveToStorage();
  }

  /**
   * Validate configuration values
   */
  private validateConfig(): void {
    if (this.config.maxFileSize < 1024) {
      throw new Error('Maximum file size must be at least 1KB');
    }

    if (this.config.maxFileSize > 100 * 1024 * 1024) {
      console.warn('Maximum file size is very large (>100MB), this may cause performance issues');
    }

    if (this.config.maxFiles < 1) {
      throw new Error('Maximum files must be at least 1');
    }

    if (this.config.maxFiles > 50) {
      console.warn('Maximum files is very high (>50), this may consume significant storage');
    }

    if (this.config.bufferSize < 1) {
      throw new Error('Buffer size must be at least 1');
    }

    if (this.config.flushInterval < 1000) {
      console.warn('Flush interval is very low (<1s), this may impact performance');
    }

    if (!Object.values(LogLevel).includes(this.config.logLevel)) {
      throw new Error('Invalid log level specified');
    }
  }

  /**
   * Load configuration from async storage
   */
  private async loadFromStorage(): Promise<Partial<LoggerConfig>> {
    const configJson = await AsyncStorage.getItem(LoggerConfigManager.CONFIG_KEY);
    return configJson ? JSON.parse(configJson) : {};
  }

  /**
   * Save configuration to async storage
   */
  private async saveToStorage(): Promise<void> {
    await AsyncStorage.setItem(
      LoggerConfigManager.CONFIG_KEY, 
      JSON.stringify(this.config)
    );
  }

  /**
   * Export configuration as JSON
   */
  public exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration from JSON
   */
  public async importConfig(configJson: string): Promise<void> {
    try {
      const importedConfig = JSON.parse(configJson);
      await this.updateConfig(importedConfig);
    } catch (error) {
      throw new Error(`Failed to import configuration: ${error}`);
    }
  }
}
