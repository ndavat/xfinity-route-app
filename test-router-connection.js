#!/usr/bin/env node

/**
 * Router Connection Test Script
 * This script helps diagnose network connectivity issues with your Xfinity router
 */

const axios = require('axios');

// Common router IP addresses to test
const ROUTER_IPS = [
  '10.0.0.1',      // Xfinity default
  '192.168.1.1',   // Common default
  '192.168.0.1',   // Another common default
  '192.168.1.254', // Some routers use this
  '10.1.10.1'      // Some Xfinity routers
];

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

async function testRouterConnection(ip) {
  try {
    log('blue', `🔍 Testing connection to ${ip}...`);
    
    const response = await axios.get(`http://${ip}`, {
      timeout: 5000,
      validateStatus: () => true,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'XfinityRouterApp-Test/1.0'
      }
    });
    
    log('green', `✅ SUCCESS: Router responded at ${ip}`);
    log('cyan', `   Status: ${response.status} ${response.statusText}`);
    log('cyan', `   Content-Type: ${response.headers['content-type'] || 'unknown'}`);
    
    // Check if it looks like a router interface
    const contentType = response.headers['content-type'] || '';
    const isHTML = contentType.includes('text/html');
    const responseText = response.data ? response.data.toString().substring(0, 200) : '';
    const looksLikeRouter = responseText.toLowerCase().includes('router') || 
                           responseText.toLowerCase().includes('gateway') ||
                           responseText.toLowerCase().includes('xfinity') ||
                           responseText.toLowerCase().includes('comcast');
    
    if (isHTML && looksLikeRouter) {
      log('green', `   🎯 This appears to be a router web interface!`);
    } else if (isHTML) {
      log('yellow', `   ⚠️  This is a web server, but may not be a router`);
    }
    
    return { success: true, ip, status: response.status, isRouter: looksLikeRouter };
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      log('red', `❌ FAILED: Connection refused at ${ip} (nothing listening on port 80)`);
    } else if (error.code === 'ETIMEDOUT') {
      log('red', `❌ FAILED: Connection timeout at ${ip} (host unreachable or slow)`);
    } else if (error.code === 'ENOTFOUND') {
      log('red', `❌ FAILED: Host not found at ${ip} (invalid IP address)`);
    } else if (error.code === 'ENETUNREACH') {
      log('red', `❌ FAILED: Network unreachable at ${ip} (routing issue)`);
    } else if (error.code === 'ERR_NETWORK') {
      log('red', `❌ FAILED: Network error at ${ip} (general network issue)`);
    } else {
      log('red', `❌ FAILED: ${error.message} at ${ip}`);
    }
    
    return { success: false, ip, error: error.code || error.message };
  }
}

async function main() {
  log('magenta', '🚀 Xfinity Router Connection Test');
  log('magenta', '=====================================');
  console.log();
  
  log('blue', 'Testing common router IP addresses...');
  console.log();
  
  const results = [];
  
  for (const ip of ROUTER_IPS) {
    const result = await testRouterConnection(ip);
    results.push(result);
    console.log();
  }
  
  // Summary
  log('magenta', '📊 SUMMARY');
  log('magenta', '===========');
  
  const successful = results.filter(r => r.success);
  const routers = successful.filter(r => r.isRouter);
  
  if (routers.length > 0) {
    log('green', `✅ Found ${routers.length} router(s):`);
    routers.forEach(r => {
      log('green', `   • ${r.ip} (Status: ${r.status})`);
    });
  } else if (successful.length > 0) {
    log('yellow', `⚠️  Found ${successful.length} web server(s), but they may not be routers:`);
    successful.forEach(r => {
      log('yellow', `   • ${r.ip} (Status: ${r.status})`);
    });
  } else {
    log('red', '❌ No accessible web servers found at common router IP addresses');
  }
  
  console.log();
  log('cyan', '💡 TROUBLESHOOTING TIPS:');
  log('cyan', '• Make sure your device is connected to the router\'s WiFi network');
  log('cyan', '• Try accessing the router IP in a web browser');
  log('cyan', '• Check if the router\'s web interface is enabled');
  log('cyan', '• Restart the router if necessary');
  log('cyan', '• Some routers use different IP addresses - check router label');
  
  if (routers.length > 0) {
    console.log();
    log('green', `🎯 RECOMMENDED: Use IP address ${routers[0].ip} in your app configuration`);
  }
}

// Run the test
main().catch(error => {
  log('red', `Fatal error: ${error.message}`);
  process.exit(1);
});
