# Mobile Application Logging Module Documentation

## Overview

This comprehensive logging module provides production-ready logging capabilities for React Native/Expo applications. It includes file management, permission handling, data sanitization, performance monitoring, and crash reporting.

## Features

### ✅ Core Functionality
- **New File Per Session**: Unique log file for each app launch
- **Timestamp-based Naming**: `app_log_YYYY-MM-DD_HH-mm-ss.txt` format
- **Automatic File Rotation**: Based on size limits
- **Storage Permissions**: Handles platform-specific permissions
- **Multiple Log Levels**: DEBUG, INFO, WARN, ERROR, FATAL
- **Structured Logging**: JSON metadata support
- **Buffer Management**: Asynchronous writing with configurable buffering
- **Data Sanitization**: Automatic removal of sensitive information
- **Performance Monitoring**: Built-in performance tracking and analysis
- **Crash Reporting**: Uncaught exception handling

### ✅ Platform Support
- **iOS**: Uses Documents directory
- **Android**: Uses external storage with proper permissions
- **React Native/Expo**: Full compatibility

## Quick Start

### 1. Basic Setup

```typescript
import Logger from './services/logging/Logger';
import { LogLevel } from './services/logging/LoggerTypes';

// Initialize logger
const logger = await Logger.initialize({
  logLevel: LogLevel.INFO,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5,
  enableCrashReporting: true,
  requestPermissions: true
});

// Start logging
logger.info('Application started');
logger.debug('Debug information', { userId: '123' });
logger.warn('Warning message');
logger.error('Error occurred', error, { context: 'user-action' });
logger.fatal('Critical error', fatalError);
```

### 2. Using Convenience Functions

```typescript
import { debug, info, warn, error, fatal } from './services/logging/Logger';

// Simple logging
info('User logged in', { userId: '123' });
error('API call failed', apiError, { endpoint: '/api/users' });
debug('Processing data', { count: items.length });
```

### 3. Easy Initialization

```typescript
import { 
  initializeLogger, 
  initializeProductionLogger, 
  initializeDevelopmentLogger 
} from './services/LoggerUtils';

// For development
const logger = await initializeDevelopmentLogger();

// For production
const logger = await initializeProductionLogger();

// Custom configuration
const logger = await initializeLogger({
  logLevel: LogLevel.WARN,
  enableNetworkLogging: true
});
```

## Configuration

### LoggerConfig Interface

```typescript
interface LoggerConfig {
  logLevel: LogLevel;              // Minimum log level to record
  maxFileSize: number;             // Maximum file size in bytes
  maxFiles: number;                // Number of log files to keep
  enableCrashReporting: boolean;   // Capture uncaught exceptions
  requestPermissions: boolean;     // Request storage permissions
  enableConsoleOutput: boolean;    // Output to console (dev mode)
  bufferSize: number;              // Number of entries to buffer
  flushInterval: number;           // Flush interval in milliseconds
  enableEncryption: boolean;       // Encrypt log files
  logDirectory?: string;           // Custom log directory
  filePrefix: string;              // Log file name prefix
  enableNetworkLogging: boolean;   // Log network requests/responses
  sensitiveDataFilters: string[];  // Sensitive data keywords to filter
}
```

### Default Configuration

```typescript
{
  logLevel: LogLevel.INFO,
  maxFileSize: 10 * 1024 * 1024,    // 10MB
  maxFiles: 5,
  enableCrashReporting: true,
  requestPermissions: true,
  enableConsoleOutput: __DEV__,
  bufferSize: 100,
  flushInterval: 5000,              // 5 seconds
  enableEncryption: false,
  filePrefix: 'app_log',
  enableNetworkLogging: false,
  sensitiveDataFilters: [
    'password', 'token', 'api_key', 'secret', 'auth',
    'credential', 'ssn', 'credit_card'
  ]
}
```

## API Reference

### Core Logging Methods

```typescript
// Basic logging
logger.debug(message: string, metadata?: object, source?: string)
logger.info(message: string, metadata?: object, source?: string)
logger.warn(message: string, metadata?: object, source?: string)
logger.error(message: string, error?: Error, metadata?: object, source?: string)
logger.fatal(message: string, error?: Error, metadata?: object, source?: string)

// Event logging
logger.logEvent(event: AppLifecycleEvent, data?: object, source?: string)

// Network logging
logger.logNetworkActivity(networkData: NetworkLogEntry)
```

### File Management

```typescript
// Manual buffer flush
await logger.flushBuffer()

// Export logs
const exportPath = await logger.exportLogs({
  format: 'txt' | 'json' | 'csv',
  includeMetadata: boolean,
  compress: boolean,
  filter?: LogFilter
})

// Share current log file
await logger.shareCurrentLogFile()

// Get current log file path
const filePath = logger.getCurrentLogFile()

// Clear logs
await logger.clearOldLogs()  // Remove old files only
await logger.clearAllLogs()  // Remove all files
```

### Configuration Management

```typescript
// Update configuration at runtime
await logger.updateConfig({
  logLevel: LogLevel.DEBUG,
  bufferSize: 50
})

// Change log level
await logger.setLogLevel(LogLevel.WARN)

// Get current stats
const stats = logger.getStats()

// Get performance analysis
const analysis = logger.getPerformanceAnalysis()
```

### Lifecycle Management

```typescript
// Check if logger is ready
const isReady = logger.isReady()

// Shutdown logger
await logger.shutdown()
```

## Log Entry Format

Each log entry follows this format:

```
[2024-01-15T10:30:45.123Z] [INFO ] [main] [UserService.login (UserService.ts:45)] - User login successful | Metadata: {"userId":"123","sessionId":"session_1234567890"}
```

Components:
- **Timestamp**: ISO 8601 format
- **Level**: DEBUG, INFO, WARN, ERROR, FATAL
- **Thread**: Thread identifier (usually 'main')
- **Source**: Class/method and file location
- **Message**: The actual log message
- **Metadata**: Additional structured data (optional)

## Data Sanitization

The logger automatically sanitizes sensitive data:

### Built-in Filters
- Credit card numbers
- Social Security Numbers
- Email addresses
- Phone numbers
- API keys and tokens
- JWT tokens
- UUIDs
- Base64 encoded data

### Custom Filters

```typescript
// Add custom sensitive data filters
await logger.updateConfig({
  sensitiveDataFilters: [
    'custom_secret',
    'internal_token',
    'user_id'
  ]
});

// Programmatically add filters
const sanitizer = new LoggerDataSanitizer(config);
sanitizer.addSensitivePattern(/\bcustom_pattern\b/gi);
```

### HTTP Request Sanitization

```typescript
logger.logNetworkActivity({
  url: 'https://api.example.com/login',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer secret123',  // Will be redacted
    'Content-Type': 'application/json'    // Will be preserved
  },
  body: {
    username: 'john',      // Will be preserved
    password: 'secret'     // Will be redacted
  },
  statusCode: 200,
  duration: 1500
});
```

## Performance Monitoring

### Automatic Monitoring

The logger includes built-in performance monitoring:

```typescript
const analysis = logger.getPerformanceAnalysis();
console.log(`Performance Score: ${analysis.score}/100`);
console.log('Issues:', analysis.issues);
console.log('Recommendations:', analysis.recommendations);
```

### Performance Metrics

- **Memory Usage**: Buffer and overall memory consumption
- **Log Rate**: Logs per second
- **File Operations**: File creation and write performance
- **Error Rate**: Percentage of error/warning logs
- **Buffer Efficiency**: Buffer fill rate and flush frequency

### Performance Report

```typescript
const performanceMonitor = new LoggerPerformanceMonitor();
const report = performanceMonitor.generatePerformanceReport();
console.log(report);
```

## React Component Integration

### Logger Management Component

```typescript
import LoggerManager from './components/LoggerManager';

function SettingsScreen() {
  const [showLogger, setShowLogger] = useState(false);
  
  return (
    <View>
      <Button 
        title="Open Logger" 
        onPress={() => setShowLogger(true)} 
      />
      
      <LoggerManager 
        visible={showLogger}
        onClose={() => setShowLogger(false)}
      />
    </View>
  );
}
```

## File Storage Locations

### iOS
- Primary: `Documents/logs/`
- Accessible via iTunes file sharing
- Automatically backed up (unless excluded)

### Android
- Primary: External files directory
- Secondary: App-specific directory
- Accessible via file manager

### File Naming Convention
```
app_log_2024-01-15_10-30-45.txt
xfinity_app_log_2024-01-15_14-22-33.txt
```

## Permission Handling

### Automatic Permission Requests

```typescript
const logger = await Logger.initialize({
  requestPermissions: true  // Will request storage permissions
});

// Check permission status
const permissions = logger.getStats().permissions;
console.log('Storage:', permissions.storagePermission);
console.log('Media Library:', permissions.mediaLibraryPermission);
```

### Manual Permission Management

```typescript
const permissionManager = new LoggerPermissionManager();

// Check existing permissions
await permissionManager.checkExistingPermissions();

// Request specific permission
await permissionManager.requestPermission('storage');

// Get recommended storage location
const location = permissionManager.getRecommendedStorageLocation();
```

## Error Handling and Crash Reporting

### Uncaught Exception Handling

The logger automatically captures uncaught exceptions:

```typescript
const logger = await Logger.initialize({
  enableCrashReporting: true
});

// Uncaught errors will be automatically logged with full context
throw new Error('This will be captured and logged');
```

### Manual Error Reporting

```typescript
try {
  riskyOperation();
} catch (error) {
  logger.error('Operation failed', error, {
    operation: 'riskyOperation',
    userId: currentUser.id,
    context: additionalContext
  });
}
```

## Testing

### Unit Tests

```bash
npm test logger.test.ts
```

### Integration Tests

```typescript
import { initializeTestLogger } from './services/LoggerUtils';

describe('My Feature', () => {
  let logger;
  
  beforeEach(async () => {
    logger = await initializeTestLogger();
  });
  
  afterEach(async () => {
    await logger.shutdown();
  });
  
  test('should log user actions', () => {
    logger.info('User clicked button', { buttonId: 'submit' });
    
    const stats = logger.getStats();
    expect(stats.performance.totalLogEntries).toBeGreaterThan(0);
  });
});
```

## Best Practices

### 1. Log Levels
- **DEBUG**: Detailed diagnostic information (development only)
- **INFO**: General application flow
- **WARN**: Warning conditions that don't stop the app
- **ERROR**: Error conditions that need attention
- **FATAL**: Critical errors that may crash the app

### 2. Structured Logging
```typescript
// Good: Structured with context
logger.info('User action completed', {
  action: 'purchase',
  userId: user.id,
  amount: order.total,
  duration: Date.now() - startTime
});

// Bad: Unstructured string interpolation
logger.info(`User ${user.id} purchased ${order.total} in ${duration}ms`);
```

### 3. Performance Considerations
```typescript
// Use appropriate log levels for production
const logger = await Logger.initialize({
  logLevel: __DEV__ ? LogLevel.DEBUG : LogLevel.WARN
});

// Don't log in tight loops without sampling
for (let i = 0; i < 10000; i++) {
  if (i % 100 === 0) {  // Sample every 100th iteration
    logger.debug('Processing item', { index: i });
  }
}
```

### 4. Sensitive Data Handling
```typescript
// Always sanitize user data
logger.info('User profile updated', {
  userId: user.id,           // OK: Non-sensitive ID
  email: '[REDACTED]',       // Good: Manually redacted
  changes: sanitizedChanges  // Good: Pre-sanitized
});
```

### 5. Error Context
```typescript
// Provide rich context for errors
try {
  await api.updateUser(userData);
} catch (error) {
  logger.error('User update failed', error, {
    userId: userData.id,
    endpoint: '/api/users',
    retryCount: attemptCount,
    networkStatus: await getNetworkStatus()
  });
}
```

## Troubleshooting

### Common Issues

1. **Permission Denied Errors**
   ```typescript
   // Check permissions
   const permissions = logger.getStats().permissions;
   if (!permissions.storagePermission) {
     // Handle permission denial
     await permissionManager.showPermissionSettingsDialog();
   }
   ```

2. **Large File Sizes**
   ```typescript
   // Reduce file size
   await logger.updateConfig({
     maxFileSize: 5 * 1024 * 1024,  // 5MB instead of 10MB
     maxFiles: 3                    // Keep fewer files
   });
   ```

3. **Performance Issues**
   ```typescript
   // Optimize for performance
   const analysis = logger.getPerformanceAnalysis();
   if (analysis.score < 70) {
     await logger.updateConfig({
       bufferSize: 20,        // Smaller buffer
       flushInterval: 10000,  // Less frequent flushes
       logLevel: LogLevel.WARN // Higher threshold
     });
   }
   ```

4. **Memory Usage**
   ```typescript
   // Monitor memory usage
   const stats = logger.getStats();
   if (stats.performance.memoryUsage > 50 * 1024 * 1024) {
     await logger.flushBuffer();  // Force flush
     await logger.clearOldLogs(); // Clean up old files
   }
   ```

### Debug Mode

```typescript
// Enable debug logging
const logger = await Logger.initialize({
  logLevel: LogLevel.DEBUG,
  enableConsoleOutput: true
});

// Check logger status
console.log('Logger ready:', logger.isReady());
console.log('Stats:', logger.getStats());
console.log('Performance:', logger.getPerformanceAnalysis());
```

## Migration Guide

### From Console Logging

```typescript
// Before
console.log('User logged in:', user.id);
console.error('API error:', error);

// After
import { info, error } from './services/logging/Logger';

info('User logged in', { userId: user.id });
error('API error', error, { endpoint: '/api/login' });
```

### From Simple File Logging

```typescript
// Before: Manual file operations
const fs = require('fs');
fs.appendFileSync('app.log', `${new Date()} - ${message}\n`);

// After: Structured logging with automatic management
logger.info(message, metadata);
```

## Support and Contributing

### Reporting Issues
When reporting issues, please include:
- Platform (iOS/Android)
- React Native/Expo version
- Logger configuration
- Performance analysis output
- Steps to reproduce

### Performance Optimization
The logger includes built-in performance monitoring. Use the performance analysis to optimize:

```typescript
const analysis = logger.getPerformanceAnalysis();
console.log('Optimization suggestions:', analysis.recommendations);
```

### Extending Functionality
The logger is designed to be extensible:

```typescript
// Custom data sanitization
const sanitizer = new LoggerDataSanitizer(config);
sanitizer.addCustomFilter((data) => {
  // Custom sanitization logic
  return sanitizedData;
});

// Custom performance metrics
const monitor = new LoggerPerformanceMonitor();
monitor.recordCustomMetric('api_calls', apiCallCount);
```

This logging module provides enterprise-grade logging capabilities with comprehensive features for mobile application development, debugging, and production monitoring.
