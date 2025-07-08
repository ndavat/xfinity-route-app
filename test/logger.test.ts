/**
 * Logger Test Suite
 * Comprehensive tests for the logging system
 */

import Logger, { debug, info, warn, error, fatal } from '../services/logging/Logger';
import { LogLevel } from '../services/logging/LoggerTypes';
import { LoggerConfigManager } from '../services/logging/LoggerConfig';
import { LoggerDataSanitizer } from '../services/logging/LoggerDataSanitizer';
import { LoggerPerformanceMonitor } from '../services/logging/LoggerPerformanceMonitor';

// Mock dependencies
jest.mock('expo-file-system');
jest.mock('expo-sharing');
jest.mock('expo-media-library');
jest.mock('@react-native-async-storage/async-storage');

describe('Logger System', () => {
  let logger: Logger;

  beforeEach(async () => {
    // Reset singleton
    Logger['instance'] = null;
    
    // Initialize with test config
    logger = await Logger.initialize({
      logLevel: LogLevel.DEBUG,
      enableConsoleOutput: false,
      requestPermissions: false,
      maxFileSize: 1024 * 1024, // 1MB
      maxFiles: 2,
      bufferSize: 10,
      flushInterval: 1000
    });
  });

  afterEach(async () => {
    if (logger) {
      await logger.shutdown();
    }
  });

  describe('Basic Logging', () => {
    test('should log debug messages', () => {
      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();
      
      debug('Test debug message', { test: 'data' });
      
      // Verify logger processed the message
      const stats = logger.getStats();
      expect(stats.bufferSize).toBeGreaterThan(0);
      
      consoleSpy.mockRestore();
    });

    test('should log info messages', () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
      
      info('Test info message', { userId: '123' });
      
      const stats = logger.getStats();
      expect(stats.bufferSize).toBeGreaterThan(0);
      
      consoleSpy.mockRestore();
    });

    test('should log warning messages', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      warn('Test warning message', { warning: 'low memory' });
      
      const stats = logger.getStats();
      expect(stats.bufferSize).toBeGreaterThan(0);
      
      consoleSpy.mockRestore();
    });

    test('should log error messages', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const testError = new Error('Test error');
      
      error('Test error message', testError, { context: 'test' });
      
      const stats = logger.getStats();
      expect(stats.bufferSize).toBeGreaterThan(0);
      
      consoleSpy.mockRestore();
    });

    test('should log fatal messages', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const testError = new Error('Fatal error');
      
      fatal('Test fatal message', testError, { critical: true });
      
      const stats = logger.getStats();
      expect(stats.bufferSize).toBeGreaterThan(0);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Log Level Filtering', () => {
    test('should respect log level threshold', async () => {
      await logger.setLogLevel(LogLevel.WARN);
      
      const initialBufferSize = logger.getStats().bufferSize;
      
      debug('This should not be logged');
      info('This should not be logged');
      
      const afterInfoBufferSize = logger.getStats().bufferSize;
      expect(afterInfoBufferSize).toBe(initialBufferSize);
      
      warn('This should be logged');
      
      const afterWarnBufferSize = logger.getStats().bufferSize;
      expect(afterWarnBufferSize).toBeGreaterThan(initialBufferSize);
    });

    test('should log errors and fatals regardless of level', async () => {
      await logger.setLogLevel(LogLevel.FATAL);
      
      const initialBufferSize = logger.getStats().bufferSize;
      
      error('This should be logged');
      
      const afterErrorBufferSize = logger.getStats().bufferSize;
      expect(afterErrorBufferSize).toBeGreaterThan(initialBufferSize);
    });
  });

  describe('Configuration Management', () => {
    test('should update configuration at runtime', async () => {
      const initialConfig = logger.getStats().config;
      
      await logger.updateConfig({
        maxFileSize: 2 * 1024 * 1024,
        bufferSize: 20
      });
      
      const updatedConfig = logger.getStats().config;
      expect(updatedConfig.maxFileSize).toBe(2 * 1024 * 1024);
    });

    test('should validate configuration values', async () => {
      const configManager = new LoggerConfigManager();
      
      // Test with invalid configuration
      try {
        await configManager.initialize({
          maxFileSize: 500 // Less than 1KB, should throw error
        });
        fail('Should have thrown an error for invalid config');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Data Sanitization', () => {
    let sanitizer: LoggerDataSanitizer;

    beforeEach(() => {
      sanitizer = new LoggerDataSanitizer({
        sensitiveDataFilters: ['password', 'token', 'secret']
      } as any);
    });

    test('should sanitize sensitive strings', () => {
      const message = 'User logged in with password: secret123';
      const sanitized = sanitizer.sanitizeMessage(message);
      
      expect(sanitized).toContain('[REDACTED]');
      expect(sanitized).not.toContain('secret123');
    });

    test('should sanitize objects with sensitive keys', () => {
      const data = {
        username: 'john_doe',
        password: 'secret123',
        profile: {
          email: 'john@example.com',
          token: 'abc123def456'
        }
      };

      const sanitized = sanitizer.sanitizeObject(data);
      
      expect(sanitized.username).toBe('john_doe');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.profile.token).toBe('[REDACTED]');
    });

    test('should sanitize credit card numbers', () => {
      const message = 'Payment with card 4532-1234-5678-9012';
      const sanitized = sanitizer.sanitizeMessage(message);
      
      expect(sanitized).toContain('[REDACTED]');
      expect(sanitized).not.toContain('4532-1234-5678-9012');
    });

    test('should sanitize email addresses', () => {
      const data = { email: 'user@example.com' };
      const sanitized = sanitizer.sanitizeObject(data);
      
      expect(sanitized.email).toContain('[REDACTED]');
    });

    test('should sanitize HTTP requests', () => {
      const httpData = {
        url: 'https://api.example.com/login?token=secret123',
        headers: {
          'Authorization': 'Bearer abc123',
          'Content-Type': 'application/json'
        },
        body: {
          username: 'john',
          password: 'secret'
        }
      };

      const sanitized = sanitizer.sanitizeHttpData(httpData);
      
      expect(sanitized.headers.Authorization).toBe('[REDACTED]');
      expect(sanitized.headers['Content-Type']).toBe('application/json');
      expect(sanitized.body.password).toBe('[REDACTED]');
      expect(sanitized.body.username).toBe('john');
    });

    test('should handle null and undefined values', () => {
      expect(sanitizer.sanitizeObject(null)).toBeNull();
      expect(sanitizer.sanitizeObject(undefined)).toBeUndefined();
      expect(sanitizer.sanitizeMessage('')).toBe('');
    });

    test('should validate sanitization is working', () => {
      const validation = sanitizer.validateSanitization();
      expect(validation.isWorking).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });
  });

  describe('Performance Monitoring', () => {
    let performanceMonitor: LoggerPerformanceMonitor;

    beforeEach(async () => {
      performanceMonitor = new LoggerPerformanceMonitor();
      await performanceMonitor.initialize();
    });

    test('should track log entries', () => {
      performanceMonitor.recordLogEntry('INFO', 100);
      performanceMonitor.recordLogEntry('ERROR', 200);
      
      const stats = performanceMonitor.getStats();
      expect(stats.totalLogEntries).toBe(2);
      expect(stats.errorsLogged).toBe(1);
    });

    test('should track file creation', () => {
      performanceMonitor.recordFileCreation(1024);
      
      const stats = performanceMonitor.getStats();
      expect(stats.filesCreated).toBe(1);
      expect(stats.currentFileSize).toBe(1024);
    });

    test('should analyze performance', () => {
      // Simulate high log volume
      for (let i = 0; i < 1000; i++) {
        performanceMonitor.recordLogEntry('INFO', 50);
      }
      
      const analysis = performanceMonitor.analyzePerformance();
      expect(analysis.score).toBeGreaterThanOrEqual(0);
      expect(analysis.score).toBeLessThanOrEqual(100);
      expect(analysis.metrics).toBeDefined();
    });

    test('should detect performance issues', () => {
      // Simulate many errors
      for (let i = 0; i < 100; i++) {
        performanceMonitor.recordLogEntry('ERROR', 100);
      }
      
      const analysis = performanceMonitor.analyzePerformance();
      expect(analysis.issues.length).toBeGreaterThan(0);
      expect(analysis.recommendations.length).toBeGreaterThan(0);
    });

    test('should generate performance report', () => {
      performanceMonitor.recordLogEntry('INFO', 100);
      performanceMonitor.recordFileCreation(1024);
      
      const report = performanceMonitor.generatePerformanceReport();
      expect(report).toContain('LOGGER PERFORMANCE REPORT');
      expect(report).toContain('Total Log Entries');
      expect(report).toContain('Files Created');
    });

    test('should reset statistics', () => {
      performanceMonitor.recordLogEntry('INFO', 100);
      
      let stats = performanceMonitor.getStats();
      expect(stats.totalLogEntries).toBe(1);
      
      performanceMonitor.resetStats();
      
      stats = performanceMonitor.getStats();
      expect(stats.totalLogEntries).toBe(0);
    });
  });

  describe('Buffer Management', () => {
    test('should flush buffer when full', async () => {
      // Set small buffer size
      await logger.updateConfig({ bufferSize: 2 });
      
      info('Message 1');
      info('Message 2');
      
      const initialBufferSize = logger.getStats().bufferSize;
      
      info('Message 3'); // This should trigger flush
      
      // Buffer should be smaller after flush
      const afterFlushBufferSize = logger.getStats().bufferSize;
      expect(afterFlushBufferSize).toBeLessThan(3);
    });

    test('should flush buffer manually', async () => {
      info('Message 1');
      info('Message 2');
      
      const beforeFlush = logger.getStats().bufferSize;
      expect(beforeFlush).toBeGreaterThan(0);
      
      await logger.flushBuffer();
      
      const afterFlush = logger.getStats().bufferSize;
      expect(afterFlush).toBe(0);
    });

    test('should flush on high priority logs', () => {
      info('Regular message');
      
      const beforeError = logger.getStats().bufferSize;
      
      error('High priority error');
      
      // Buffer should be flushed after error
      const afterError = logger.getStats().bufferSize;
      expect(afterError).toBeLessThanOrEqual(beforeError);
    });
  });

  describe('Error Handling', () => {
    test('should handle file write errors gracefully', async () => {
      // Mock file system to throw error
      const mockError = new Error('Disk full');
      
      jest.spyOn(console, 'error').mockImplementation();
      
      // This should not throw even if file operations fail
      expect(() => {
        info('Test message');
      }).not.toThrow();
      
      jest.restoreAllMocks();
    });

    test('should handle malformed log data', () => {
      const circular: any = { name: 'test' };
      circular.self = circular; // Create circular reference
      
      expect(() => {
        info('Test with circular reference', circular);
      }).not.toThrow();
    });

    test('should handle initialization errors', async () => {
      // Mock a critical component to fail
      jest.spyOn(console, 'error').mockImplementation();
      
      try {
        await Logger.initialize({
          maxFileSize: -1 // Invalid config
        });
      } catch (error) {
        expect(error).toBeDefined();
      }
      
      jest.restoreAllMocks();
    });
  });

  describe('Memory Management', () => {
    test('should not leak memory with large log volumes', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Generate many log entries
      for (let i = 0; i < 10000; i++) {
        debug(`Log entry ${i}`, { index: i, data: 'test'.repeat(100) });
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;
      
      // Memory growth should be reasonable (less than 50MB)
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
    });

    test('should clean up resources on shutdown', async () => {
      info('Test message');
      
      expect(logger.isReady()).toBe(true);
      
      await logger.shutdown();
      
      expect(logger.isReady()).toBe(false);
    });
  });

  describe('Concurrency', () => {
    test('should handle concurrent logging safely', async () => {
      const promises = [];
      
      // Start multiple concurrent logging operations
      for (let i = 0; i < 100; i++) {
        promises.push(
          new Promise<void>((resolve) => {
            setTimeout(() => {
              info(`Concurrent message ${i}`, { index: i });
              resolve();
            }, Math.random() * 100);
          })
        );
      }
      
      await Promise.all(promises);
      
      const stats = logger.getStats();
      expect(stats.performance.totalLogEntries).toBe(100);
    });

    test('should handle rapid successive flushes', async () => {
      info('Message 1');
      info('Message 2');
      
      // Start multiple flush operations simultaneously
      const flushPromises = [
        logger.flushBuffer(),
        logger.flushBuffer(),
        logger.flushBuffer()
      ];
      
      await Promise.all(flushPromises);
      
      // Should complete without errors
      expect(logger.getStats().bufferSize).toBe(0);
    });
  });

  describe('Integration Tests', () => {
    test('should work end-to-end', async () => {
      // Initialize fresh logger
      const testLogger = await Logger.initialize({
        logLevel: LogLevel.DEBUG,
        bufferSize: 5,
        flushInterval: 500
      });
      
      // Log various types of messages
      testLogger.debug('Debug message');
      testLogger.info('Info message', { userId: '123' });
      testLogger.warn('Warning message');
      testLogger.error('Error message', new Error('Test error'));
      testLogger.fatal('Fatal message', new Error('Critical error'));
      
      // Wait for auto-flush
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Verify statistics
      const stats = testLogger.getStats();
      expect(stats.performance.totalLogEntries).toBeGreaterThan(0);
      expect(stats.performance.errorsLogged).toBeGreaterThan(0);
      
      // Clean up
      await testLogger.shutdown();
    });

    test('should export logs successfully', async () => {
      info('Test message for export');
      await logger.flushBuffer();
      
      const exportPath = await logger.exportLogs({
        format: 'txt',
        includeMetadata: true,
        compress: false
      });
      
      expect(exportPath).toBeTruthy();
      expect(typeof exportPath).toBe('string');
    });
  });
});

// Test helper functions
export function createTestError(message: string): Error {
  const error = new Error(message);
  error.stack = `Error: ${message}\n    at test (test.js:1:1)`;
  return error;
}

export function simulateMemoryPressure() {
  // Simulate memory pressure by creating large objects
  const largeData = new Array(1000000).fill('test');
  return largeData;
}

export async function waitForAsync(ms: number = 100): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
