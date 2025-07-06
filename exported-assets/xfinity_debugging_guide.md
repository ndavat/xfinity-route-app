# Comprehensive Debugging Guide for Xfinity Route App Real Mode Connection Issues

## Problem Analysis
The app is unable to connect to real mode (actual Xfinity router), likely due to network connectivity, authentication, or API endpoint issues. The app uses Axios for HTTP requests and has both mock and real mode functionality.

## Step-by-Step Debugging Protocol

### 1. Network Connectivity Diagnostics

#### A. Check Network Configuration
```bash
# Verify device is on the same network as the router
adb shell ip route get 1.1.1.1
adb shell netstat -rn
```

#### B. Test Basic Router Connectivity
```javascript
// Add to debugging utility file
const testBasicConnectivity = async (routerIP) => {
  try {
    const response = await fetch(`http://${routerIP}`, {
      method: 'GET',
      timeout: 5000,
    });
    console.log('Basic connectivity test:', response.status);
    return response.ok;
  } catch (error) {
    console.error('Basic connectivity failed:', error);
    return false;
  }
};
```

### 2. Axios Configuration Investigation

#### A. Check Current Axios Setup
- Locate the Axios configuration files
- Verify base URL configuration
- Check timeout settings
- Examine headers and authentication setup

#### B. Enhanced Axios Configuration
```javascript
// Recommended Axios configuration for router connection
const axiosConfig = {
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/html, */*',
    'User-Agent': 'XfinityRouteApp/1.0',
  },
  validateStatus: function (status) {
    return status >= 200 && status < 500; // Accept both success and client errors
  },
  maxRedirects: 5,
  httpsAgent: new https.Agent({
    rejectUnauthorized: false, // For self-signed certificates
  }),
};
```

### 3. Router API Endpoint Analysis

#### A. Common Xfinity Router Endpoints to Test
```javascript
const commonEndpoints = [
  '/api/status',
  '/api/devices',
  '/api/login',
  '/cgi-bin/status',
  '/xml/getter.xml',
  '/RgConnect.asp',
  '/api/v1/devices',
  '/admin/status',
];

// Test each endpoint
const testEndpoints = async (baseURL) => {
  for (const endpoint of commonEndpoints) {
    try {
      const response = await axios.get(`${baseURL}${endpoint}`);
      console.log(`✓ ${endpoint}: ${response.status}`);
    } catch (error) {
      console.log(`✗ ${endpoint}: ${error.message}`);
    }
  }
};
```

#### B. HTTP vs HTTPS Protocol Testing
```javascript
const testProtocols = async (routerIP) => {
  const protocols = ['http', 'https'];
  const results = {};
  
  for (const protocol of protocols) {
    try {
      const response = await axios.get(`${protocol}://${routerIP}`);
      results[protocol] = { success: true, status: response.status };
    } catch (error) {
      results[protocol] = { success: false, error: error.message };
    }
  }
  
  return results;
};
```

### 4. Authentication and Session Management

#### A. Check Authentication Flow
```javascript
// Implement comprehensive authentication testing
const testAuthentication = async (routerIP, username, password) => {
  try {
    // Test login endpoint
    const loginResponse = await axios.post(`http://${routerIP}/api/login`, {
      username,
      password,
    });
    
    // Extract session token/cookie
    const sessionToken = loginResponse.headers['set-cookie'];
    
    // Test authenticated request
    const authenticatedResponse = await axios.get(`http://${routerIP}/api/devices`, {
      headers: {
        'Cookie': sessionToken,
      },
    });
    
    return { success: true, data: authenticatedResponse.data };
  } catch (error) {
    console.error('Authentication failed:', error);
    return { success: false, error: error.message };
  }
};
```

#### B. Session Persistence Check
```javascript
// Verify session management with AsyncStorage
const checkSessionPersistence = async () => {
  try {
    const storedSession = await AsyncStorage.getItem('routerSession');
    if (storedSession) {
      const sessionData = JSON.parse(storedSession);
      console.log('Stored session:', sessionData);
      // Test if session is still valid
      return await validateSession(sessionData);
    }
    return false;
  } catch (error) {
    console.error('Session check failed:', error);
    return false;
  }
};
```

### 5. Error Handling and Logging Enhancement

#### A. Comprehensive Error Logging
```javascript
const enhancedErrorHandler = (error, context) => {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    context,
    message: error.message,
    code: error.code,
    status: error.response?.status,
    statusText: error.response?.statusText,
    headers: error.response?.headers,
    config: {
      url: error.config?.url,
      method: error.config?.method,
      timeout: error.config?.timeout,
    },
  };
  
  console.error('Enhanced Error Log:', JSON.stringify(errorInfo, null, 2));
  
  // Store error for debugging
  AsyncStorage.setItem('lastError', JSON.stringify(errorInfo));
  
  return errorInfo;
};
```

#### B. Network State Monitoring
```javascript
import NetInfo from '@react-native-async-storage/async-storage';

const monitorNetworkState = () => {
  NetInfo.addEventListener(state => {
    console.log('Network state changed:', state);
    if (!state.isConnected) {
      console.warn('Device is offline');
    }
  });
};
```

### 6. React Native Specific Debugging

#### A. Check Metro Bundler Configuration
```javascript
// Verify metro.config.js includes proper network settings
module.exports = {
  resolver: {
    assetExts: ['bin', 'txt', 'jpg', 'png', 'json'],
  },
  server: {
    enhanceMiddleware: (middleware) => {
      return (req, res, next) => {
        // Add CORS headers for local development
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return middleware(req, res, next);
      };
    },
  },
};
```

#### B. Debug Server Configuration
```javascript
// Check if debug server is properly configured
const checkDebugServer = async () => {
  try {
    const debugServerHost = await AsyncStorage.getItem('debugServerHost');
    console.log('Debug server host:', debugServerHost);
    
    // Test debug server connectivity
    const response = await fetch(`http://${debugServerHost}:8081/status`);
    console.log('Debug server status:', response.status);
  } catch (error) {
    console.error('Debug server check failed:', error);
  }
};
```

### 7. Device and Router Compatibility

#### A. Router Model Detection
```javascript
const detectRouterModel = async (routerIP) => {
  try {
    const response = await axios.get(`http://${routerIP}/api/device-info`);
    const routerInfo = response.data;
    console.log('Router model detected:', routerInfo.model);
    return routerInfo;
  } catch (error) {
    console.error('Router detection failed:', error);
    return null;
  }
};
```

#### B. API Version Compatibility
```javascript
const checkAPIVersion = async (routerIP) => {
  const apiVersions = ['v1', 'v2', 'v3'];
  
  for (const version of apiVersions) {
    try {
      const response = await axios.get(`http://${routerIP}/api/${version}/status`);
      console.log(`API ${version} is available:`, response.status);
      return version;
    } catch (error) {
      console.log(`API ${version} not available:`, error.message);
    }
  }
  
  return null;
};
```

### 8. State Management Debugging (Zustand)

#### A. Check Zustand Store State
```javascript
// Add debugging to Zustand store
const useDebugStore = () => {
  const store = useStore();
  
  useEffect(() => {
    console.log('Current store state:', store);
  }, [store]);
  
  return store;
};
```

#### B. AsyncStorage Data Verification
```javascript
const verifyAsyncStorage = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    console.log('AsyncStorage keys:', keys);
    
    for (const key of keys) {
      const value = await AsyncStorage.getItem(key);
      console.log(`${key}:`, value);
    }
  } catch (error) {
    console.error('AsyncStorage verification failed:', error);
  }
};
```

### 9. React Query Cache Investigation

#### A. Query Cache Analysis
```javascript
import { useQueryClient } from '@tanstack/react-query';

const DebugQueryCache = () => {
  const queryClient = useQueryClient();
  
  const debugQueries = () => {
    const cache = queryClient.getQueryCache();
    console.log('React Query cache:', cache.getAll());
    
    cache.getAll().forEach(query => {
      console.log('Query:', query.queryKey, 'Status:', query.state.status);
    });
  };
  
  return debugQueries;
};
```

### 10. Comprehensive Testing Script

#### A. Complete Connection Test
```javascript
const comprehensiveConnectionTest = async (routerIP, credentials) => {
  console.log('🔍 Starting comprehensive connection test...');
  
  const results = {
    basicConnectivity: false,
    protocolSupport: {},
    authentication: false,
    apiEndpoints: {},
    errors: [],
  };
  
  try {
    // Test 1: Basic connectivity
    results.basicConnectivity = await testBasicConnectivity(routerIP);
    
    // Test 2: Protocol support
    results.protocolSupport = await testProtocols(routerIP);
    
    // Test 3: Authentication
    if (credentials) {
      const authResult = await testAuthentication(routerIP, credentials.username, credentials.password);
      results.authentication = authResult.success;
      if (!authResult.success) {
        results.errors.push(authResult.error);
      }
    }
    
    // Test 4: API endpoints
    await testEndpoints(`http://${routerIP}`);
    
    // Test 5: Router model detection
    const routerModel = await detectRouterModel(routerIP);
    results.routerModel = routerModel;
    
    console.log('🔍 Connection test results:', results);
    
  } catch (error) {
    console.error('Comprehensive test failed:', error);
    results.errors.push(error.message);
  }
  
  return results;
};
```

## Implementation Priority

1. **Immediate Actions** (High Priority):
   - Implement enhanced error logging
   - Add network connectivity testing
   - Verify Axios configuration
   - Test basic router connectivity

2. **Secondary Actions** (Medium Priority):
   - Implement authentication flow testing
   - Add API endpoint discovery
   - Enhance session management
   - Add router model detection

3. **Optimization Actions** (Low Priority):
   - Implement comprehensive testing script
   - Add React Query cache debugging
   - Optimize network state monitoring
   - Add performance metrics

## Expected Outcomes

After implementing these debugging steps, you should be able to:
- Identify the specific point of failure in the connection process
- Determine if the issue is network-related, authentication-related, or API-related
- Implement appropriate fixes based on the root cause
- Enhance the overall reliability of the real mode connection

## Common Issues and Solutions

1. **CORS Issues**: Add proper CORS headers in development
2. **Self-signed Certificates**: Configure Axios to accept self-signed certificates
3. **Network Timeouts**: Increase timeout values and add retry logic
4. **Authentication Failures**: Implement proper session management and token handling
5. **API Endpoint Changes**: Add dynamic endpoint discovery and fallback mechanisms

This comprehensive debugging approach should help identify and resolve the connection issues in your Xfinity Route App.