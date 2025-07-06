/**
 * Test file to demonstrate the enhanced authentication functionality
 * 
 * Key features tested:
 * 1. Cookie extraction and storage using helper functions
 * 2. Automatic axios instance cookie header updates
 * 3. Automatic re-login when session verification fails
 */

import { authService } from '../services/core/AuthenticationService';
import { Config } from '../utils/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage for testing
const mockAsyncStorage = {
  storage: {} as Record<string, string>,
  
  getItem: async (key: string) => {
    return mockAsyncStorage.storage[key] || null;
  },
  
  setItem: async (key: string, value: string) => {
    mockAsyncStorage.storage[key] = value;
  },
  
  removeItem: async (key: string) => {
    delete mockAsyncStorage.storage[key];
  },
  
  clear: async () => {
    mockAsyncStorage.storage = {};
  }
};

// Replace AsyncStorage with mock for testing
(global as any).AsyncStorage = mockAsyncStorage;

async function testAuthenticationFlow() {
  console.log('=== Testing Enhanced Authentication Service ===\n');
  
  // Test 1: Login with cookie extraction
  console.log('1. Testing login with automatic cookie extraction:');
  const loginResult = await authService.login('admin', 'password');
  console.log('   Login result:', loginResult);
  console.log('   Session ID extracted:', loginResult.sessionId);
  
  // Check if axios instance has cookie header set
  const axiosInstance = authService.getAxiosInstance();
  console.log('   Axios Cookie header:', axiosInstance.defaults.headers.common['Cookie']);
  
  // Test 2: Session verification
  console.log('\n2. Testing session verification:');
  const isValid = await authService.verifySession();
  console.log('   Session valid:', isValid);
  
  // Test 3: Simulate expired session with auto-login
  console.log('\n3. Testing automatic re-login when session expires:');
  console.log('   Setting Config.app.saveCredentials to true...');
  Config.app.saveCredentials = true;
  
  // Clear session to simulate expiry
  await AsyncStorage.removeItem('router_session');
  console.log('   Session cleared, attempting verification...');
  
  const reloginResult = await authService.verifySession();
  console.log('   Auto re-login successful:', reloginResult);
  
  // Test 4: Session refresh
  console.log('\n4. Testing session refresh:');
  const refreshResult = await authService.refreshSession();
  console.log('   Session refresh successful:', refreshResult);
  
  // Test 5: Check stored credentials
  console.log('\n5. Checking stored credentials:');
  const storedCreds = await AsyncStorage.getItem('router_credentials');
  console.log('   Credentials stored:', storedCreds !== null);
  
  // Test 6: Logout
  console.log('\n6. Testing logout:');
  await authService.logout();
  const sessionAfterLogout = await authService.getSessionInfo();
  console.log('   Session cleared:', sessionAfterLogout === null);
  console.log('   Axios Cookie header cleared:', !axiosInstance.defaults.headers.common['Cookie']);
  
  console.log('\n=== All tests completed ===');
}

// Example usage of the enhanced authentication service
async function demonstrateUsage() {
  console.log('\n=== Usage Example ===\n');
  
  // Enable credential saving
  Config.app.saveCredentials = true;
  
  // Initial login
  const result = await authService.login('admin', 'password123');
  if (result.success) {
    console.log('✓ Login successful');
    
    // Get axios instance with automatic cookie handling
    const axios = authService.getAxiosInstance();
    
    // Make authenticated requests - cookies are automatically included
    try {
      const response = await axios.get('/api/devices');
      console.log('✓ Authenticated request successful');
    } catch (error) {
      console.error('✗ Request failed:', error);
    }
    
    // Session will be automatically refreshed before expiry
    // If session expires, automatic re-login will occur when saveCredentials is true
  }
}

// Key improvements implemented:
console.log('\n=== Key Improvements ===');
console.log('1. Cookie extraction logic moved to helper functions in cookieHelpers.ts');
console.log('2. axiosInstance.defaults.headers.Cookie automatically updated on every login/set-cookie');
console.log('3. Automatic re-login when verifySession() fails and Config.app.saveCredentials is true');
console.log('4. Session cookies are automatically extracted from any response with set-cookie header');
console.log('5. Clean separation of concerns with dedicated cookie management utilities');

export { testAuthenticationFlow, demonstrateUsage };
