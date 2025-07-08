import { AxiosError } from 'axios';
import { axiosInstance } from '../../utils/axiosConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Conditionally import https module for Node.js environments
let httpsModule: typeof import('https') | undefined;
if (typeof process !== 'undefined' && process.release?.name === 'node') {
  httpsModule = require('https');
}

// Type definitions
interface DiagnosticsResult {
  basicConnectivity: boolean;
  protocolSupport: {
    http?: { success: boolean; status?: number; error?: string };
    https?: { success: boolean; status?: number; error?: string };
  };
  authentication: boolean;
  apiEndpoints: Record<string, { success: boolean; status?: number; error?: string }>;
  routerModel: RouterInfo | null;
  apiVersion: string | null;
  errors: string[];
  timestamp: string;
}

interface RouterInfo {
  model?: string;
  firmware?: string;
  manufacturer?: string;
  [key: string]: any;
}

interface Credentials {
  username: string;
  password: string;
}

interface AuthenticationResult {
  success: boolean;
  data?: any;
  error?: string;
}

// Test basic connectivity to router
export const testBasicConnectivity = async (routerIP: string): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`http://${routerIP}`, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    console.log('Basic connectivity test:', response.status);
    return response.ok;
  } catch (error) {
    console.error('Basic connectivity failed:', error);
    return false;
  }
};

// Test HTTP vs HTTPS protocol support
export const testProtocols = async (routerIP: string): Promise<DiagnosticsResult['protocolSupport']> => {
  const protocols = ['http', 'https'] as const;
  const results: DiagnosticsResult['protocolSupport'] = {};
  
  for (const protocol of protocols) {
    try {
      const response = await axiosInstance.get(`${protocol}://${routerIP}`, {
        timeout: 5000,
        httpsAgent: protocol === 'https' && httpsModule ? new httpsModule.Agent({
          rejectUnauthorized: false, // For self-signed certificates
        }) : undefined,
      });
      results[protocol] = { success: true, status: response.status };
    } catch (error) {
      const axiosError = error as AxiosError;
      results[protocol] = { 
        success: false, 
        error: axiosError.message,
        status: axiosError.response?.status,
      };
    }
  }
  
  return results;
};

// Test common Xfinity router API endpoints
export const testEndpoints = async (baseURL: string): Promise<Record<string, { success: boolean; status?: number; error?: string }>> => {
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
  
  const results: Record<string, { success: boolean; status?: number; error?: string }> = {};

  for (const endpoint of commonEndpoints) {
    try {
      const response = await axiosInstance.get(`${baseURL}${endpoint}`, {
        timeout: 5000,
        validateStatus: (status) => status >= 200 && status < 500,
      });
      console.log(`✓ ${endpoint}: ${response.status}`);
      results[endpoint] = { success: true, status: response.status };
    } catch (error) {
      const axiosError = error as AxiosError;
      console.log(`✗ ${endpoint}: ${axiosError.message}`);
      results[endpoint] = { 
        success: false, 
        error: axiosError.message,
        status: axiosError.response?.status,
      };
    }
  }
  
  return results;
};

// Test authentication flow
export const testAuthentication = async (
  routerIP: string, 
  username: string, 
  password: string
): Promise<AuthenticationResult> => {
  try {
    // Test login endpoint
    const loginResponse = await axiosInstance.post(`http://${routerIP}/api/login`, {
      username,
      password,
    }, {
      timeout: 10000,
      validateStatus: (status) => status >= 200 && status < 500,
    });
    
    // Extract session token/cookie
    const sessionToken = loginResponse.headers['set-cookie'];
    
    // Store session if successful
    if (loginResponse.status === 200 && sessionToken) {
      await AsyncStorage.setItem('routerSession', JSON.stringify({
        token: sessionToken,
        timestamp: new Date().toISOString(),
      }));
    }
    
    // Test authenticated request
    const authenticatedResponse = await axiosInstance.get(`http://${routerIP}/api/devices`, {
      headers: {
        'Cookie': sessionToken,
      },
      timeout: 10000,
    });
    
    return { success: true, data: authenticatedResponse.data };
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error('Authentication failed:', axiosError);
    return { success: false, error: axiosError.message };
  }
};

// Detect router model
export const detectRouterModel = async (routerIP: string): Promise<RouterInfo | null> => {
  const possibleEndpoints = [
    '/api/device-info',
    '/api/v1/device-info',
    '/api/system/info',
    '/cgi-bin/device_info',
  ];

  for (const endpoint of possibleEndpoints) {
    try {
      const response = await axiosInstance.get(`http://${routerIP}${endpoint}`, {
        timeout: 5000,
        validateStatus: (status) => status >= 200 && status < 500,
      });
      
      if (response.status === 200 && response.data) {
        console.log('Router model detected:', response.data.model || 'Unknown');
        return response.data;
      }
    } catch (error) {
      console.error(`Router detection failed for ${endpoint}:`, error);
    }
  }
  
  return null;
};

// Check API version compatibility
export const checkAPIVersion = async (routerIP: string): Promise<string | null> => {
  const apiVersions = ['v1', 'v2', 'v3'];
  
  for (const version of apiVersions) {
    try {
      const response = await axiosInstance.get(`http://${routerIP}/api/${version}/status`, {
        timeout: 5000,
        validateStatus: (status) => status >= 200 && status < 500,
      });
      
      if (response.status === 200) {
        console.log(`API ${version} is available:`, response.status);
        return version;
      }
    } catch (error) {
      console.log(`API ${version} not available:`, (error as AxiosError).message);
    }
  }
  
  return null;
};

// Comprehensive connection test wrapper
export const comprehensiveConnectionTest = async (
  routerIP: string, 
  credentials?: Credentials
): Promise<DiagnosticsResult> => {
  console.log('🔍 Starting comprehensive connection test...');
  
  const results: DiagnosticsResult = {
    basicConnectivity: false,
    protocolSupport: {},
    authentication: false,
    apiEndpoints: {},
    routerModel: null,
    apiVersion: null,
    errors: [],
    timestamp: new Date().toISOString(),
  };
  
  try {
    // Test 1: Basic connectivity
    console.log('Testing basic connectivity...');
    results.basicConnectivity = await testBasicConnectivity(routerIP);
    
    // Test 2: Protocol support
    console.log('Testing protocol support...');
    results.protocolSupport = await testProtocols(routerIP);
    
    // Test 3: API endpoints
    console.log('Testing API endpoints...');
    const protocol = results.protocolSupport.https?.success ? 'https' : 'http';
    results.apiEndpoints = await testEndpoints(`${protocol}://${routerIP}`);
    
    // Test 4: Authentication (if credentials provided)
    if (credentials) {
      console.log('Testing authentication...');
      const authResult = await testAuthentication(
        routerIP, 
        credentials.username, 
        credentials.password
      );
      results.authentication = authResult.success;
      if (!authResult.success && authResult.error) {
        results.errors.push(`Authentication error: ${authResult.error}`);
      }
    }
    
    // Test 5: Router model detection
    console.log('Detecting router model...');
    results.routerModel = await detectRouterModel(routerIP);
    
    // Test 6: API version check
    console.log('Checking API version...');
    results.apiVersion = await checkAPIVersion(routerIP);
    
    console.log('🔍 Connection test completed. Results:', results);
    
  } catch (error) {
    console.error('Comprehensive test failed:', error);
    results.errors.push((error as Error).message);
  }
  
  // Store results for debugging
  try {
    await AsyncStorage.setItem('lastDiagnosticsResult', JSON.stringify(results));
  } catch (storageError) {
    console.error('Failed to store diagnostics result:', storageError);
  }
  
  return results;
};

// Main exported function to run diagnostics
export const runDiagnostics = async (
  routerIP: string, 
  credentials?: Credentials
): Promise<DiagnosticsResult> => {
  if (!routerIP) {
    throw new Error('Router IP address is required');
  }
  
  // Validate IP address format
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(routerIP)) {
    throw new Error('Invalid IP address format');
  }
  
  // Run comprehensive connection test
  return await comprehensiveConnectionTest(routerIP, credentials);
};

// Export all test functions for individual use
export default {
  runDiagnostics,
  testBasicConnectivity,
  testProtocols,
  testEndpoints,
  testAuthentication,
  detectRouterModel,
  checkAPIVersion,
  comprehensiveConnectionTest,
};
