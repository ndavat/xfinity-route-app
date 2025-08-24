## 📝 How to Author MCP Specs

MCP (Model-Driven Component Programming) specs define and test app behaviors through various scenarios. Here's a comprehensive guide:

### 1. MCP File Structure

Create `.mcp` files in the `specs/` directory:
- `router_connection.mcp` - Router connectivity scenarios
- `device_blocking.mcp` - Device control scenarios
- `real_time_monitoring.mcp` - Real-time data scenarios

### 2. Writing Scenarios

**Structure**: Use Given-When-Then format with specific testID references:

```gherkin
## Feature: Router Connection Management

### Scenario: Successful Router Connection
**Given** the user is on the connection screen  
**When** the user enters a valid IP address in the input field with `testID="ip-input"`  
**And** the user taps the Connect button with `testID="connect-button"`  
**Then** the app should establish a connection to the router  
**And** the RouterStatus component with `testID="router-status"` should display "Connected"  
**And** the status indicator with `testID="connection-indicator"` should show green/active state
```

### 3. Best Practices

- **Specific testIDs**: Always use unique, descriptive `testID` attributes
- **Error Scenarios**: Include negative test cases (timeouts, invalid inputs)
- **UI Requirements**: Document required UI components at the end of each spec
- **Data Validation**: Test with real and mock data scenarios

### 4. Required UI Components

List all components with their testIDs:
```markdown
### UI Components Required:
- IP input field: `testID="ip-input"`
- Connect button: `testID="connect-button"`
- Router status display: `testID="router-status"`
- Connection indicator: `testID="connection-indicator"`
```

## 🏃 Running Tests

### Unit Tests (Jest)

Run component and service unit tests:

```bash
# Run all unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

**Configuration**: Uses `jest.config.js` with React Native preset and TypeScript support.

### MCP Tests (TestSprite)

Run specification-based tests generated from `.mcp` files:

```bash
# Generate and run MCP tests
npm run test:mcp
```

**Configuration**: Uses `testsprite.mcp.json`:
- **Runner**: Jest
- **Source Directory**: `.` (root)
- **Spec Directory**: `specs/`
- **Output Directory**: `tests/mcp/`
- **Setup Files**: `tests/mcp/setupMcp.ts`

### E2E Tests (Detox)

Run end-to-end tests on device/simulator:

```bash
# Build E2E tests
npm run e2e:build

# Run E2E tests
npm run e2e:test

# Platform-specific E2E tests
npm run e2e:android:debug
npm run e2e:ios:debug
```

**Configuration**: Uses `detox.config.js` and `e2e/jest.config.js`.

### Test Environments

- **Unit Tests**: `jsdom` environment for React Native components
- **MCP Tests**: React Native environment with mocked dependencies
- **E2E Tests**: Device/simulator environment with Detox

### Mock Server (for Testing)

```bash
# Start mock router server
npm run mock-server:start

# Stop mock router server
npm run mock-server:stop

# Setup ADB reverse proxy (Android)
npm run adb:reverse
```

## 🛠 Troubleshooting

### React Native + Jest Issues

#### Metro Bundler Conflicts
```bash
# Clear Metro cache
npx expo start --clear

# Reset npm cache
npm start -- --reset-cache
```

#### TypeScript Integration
```javascript
// jest.config.js - Ensure proper TypeScript setup
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@expo|expo|@react-navigation)/)'
  ]
};
```

### MCP-Specific Issues

#### TestSprite Configuration
```json
// testsprite.mcp.json - Verify configuration
{
  "runner": "jest",
  "jestConfig": "./jest.config.js",
  "reactNative": true,
  "setupFiles": ["./tests/mcp/setupMcp.ts"]
}
```

#### MCP Test Generation
```bash
# If MCP tests fail to generate
npx testsprite-mcp-plugin generateCodeAndExecute --config testsprite.mcp.json --verbose
```

### Network & WebSocket Issues

#### Flipper Network Intercepts
```javascript
// Disable Flipper in test/debug environments
// In App.tsx or main component
if (__DEV__ && !global.__TEST__) {
  require('flipper-plugin-react-native-performance');
}
```

#### WebSocket Polyfills
```javascript
// tests/mcp/setupMcp.ts - Add WebSocket polyfills
import { TextEncoder, TextDecoder } from 'util';
import WS from 'ws';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.WebSocket = WS;

// Mock WebSocket for React Native
jest.mock('react-native/Libraries/WebSocket/WebSocket', () => ({
  __esModule: true,
  default: WS,
}));
```

### Android-Specific Issues

#### Network Security Configuration
```xml
<!-- android/app/src/main/res/xml/network_security_config.xml -->
<network-security-config>
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="true">10.0.2.2</domain>
    <domain includeSubdomains="true">localhost</domain>
  </domain-config>
</network-security-config>
```

#### ADB Reverse Proxy
```bash
# Setup port forwarding for local API testing
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3000 tcp:3000
```

### Expo-Specific Issues

#### Constants and Environment
```javascript
// Mock expo-constants in tests
jest.mock('expo-constants', () => ({
  default: {
    executionEnvironment: 'standalone',
    manifest: {
      extra: {
        supabaseUrl: 'https://mock-url.supabase.co',
        supabaseAnonKey: 'mock-key'
      }
    }
  }
}));
```

### Performance Optimization

#### Test Performance
```javascript
// Use fake timers for better test performance
jest.useFakeTimers();

// In setupMcp.ts
beforeEach(() => {
  jest.clearAllTimers();
});
```

#### Memory Management
```javascript
// Clear mocks between tests
afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});
```

### Debugging Tips

1. **Enable Verbose Logging**:
   ```bash
   npm run test -- --verbose
   ```

2. **Debug Specific Tests**:
   ```bash
   npm run test -- --testNamePattern="Router Connection"
   ```

3. **Check Network Permissions**:
   - Ensure Android manifest includes INTERNET permission
   - Verify iOS Info.plist has NSLocalNetworkUsageDescription



﻿# Xfinity Router App

A React Native Expo application for managing and monitoring Xfinity routers. This app provides a user-friendly interface to connect to your router, view connected devices, control device access, and manage router settings.

## 🚀 Features

- **Router Connection Management**: 
  - Connect to your Xfinity router via IP address
  - Improved real mode connection with enhanced error handling
  - Automatic connection validation and diagnostics
  - Support for both HTTP and HTTPS connections

- **Device Monitoring**: 
  - View all connected devices with real-time status
  - Enhanced device data validation
  - Improved error handling for device connections
  - Reliable device status tracking

- **Device Control**: 
  - Block/unblock devices
  - Set custom device names
  - Schedule device access
  - Temporary blocking with duration
  - Robust error handling for device operations

- **Router Information**: 
  - Display router status
  - Real-time connection monitoring
  - Detailed network diagnostics
  - Enhanced error logging and debugging

- **Settings Management**: 
  - Configure router credentials
  - Toggle between real and mock modes
  - Store custom device names
  - Persistent configuration storage

## 🆕 Recent Updates

### Version 1.0.0 (Current)

#### New Features
- Enhanced real router connection support
- Improved device data validation
- Better error handling and user feedback
- Detailed connection diagnostics
- Integration with React Query for efficient data fetching
- Zustand state management implementation

#### Bug Fixes
- Fixed device navigation issues
- Resolved undefined device data errors
- Improved error handling in DeviceControlScreen
- Enhanced type checking for device properties

#### Technical Improvements
- Added comprehensive error logging
- Enhanced TypeScript type safety
- Improved AsyncStorage handling
- Better state management with Zustand
- Optimized data fetching with React Query

## 🛠 Technology Stack

### Frontend Framework
- **React Native**: 0.79.3
- **Expo SDK**: 53.0.11
- **TypeScript**: 5.6.0

### State Management & Data Fetching
- **Zustand**: 5.0.6 (State management)
- **React Query**: 5.81.5 (Data fetching and caching)
- **AsyncStorage**: 2.1.2 (Local data persistence)
- **React Hooks**: Built-in state management

### Navigation
- **React Navigation**: 6.x
  - Native Stack Navigator (6.11.0)
  - Bottom Tabs Navigator (6.6.1)

### UI Components
- **Custom Components**: Alert, Button, ConfirmModal, TextInput
- **React Native Safe Area Context**: 5.4.0
- **Expo Vector Icons**: 14.0.4
- **Lucide React Native**: 0.513.0 (Modern icons)
- **Sonner Native**: 0.20.0 (Toast notifications)
- **React Native Reanimated**: 3.17.4
- **React Native Gesture Handler**: 2.24.0

### Networking & Data
- **Axios**: 1.9.0 (HTTP client)
- **Node HTML Parser**: 7.0.1 (Router response parsing)
- **Supabase**: 2.50.0 (Backend services)

### Testing & Quality Assurance
- **Jest**: 30.0.4 (Unit testing framework)
- **Testing Library**: React Native testing utilities
- **TestSprite MCP**: 0.0.9 (MCP specification testing)
- **Detox**: 20.40.2 (E2E testing framework)
- **TypeScript**: 5.8.3 (Type checking)

### Additional Libraries
- **Expo Camera**: 16.1.8 (QR code scanning for router setup)
- **Expo Linear Gradient**: 14.1.5 (UI gradients)
- **React Native SVG**: 15.11.2
- **DateTimePicker**: 8.3.0
- **Slider**: 4.5.6
- **Picker**: 2.11.0

## 🔐 Permissions

This app requires specific network permissions to function properly:

### Android Permissions
- **INTERNET**: Required for HTTP/HTTPS communication with your Xfinity router
- **ACCESS_NETWORK_STATE**: Needed to detect network connectivity and validate connection status
- **ACCESS_WIFI_STATE**: Used to gather information about your Wi-Fi network and router

### iOS Permissions
- **NSLocalNetworkUsageDescription**: Required for iOS 14+ to access devices on your local network (your router)
- **NSBonjourServices**: Enables discovery of network services including HTTP/HTTPS services on your router
- **NSAppTransportSecurity**: Configured to allow secure connections to local network devices while maintaining security standards

### Why These Permissions Are Needed
The Xfinity Router App connects directly to your router's web interface to:
- Monitor connected devices in real-time
- Control device access (block/unblock functionality)
- Retrieve router status and configuration
- Manage network settings and device names

All network communication stays within your local network - no external servers are used for router management.

## 📋 Prerequisites

Before installing the app, make sure you have:

- **Node.js**: 18.x or higher
- **npm**: 9.x or higher (or yarn)
- **Expo CLI**: Latest version
- **Android Studio** (for Android development)
- **Xcode** (for iOS development)

## 👨‍💻 Developer Setup

### 1. Environment Setup
```bash
# Clone the repository
git clone <repository-url>
cd xfinity-route-app

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
```

### 2. Development Environment
```bash
# Start the development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

### 3. Testing Setup
```bash
# Run unit tests
npm run test

# Generate and run MCP tests
npm run test:mcp

# Setup E2E testing
npm run e2e:build
npm run e2e:test
```

## 🤝 Contributing

### New Contributor Onboarding

1. **Watch the Video Demo**: See [NotionDemoGuide.md](./NotionDemoGuide.md) for the comprehensive video walkthrough

2. **Understand the Architecture**:
   - React Native + Expo for cross-platform development
   - Zustand for state management
   - React Query for data fetching
   - Jest + TestSprite MCP for testing
   - Detox for E2E testing

3. **Development Workflow**:
   - Create feature branches from `main`
   - Write MCP specs before implementing features
   - Ensure all tests pass before submitting PR
   - Follow TypeScript strict mode guidelines

### Code Standards

- **TypeScript**: Use strict mode, provide proper types
- **Testing**: Write unit tests, MCP specs, and E2E tests
- **Styling**: Follow React Native styling conventions
- **Git**: Use conventional commit messages

### Submitting Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Write MCP specs for your feature in `specs/` directory
4. Implement the feature with proper testIDs
5. Run all test suites: `npm run test && npm run test:mcp && npm run e2e:test`
6. Submit a pull request with detailed description

## 📚 Additional Resources

- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Expo Documentation](https://docs.expo.dev/)
- [TestSprite MCP Guide](https://testsprite.com/mcp)
- [Detox E2E Testing](https://github.com/wix/Detox)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)
