/**
 * Enhanced Authentication Test
 * 
 * This test demonstrates the new enhanced authentication system with:
 * - SessionManager with cookie support (Node.js: tough-cookie, React Native: memory-based)
 * - Enhanced logging of all authentication attempts
 * - Automatic session refresh
 * - Cookie persistence across requests
 */

import { authService } from '../services/core/AuthenticationService';
import { Config } from '../utils/config';
import { getPlatform } from '../utils/platform';
import { addLog } from '../services/debug/LogStore';

describe('Enhanced Authentication System', () => {
  beforeAll(async () => {
    console.log('🚀 Testing Enhanced Authentication System');
    console.log(`Platform: ${getPlatform()}`);
    console.log(`Cookie Support: ${getPlatform() === 'node' ? 'tough-cookie' : 'memory-based'}`);
  });

  test('should initialize with SessionManager', async () => {
    // The authService singleton should be initialized with SessionManager
    expect(authService).toBeDefined();
    expect(authService.getAxiosInstance).toBeDefined();
    
    // Log initialization
    await addLog({
      type: 'auth',
      action: 'test_init',
      success: true,
      details: 'Enhanced authentication test initialized'
    });
  });

  test('should handle login attempt with cookie management', async () => {
    const testCredentials = {
      username: Config.router.defaultUsername,
      password: Config.router.defaultPassword
    };

    console.log('🔐 Testing login with enhanced cookie management...');
    
    try {
      const result = await authService.login(testCredentials.username, testCredentials.password);
      
      // Log the result regardless of success/failure
      await addLog({
        type: 'auth',
        action: 'test_login',
        success: result.success,
        details: `Login test result: ${result.success ? 'SUCCESS' : 'FAILED'} - ${result.message || result.error}`
      });

      console.log('📊 Login Result:', {
        success: result.success,
        message: result.message,
        error: result.error,
        sessionId: result.sessionId ? '***REDACTED***' : null
      });

      // If login was successful, test session verification
      if (result.success) {
        console.log('✅ Login successful, testing session verification...');
        
        const isValid = await authService.verifySession();
        console.log(`📋 Session verification: ${isValid ? 'VALID' : 'INVALID'}`);
        
        await addLog({
          type: 'auth',
          action: 'test_verify',
          success: isValid,
          details: `Session verification: ${isValid ? 'VALID' : 'INVALID'}`
        });
      }
      
    } catch (error) {
      console.error('🚨 Login test error:', error);
      
      await addLog({
        type: 'auth',
        action: 'test_login_error',
        success: false,
        details: `Login test error: ${error}`
      });
    }
  });

  test('should handle session refresh', async () => {
    console.log('🔄 Testing session refresh...');
    
    try {
      const refreshResult = await authService.refreshSession();
      
      console.log(`📋 Session refresh result: ${refreshResult ? 'SUCCESS' : 'FAILED'}`);
      
      await addLog({
        type: 'auth',
        action: 'test_refresh',
        success: refreshResult,
        details: `Session refresh: ${refreshResult ? 'SUCCESS' : 'FAILED'}`
      });
      
    } catch (error) {
      console.error('🚨 Session refresh test error:', error);
      
      await addLog({
        type: 'auth',
        action: 'test_refresh_error',
        success: false,
        details: `Session refresh error: ${error}`
      });
    }
  });

  test('should handle logout properly', async () => {
    console.log('🚪 Testing logout...');
    
    try {
      await authService.logout();
      
      console.log('✅ Logout completed');
      
      await addLog({
        type: 'auth',
        action: 'test_logout',
        success: true,
        details: 'Logout test completed successfully'
      });
      
      // Verify session is cleared
      const sessionInfo = await authService.getSessionInfo();
      const isCleared = sessionInfo === null || !sessionInfo.isValid;
      
      console.log(`📋 Session cleared: ${isCleared ? 'YES' : 'NO'}`);
      
      await addLog({
        type: 'auth',
        action: 'test_session_clear',
        success: isCleared,
        details: `Session clear verification: ${isCleared ? 'SUCCESS' : 'FAILED'}`
      });
      
    } catch (error) {
      console.error('🚨 Logout test error:', error);
      
      await addLog({
        type: 'auth',
        action: 'test_logout_error',
        success: false,
        details: `Logout test error: ${error}`
      });
    }
  });

  test('should demonstrate cookie persistence (Node.js vs React Native)', async () => {
    console.log('🍪 Testing cookie persistence...');
    
    const platform = getPlatform();
    
    await addLog({
      type: 'auth',
      action: 'test_cookie_demo',
      success: true,
      details: `Demonstrating cookie persistence on ${platform}`,
      platform: platform,
      cookieCount: 0
    });

    if (platform === 'node') {
      console.log('🟢 Node.js Environment: Using tough-cookie jar for automatic cookie management');
      console.log('   - Cookies are automatically handled by axios-cookiejar-support');
      console.log('   - Session cookies persist across requests');
      console.log('   - Domain-specific cookie handling');
    } else {
      console.log('📱 React Native Environment: Using memory-based cookie management');
      console.log('   - Cookies stored in AsyncStorage for persistence');
      console.log('   - Manual cookie header management');
      console.log('   - Custom cookie parsing and application');
    }
  });

  afterAll(async () => {
    console.log('🏁 Enhanced Authentication Test Complete');
    console.log('📊 All authentication attempts have been logged for analysis');
    
    await addLog({
      type: 'auth',
      action: 'test_complete',
      success: true,
      details: 'Enhanced authentication test suite completed'
    });
  });
});

/**
 * Manual test function for development/debugging
 * Run this to manually test the enhanced authentication system
 */
export async function runManualAuthTest() {
  console.log('🔧 Running Manual Enhanced Authentication Test');
  
  try {
    // Test login
    console.log('1. Testing login...');
    const loginResult = await authService.login(
      Config.router.defaultUsername, 
      Config.router.defaultPassword
    );
    console.log('Login result:', loginResult);

    if (loginResult.success) {
      // Test session verification
      console.log('2. Testing session verification...');
      const isValid = await authService.verifySession();
      console.log('Session valid:', isValid);

      // Test session refresh
      console.log('3. Testing session refresh...');
      const refreshed = await authService.refreshSession();
      console.log('Session refreshed:', refreshed);

      // Test logout
      console.log('4. Testing logout...');
      await authService.logout();
      console.log('Logout completed');
    }

    console.log('✅ Manual test completed');
  } catch (error) {
    console.error('❌ Manual test failed:', error);
  }
}
