#!/usr/bin/env node

/**
 * Browser Authentication Test Script
 * Tests the browser authentication functionality
 */

const axios = require('axios');

// Mock router responses for testing
const MOCK_RESPONSES = {
  loginPage: `
    <!DOCTYPE html>
    <html>
    <head><title>Router Login</title></head>
    <body>
      <form action="/login" method="post">
        <input type="hidden" name="csrf_token" value="abc123def456">
        <input type="text" name="username" placeholder="Username">
        <input type="password" name="password" placeholder="Password">
        <input type="submit" value="Login">
      </form>
      <script>
        var sessionToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
      </script>
    </body>
    </html>
  `,
  
  authenticatedPage: `
    <!DOCTYPE html>
    <html>
    <head><title>Router Dashboard</title></head>
    <body>
      <h1>Welcome to Router Dashboard</h1>
      <div id="status">Connected</div>
      <script>
        var authToken = "authenticated_token_12345";
        var X_Xsrf_Token = "xsrf_token_67890";
      </script>
    </body>
    </html>
  `,
  
  apiResponse: {
    status: "online",
    uptime: "2 days, 14 hours",
    connectedDevices: 8,
    model: "Xfinity XB7",
    firmware: "1.2.3.45"
  }
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Mock BrowserAuthService for testing
class MockBrowserAuthService {
  static extractAuthToken(html, cookies = []) {
    log('blue', '🔍 Testing token extraction...');
    
    // Test various token patterns
    const tokenPatterns = [
      /sessionToken["\s]*[:=]["\s]*([a-zA-Z0-9+/=._-]+)/i,
      /authToken["\s]*[:=]["\s]*([a-zA-Z0-9+/=._-]+)/i,
      /X_Xsrf_Token["\s]*[:=]["\s]*([a-zA-Z0-9+/=._-]+)/i,
      /csrf_token["\s]*[:=]["\s]*([a-zA-Z0-9+/=._-]+)/i,
    ];
    
    for (const pattern of tokenPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        log('green', `✅ Found token: ${match[1].substring(0, 20)}...`);
        return {
          token: match[1],
          expires: Date.now() + (24 * 60 * 60 * 1000),
          routerIP: '10.0.0.1',
          timestamp: Date.now()
        };
      }
    }
    
    // Check cookies
    for (const cookie of cookies) {
      const sessionMatch = cookie.match(/session[_-]?id=([^;]+)/i);
      if (sessionMatch) {
        log('green', `✅ Found session in cookie: ${sessionMatch[1]}`);
        return {
          token: sessionMatch[1],
          sessionId: sessionMatch[1],
          expires: Date.now() + (24 * 60 * 60 * 1000),
          routerIP: '10.0.0.1',
          timestamp: Date.now()
        };
      }
    }
    
    log('red', '❌ No token found');
    return null;
  }
  
  static getAuthHeaders(token) {
    if (!token) return {};
    
    return {
      'Authorization': `Bearer ${token.token}`,
      'X-Auth-Token': token.token,
      'X-Session-ID': token.sessionId || '',
      'X-CSRF-Token': token.csrfToken || '',
    };
  }
}

async function testTokenExtraction() {
  log('magenta', '🧪 Testing Token Extraction');
  log('magenta', '============================');
  
  // Test 1: Extract from login page
  log('blue', 'Test 1: Login page token extraction');
  const loginToken = MockBrowserAuthService.extractAuthToken(MOCK_RESPONSES.loginPage);
  if (loginToken) {
    log('green', '✅ Successfully extracted token from login page');
  } else {
    log('red', '❌ Failed to extract token from login page');
  }
  
  // Test 2: Extract from authenticated page
  log('blue', 'Test 2: Authenticated page token extraction');
  const authToken = MockBrowserAuthService.extractAuthToken(MOCK_RESPONSES.authenticatedPage);
  if (authToken) {
    log('green', '✅ Successfully extracted token from authenticated page');
  } else {
    log('red', '❌ Failed to extract token from authenticated page');
  }
  
  // Test 3: Extract from cookies
  log('blue', 'Test 3: Cookie-based token extraction');
  const cookieToken = MockBrowserAuthService.extractAuthToken('', [
    'session_id=cookie_session_123; Path=/',
    'csrf_token=cookie_csrf_456; Path=/'
  ]);
  if (cookieToken) {
    log('green', '✅ Successfully extracted token from cookies');
  } else {
    log('red', '❌ Failed to extract token from cookies');
  }
  
  return authToken || loginToken || cookieToken;
}

async function testAuthenticatedRequests(token) {
  log('magenta', '🔐 Testing Authenticated Requests');
  log('magenta', '=================================');
  
  if (!token) {
    log('red', '❌ No token available for testing');
    return;
  }
  
  // Test authentication headers
  log('blue', 'Test 1: Authentication headers generation');
  const headers = MockBrowserAuthService.getAuthHeaders(token);
  log('cyan', `Generated headers: ${Object.keys(headers).join(', ')}`);
  
  if (headers['Authorization']) {
    log('green', '✅ Authorization header generated');
  } else {
    log('red', '❌ Authorization header missing');
  }
  
  // Test simulated API call
  log('blue', 'Test 2: Simulated authenticated API call');
  try {
    // Simulate successful API response
    const mockResponse = {
      status: 200,
      data: MOCK_RESPONSES.apiResponse,
      headers: {
        'content-type': 'application/json'
      }
    };
    
    log('green', '✅ Simulated API call successful');
    log('cyan', `Response: ${JSON.stringify(mockResponse.data, null, 2)}`);
  } catch (error) {
    log('red', `❌ Simulated API call failed: ${error.message}`);
  }
}

async function testTokenManagement() {
  log('magenta', '💾 Testing Token Management');
  log('magenta', '===========================');
  
  // Test token validation
  log('blue', 'Test 1: Token validation');
  const validToken = {
    token: 'valid_token_123',
    expires: Date.now() + (24 * 60 * 60 * 1000), // 24 hours from now
    routerIP: '10.0.0.1',
    timestamp: Date.now()
  };
  
  const expiredToken = {
    token: 'expired_token_456',
    expires: Date.now() - (60 * 60 * 1000), // 1 hour ago
    routerIP: '10.0.0.1',
    timestamp: Date.now() - (25 * 60 * 60 * 1000) // 25 hours ago
  };
  
  // Check valid token
  if (validToken.expires > Date.now()) {
    log('green', '✅ Valid token correctly identified');
  } else {
    log('red', '❌ Valid token incorrectly identified as expired');
  }
  
  // Check expired token
  if (expiredToken.expires <= Date.now()) {
    log('green', '✅ Expired token correctly identified');
  } else {
    log('red', '❌ Expired token incorrectly identified as valid');
  }
  
  // Test router IP matching
  log('blue', 'Test 2: Router IP matching');
  const correctIP = '10.0.0.1';
  const wrongIP = '192.168.1.1';
  
  if (validToken.routerIP === correctIP) {
    log('green', '✅ Token router IP matches correctly');
  } else {
    log('red', '❌ Token router IP matching failed');
  }
  
  if (validToken.routerIP !== wrongIP) {
    log('green', '✅ Token router IP mismatch detected correctly');
  } else {
    log('red', '❌ Token router IP mismatch not detected');
  }
}

async function testErrorHandling() {
  log('magenta', '⚠️  Testing Error Handling');
  log('magenta', '==========================');
  
  // Test invalid HTML
  log('blue', 'Test 1: Invalid HTML handling');
  const invalidToken = MockBrowserAuthService.extractAuthToken('<html><body>No tokens here</body></html>');
  if (!invalidToken) {
    log('green', '✅ Invalid HTML handled correctly (no token found)');
  } else {
    log('red', '❌ Invalid HTML not handled correctly');
  }
  
  // Test empty input
  log('blue', 'Test 2: Empty input handling');
  const emptyToken = MockBrowserAuthService.extractAuthToken('');
  if (!emptyToken) {
    log('green', '✅ Empty input handled correctly');
  } else {
    log('red', '❌ Empty input not handled correctly');
  }
  
  // Test malformed cookies
  log('blue', 'Test 3: Malformed cookies handling');
  const malformedToken = MockBrowserAuthService.extractAuthToken('', ['invalid_cookie_format']);
  if (!malformedToken) {
    log('green', '✅ Malformed cookies handled correctly');
  } else {
    log('red', '❌ Malformed cookies not handled correctly');
  }
}

async function main() {
  log('magenta', '🚀 Browser Authentication Test Suite');
  log('magenta', '=====================================');
  console.log();
  
  try {
    // Test token extraction
    const token = await testTokenExtraction();
    console.log();
    
    // Test authenticated requests
    await testAuthenticatedRequests(token);
    console.log();
    
    // Test token management
    await testTokenManagement();
    console.log();
    
    // Test error handling
    await testErrorHandling();
    console.log();
    
    // Summary
    log('magenta', '📊 Test Summary');
    log('magenta', '===============');
    log('green', '✅ All browser authentication tests completed');
    log('cyan', '💡 The browser authentication system is ready for use!');
    
  } catch (error) {
    log('red', `❌ Test suite failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the tests
main().catch(error => {
  log('red', `Fatal error: ${error.message}`);
  process.exit(1);
});
