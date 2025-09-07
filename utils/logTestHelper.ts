import { LogManager } from '../services/LogManager';

/**
 * Helper functions for testing log functionality
 */
export class LogTestHelper {
  /**
   * Generate test logs for demonstration
   */
  static generateTestLogs(): void {
    LogManager.log('info', 'Application started successfully', {
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });

    LogManager.log('debug', 'Router connection attempt', {
      ip: '10.0.0.1',
      timeout: 5000
    });

    LogManager.log('warn', 'Router response slow', {
      responseTime: 3500,
      threshold: 3000
    });

    LogManager.log('error', 'Failed to authenticate with router', {
      statusCode: 401,
      message: 'Invalid credentials'
    });

    LogManager.log('info', 'Device list updated', {
      deviceCount: 8,
      newDevices: 2
    });

    LogManager.log('debug', 'Cache cleared', {
      cacheSize: '2.5MB',
      itemsCleared: 150
    });
  }

  /**
   * Test log alert functionality
   */
  static testLogAlerts(): void {
    console.log('Testing log alerts...');
    
    // Test different log levels
    console.info('This is an info message');
    console.warn('This is a warning message');
    console.error('This is an error message');
    console.debug('This is a debug message');

    // Test with objects
    console.log('Router status:', { 
      connected: true, 
      uptime: '2 days', 
      devices: 8 
    });

    console.error('Connection failed:', { 
      error: 'ECONNREFUSED', 
      code: 'NETWORK_ERROR',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Clear all test logs
   */
  static async clearTestLogs(): Promise<void> {
    await LogManager.clearLogs();
    console.log('Test logs cleared');
  }

  /**
   * Get log statistics
   */
  static getLogStats(): { total: number; byLevel: Record<string, number> } {
    const logs = LogManager.getLogs();
    const byLevel: Record<string, number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0
    };

    logs.forEach(log => {
      byLevel[log.level] = (byLevel[log.level] || 0) + 1;
    });

    return {
      total: logs.length,
      byLevel
    };
  }
}
