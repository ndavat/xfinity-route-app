# Security & Local Network Testing

This directory contains security configurations and utilities for safe testing of the Xfinity Router App without exposing real network information or performing actual LAN scanning.

## 🛡️ Security Overview

The security configuration ensures that:

1. **No Real LAN Scanning**: All network discovery operations use mocked data
2. **Safe Test Environment**: Only local mock servers are used for testing
3. **Credential Isolation**: Test credentials are never production values
4. **Network Isolation**: External network calls are blocked during testing

## 📁 Files

- **`SecurityConfig.ts`**: Main security configuration utility
- **`NetworkSecurity.test.ts`**: Security validation tests
- **`README.md`**: This documentation file

## 🔧 Configuration

### Environment Variables (.env.test)

```bash
# Security Configuration
DISABLE_REAL_LAN_SCANNING=true
USE_NETINFO_MOCKS=true
BLOCK_EXTERNAL_NETWORK_CALLS=true

# Platform Configuration
ANDROID_USE_ADB_REVERSE=true
IOS_USE_LOCALHOST=true

# Mock Server Configuration
MOCK_SERVER_HOST=127.0.0.1
MOCK_SERVER_PORT=8081
MOCK_SERVER_URL=http://127.0.0.1:8081

# Test Credentials (NEVER use in production)
TEST_ROUTER_USERNAME=admin
TEST_ROUTER_PASSWORD=password1
TEST_WIFI_SSID=TestNetwork
```

### NetInfo Mocks

The `@react-native-community/netinfo` package is mocked to provide controlled network states:

- **wifi_connected**: Connected to WiFi with internet
- **wifi_no_internet**: Connected to WiFi without internet  
- **cellular**: Connected via cellular data
- **none**: No network connection
- **unknown**: Unknown network state

## 🚀 Setup Instructions

### 1. Android Testing with ADB Reverse

For Android device/emulator testing, set up port forwarding:

```bash
# Run this command before starting tests
npm run adb:reverse

# Or manually:
adb reverse tcp:8081 tcp:8081
```

This maps the device's `127.0.0.1:8081` to your development machine's port `8081`.

### 2. iOS Simulator Testing

iOS simulator automatically uses `localhost` for network connections, so no additional setup is required.

### 3. Mock Server

Start the mock router server for testing:

```bash
# Start mock server
npm run mock-server:start

# Stop mock server  
npm run mock-server:stop
```

## 🧪 Testing

### Running Security Tests

```bash
# Run all security tests
npm test tests/security/

# Run specific security test
npm test tests/security/NetworkSecurity.test.ts

# Run with coverage
npm run test:coverage -- tests/security/
```

### Using NetInfo Mocks in Tests

```typescript
import { NetInfoMockUtils } from '../../__mocks__/@react-native-community/netinfo';

// Reset mock state
NetInfoMockUtils.reset();

// Set network state
NetInfoMockUtils.setNetworkState('wifi_connected');

// Simulate network disconnection
NetInfoMockUtils.simulateDisconnection();

// Simulate WiFi reconnection
NetInfoMockUtils.simulateWiFiConnection();
```

### Using Security Config in Tests

```typescript
import SecurityConfig from '../security/SecurityConfig';

// Validate test environment
const validation = SecurityConfig.validateTestEnvironment();
expect(validation.valid).toBe(true);

// Get mock server URL
const mockUrl = SecurityConfig.getMockServerUrl();

// Check URL safety
const isSafe = SecurityConfig.isUrlSafeForTesting('http://127.0.0.1:8081');
```

## 🔒 Security Features

### Network Isolation

- All network calls are intercepted and redirected to mock server
- External network access is blocked during testing
- Real router IPs (192.168.x.x, 10.0.0.1) are redirected to localhost

### Credential Protection

- Test credentials are separate from production values
- Mock server only accepts predefined test credentials
- No real router passwords are used in tests

### Mock Data Safety

- Network information uses RFC 1918 private addresses
- SSIDs use generic test names
- No real device information is exposed

### Platform Security

**Android:**
- Uses ADB reverse to map local ports securely
- Device connects to 127.0.0.1:8081 (mapped to development machine)
- No external network access from device

**iOS:**
- Uses localhost connections in simulator
- Simulator network is isolated from real network
- No device networking required

## 🚨 Security Warnings

### ⚠️ Never Use in Production

This security configuration is **ONLY** for testing environments:

- Mock server has no authentication
- Test credentials are hardcoded
- Network isolation would break real functionality

### ⚠️ Environment Validation

The system validates that `NODE_ENV=test` before allowing configuration:

```typescript
if (process.env.NODE_ENV !== 'test') {
  throw new Error('SecurityConfig should only be used in test environment');
}
```

### ⚠️ Real Network Prevention

Mock implementations prevent accidental real network operations:

- NetInfo returns controlled mock data
- Router discovery is disabled
- External HTTP calls are blocked

## 🛠️ Troubleshooting

### Mock Server Won't Start

```bash
# Check if port is in use
netstat -an | grep 8081

# Kill process using port
lsof -ti:8081 | xargs kill -9
```

### ADB Reverse Issues

```bash
# Check ADB connection
adb devices

# Reset ADB server
adb kill-server
adb start-server

# Re-setup reverse
adb reverse tcp:8081 tcp:8081
```

### NetInfo Mock Issues

```bash
# Clear Jest cache
npx jest --clearCache

# Restart test with fresh mocks
npm test -- --no-cache
```

## 📚 API Reference

### SecurityConfig

- `loadSecurityConfig()`: Load configuration from environment
- `getMockServerUrl()`: Get platform-specific mock server URL
- `getMockWebSocketUrl()`: Get platform-specific WebSocket URL  
- `isUrlSafeForTesting(url)`: Validate URL safety
- `validateTestEnvironment()`: Check security settings
- `getAdbReverseCommand()`: Get ADB reverse command for Android

### NetInfoMockUtils

- `setNetworkState(state)`: Change network state
- `simulateDisconnection()`: Simulate network loss
- `simulateWiFiConnection()`: Simulate WiFi connection
- `getCurrentState()`: Get current mock state
- `reset()`: Reset to default state

## 🤝 Contributing

When adding network-related tests:

1. Always use security mocks
2. Validate environment with `validateTestEnvironment()`
3. Use mock server for router interactions
4. Never expose real network credentials
5. Document security implications

## 📄 License

This security configuration is part of the Xfinity Router App testing framework and should only be used for authorized testing purposes.
