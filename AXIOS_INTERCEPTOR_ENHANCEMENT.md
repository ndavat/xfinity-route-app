# Axios Interceptor Enhancement Summary

## Overview
Enhanced the global axios interceptor in `utils/axiosConfig.ts` with comprehensive request timing, error classification, logging, and retry logic with exponential back-off.

## New Features Implemented

### 1. **Request Timing & Gateway IP Detection**
- Every request now gets a unique request ID for tracking
- Automatic gateway IP detection and attachment via `X-Gateway-Ip` header
- Precise request timing measurement from start to completion

### 2. **Comprehensive Error Classification**
The interceptor now classifies errors into specific types:
- **`timeout`** - Request timeouts (ECONNABORTED)
- **`dns`** - DNS resolution failures (ENOTFOUND, EAI_NONAME)
- **`connection_refused`** - Connection refused errors (ECONNREFUSED)
- **`cors`** - CORS policy violations
- **`network`** - General network errors
- **`server`** - HTTP 5xx server errors
- **`client`** - HTTP 4xx client errors
- **`unknown`** - Unclassified errors

### 3. **New LogStore Service**
Created `services/debug/LogStore.ts` with AsyncStorage backing:
- Persistent storage of up to 100 log entries
- Structured logging with timestamps and metadata
- Support for request/response/error/retry log types
- Advanced filtering and querying capabilities
- Log statistics and export functionality

### 4. **Intelligent Retry Logic**
- Configurable retry attempts via `Config.api.maxRetryAttempts`
- Exponential back-off delay: `2^attempt * 100ms`
- Comprehensive retry logging with attempt counts and delays
- Preserves request ID across retry attempts

### 5. **Enhanced Logging**
All requests now log:
- **Request logs**: URL, method, gateway IP, timing, configuration
- **Response logs**: Status codes, response time, headers
- **Retry logs**: Attempt number, back-off delay, retry reason
- **Error logs**: Classified error type, response time, final status

## Files Modified

### `utils/axiosConfig.ts`
- Added TypeScript interface extension for axios metadata
- Enhanced request interceptor with gateway IP detection and logging
- Implemented intelligent retry logic with exponential back-off
- Added comprehensive error classification system
- Integrated with new LogStore for persistent debugging

### `utils/config.ts`
- Fixed `__DEV__` global variable declaration for TypeScript compatibility

### `services/debug/LogStore.ts` (New)
- AsyncStorage-backed log persistence
- Singleton pattern for global access
- Rich querying and filtering capabilities
- Log statistics and analytics
- Export functionality for debugging

## Configuration

The retry behavior is controlled by the existing configuration:
```typescript
Config.api.maxRetryAttempts // Default: 3 attempts
```

## Usage Examples

### Accessing Log Data
```typescript
import { logStore, getRecentLogs, getLogsByErrorType } from '../services/debug/LogStore';

// Get recent logs
const recentLogs = await getRecentLogs(20);

// Get all timeout errors
const timeoutErrors = await getLogsByErrorType('timeout');

// Get logs for a specific request
const requestLogs = await logStore.getLogsByRequestId('req_123456789_abc123');

// Get statistics
const stats = await logStore.getLogStats();
```

### Log Entry Structure
```typescript
interface LogEntry {
  id: string;
  timestamp: string;
  type: 'request' | 'response' | 'error' | 'retry';
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
  config?: object;
  metadata?: Record<string, any>;
}
```

## Benefits

1. **Enhanced Debugging**: Comprehensive logging enables detailed analysis of network issues
2. **Improved Reliability**: Intelligent retry logic with exponential back-off handles transient failures
3. **Better Monitoring**: Detailed error classification helps identify common failure patterns
4. **Performance Insights**: Request timing data helps identify performance bottlenecks
5. **Persistent Debugging**: AsyncStorage-backed logs survive app restarts

## Integration

The enhanced interceptor is automatically active for all axios requests through the shared `axiosInstance`. No changes required in existing code that uses the axios instance.

For debugging and monitoring, import the LogStore utilities where needed to access comprehensive request/response logs and statistics.
