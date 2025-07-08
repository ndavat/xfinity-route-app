# Xfinity Router App - Comprehensive Logging System

## Overview

This project now includes a production-ready logging system that captures all application activities from startup to shutdown. The logging module provides file management, permission handling, data sanitization, performance monitoring, and crash reporting.

## 🚀 Quick Start

### 1. Install Dependencies

The logging system dependencies are already included in the project:

```bash
npm install
```

### 2. Initialize Logger in Your App

The logger is automatically initialized in `App.tsx`. It will:
- Create log files for each session
- Request storage permissions
- Set up crash reporting
- Monitor app lifecycle events

### 3. Access Logger Management

Go to **Settings** → **Logger Management** to:
- View logger statistics
- Export log files
- Share logs for debugging
- Adjust log levels
- Monitor performance

## 📱 Features Implemented

### ✅ Core Requirements Met

- **✅ New File Per Session**: Unique timestamp-based files
- **✅ Storage Permissions**: Automatic permission handling
- **✅ Multiple Log Levels**: DEBUG, INFO, WARN, ERROR, FATAL
- **✅ File Rotation**: Automatic based on size limits
- **✅ Buffer Management**: Asynchronous writing with buffering
- **✅ Performance Monitoring**: Built-in performance analysis
- **✅ Data Sanitization**: Automatic sensitive data filtering
- **✅ Crash Reporting**: Uncaught exception handling
- **✅ App Lifecycle Tracking**: Start, background, foreground events
- **✅ Export/Share**: Multiple formats (TXT, JSON, CSV)
- **✅ React Component**: Settings UI for logger management

### 📁 File Structure

```
services/
├── logging/
│   ├── Logger.ts                    # Main logger class
│   ├── LoggerTypes.ts              # Type definitions
│   ├── LoggerConfig.ts             # Configuration management
│   ├── LoggerFileManager.ts        # File operations
│   ├── LoggerPermissionManager.ts  # Permission handling
│   ├── LoggerDataSanitizer.ts      # Data sanitization
│   └── LoggerPerformanceMonitor.ts # Performance tracking
├── LoggerUtils.ts                  # Utility functions
└── index.ts                        # Main exports

components/
└── LoggerManager.tsx               # React UI component

utils/
└── appInfo.ts                      # App information utilities

test/
└── logger.test.ts                  # Comprehensive test suite
```

## 🔧 Usage Examples

### Basic Logging

```typescript
import { debug, info, warn, error, fatal } from './services';

// Simple logging
info('User logged in', { userId: '123' });
error('API call failed', apiError, { endpoint: '/api/users' });
debug('Processing data', { count: items.length });

// With error objects
try {
  await riskyOperation();
} catch (err) {
  error('Operation failed', err, {
    operation: 'riskyOperation',
    context: 'userAction'
  });
}
```

### Lifecycle Event Logging

```typescript
import { logEvent } from './services';

// Log app events
logEvent('user_login', { userId: user.id, method: 'oauth' });
logEvent('api_call', { endpoint: '/api/data', duration: 1500 });
logEvent('navigation', { from: 'home', to: 'settings' });
```

### Network Request Logging

```typescript
import { Logger } from './services';

const logger = Logger.getInstance();

// Log network activity (automatically sanitized)
logger.logNetworkActivity({
  url: 'https://api.example.com/login',
  method: 'POST',
  statusCode: 200,
  duration: 1200,
  requestHeaders: { 'Content-Type': 'application/json' },
  responseHeaders: { 'Content-Length': '1024' }
});
```

### Configuration Updates

```typescript
import { Logger, LogLevel } from './services';

const logger = Logger.getInstance();

// Change log level at runtime
await logger.setLogLevel(LogLevel.DEBUG);

// Update other settings
await logger.updateConfig({
  bufferSize: 50,
  flushInterval: 3000,
  enableNetworkLogging: true
});
```

## 📊 Logger Management UI

### Access the Logger Interface

1. Open the app
2. Navigate to **Settings**
3. Tap **Logger Management**

### Features Available

- **Performance Score**: Real-time performance monitoring
- **Statistics**: Log counts, file sizes, error rates
- **Log Level Control**: Change logging threshold
- **Export Options**: Export logs in multiple formats
- **Share Functionality**: Share current log file
- **Clear Logs**: Remove old log files

## 🔐 Data Privacy & Security

### Automatic Data Sanitization

The logger automatically removes sensitive information:

```typescript
// These patterns are automatically redacted:
- Credit card numbers: 4532-1234-5678-9012 → [REDACTED]
- Social Security Numbers: 123-45-6789 → [REDACTED]
- Email addresses: user@example.com → [REDACTED]
- API keys and tokens: Bearer abc123... → [REDACTED]
- Passwords in objects: { password: "secret" } → { password: "[REDACTED]" }
```

### Custom Filters

Add custom sensitive data patterns:

```typescript
await logger.updateConfig({
  sensitiveDataFilters: [
    'custom_secret',
    'internal_id',
    'router_password'
  ]
});
```

## 📁 File Storage

### Storage Locations

- **iOS**: `Documents/logs/` (accessible via iTunes)
- **Android**: External files directory (accessible via file manager)

### File Naming Convention

```
xfinity_app_log_2024-01-15_10-30-45.txt
```

### Example Log Entry Format

```
[2024-01-15T10:30:45.123Z] [INFO ] [main] [RouterService.checkConnection (RouterService.ts:45)] - Router connection successful | Metadata: {"ip":"192.168.1.1","responseTime":1200,"sessionId":"session_1705315845123"}
```

## ⚡ Performance Monitoring

### Automatic Performance Analysis

The logger provides real-time performance monitoring:

```typescript
const analysis = logger.getPerformanceAnalysis();

console.log(`Performance Score: ${analysis.score}/100`);
console.log('Issues:', analysis.issues);
console.log('Recommendations:', analysis.recommendations);
```

### Performance Metrics Tracked

- Memory usage
- Log processing rate
- File I/O performance
- Error rates
- Buffer efficiency

## 🧪 Testing

### Run Logger Tests

```bash
npm test logger.test.ts
```

### Test Coverage

- ✅ Basic logging functionality
- ✅ Log level filtering
- ✅ Data sanitization
- ✅ Performance monitoring
- ✅ File management
- ✅ Error handling
- ✅ Memory management
- ✅ Concurrency safety

## 🔧 Configuration Options

### Development vs Production

```typescript
// Development (verbose logging)
const logger = await initializeDevelopmentLogger();

// Production (minimal logging)
const logger = await initializeProductionLogger();

// Custom configuration
const logger = await initializeLogger({
  logLevel: LogLevel.WARN,
  maxFileSize: 5 * 1024 * 1024, // 5MB
  maxFiles: 3,
  enableNetworkLogging: false
});
```

### Runtime Configuration

All settings can be adjusted at runtime through the Logger Management UI or programmatically:

```typescript
// Via UI: Settings → Logger Management → Log Level
// Via code:
await logger.updateConfig({
  logLevel: LogLevel.ERROR,  // Only log errors and fatals
  bufferSize: 20,           // Smaller buffer
  flushInterval: 10000      // Less frequent flushes
});
```

## 🚨 Troubleshooting

### Common Issues

1. **Permission Denied Errors**
   - Check Settings → Logger Management → Storage Permission
   - Grant storage access when prompted

2. **Large File Sizes**
   - Reduce max file size in Logger Management
   - Increase log level threshold
   - Clear old logs regularly

3. **Performance Issues**
   - Monitor performance score in Logger Management
   - Follow optimization recommendations
   - Reduce log frequency for high-volume events

### Debug Information

Check logger status:

```typescript
const stats = logger.getStats();
console.log('Logger Status:', {
  isInitialized: stats.isInitialized,
  bufferSize: stats.bufferSize,
  currentFileSize: stats.performance?.currentFileSize,
  permissions: stats.permissions
});
```

## 📱 Integration Examples

### Existing Services Integration

The logger is already integrated into:

- **App.tsx**: Lifecycle events and initialization
- **SettingsScreen.tsx**: User interaction logging
- **LiveRouterService.ts**: Network operation logging

### Adding to New Services

```typescript
import { info, error, warn } from '../services';

export class MyService {
  async performOperation() {
    info('Operation started', { operation: 'myOperation' });
    
    try {
      const result = await this.doWork();
      info('Operation completed', { result: result.id, duration: 1500 });
      return result;
    } catch (err) {
      error('Operation failed', err, { 
        operation: 'myOperation',
        retryCount: 3 
      });
      throw err;
    }
  }
}
```

## 🔄 Continuous Improvement

### Performance Optimization

The logger continuously monitors its own performance and provides optimization suggestions:

- Memory usage optimization
- I/O performance tuning
- Buffer size adjustments
- Log level recommendations

### Automatic Cleanup

- Old log files are automatically removed
- Memory buffers are managed efficiently
- Storage space is monitored

## 📚 Additional Resources

- **Full Documentation**: See `LOGGER_DOCUMENTATION.md`
- **API Reference**: Type definitions in `LoggerTypes.ts`
- **Test Examples**: Comprehensive tests in `test/logger.test.ts`
- **Configuration Guide**: See `LoggerConfig.ts` for all options

## 🎯 Production Readiness

This logging system is production-ready with:

- ✅ Comprehensive error handling
- ✅ Memory management
- ✅ Performance optimization
- ✅ Security considerations
- ✅ Platform compatibility
- ✅ Extensive testing
- ✅ User-friendly management interface

The logger enhances your debugging capabilities while maintaining excellent performance and user privacy.
