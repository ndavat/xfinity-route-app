# E2E Testing Setup Guide

This guide covers the setup and usage of Detox for End-to-End testing in the Xfinity Router App.

## Prerequisites

1. **Android SDK** - Make sure Android SDK is installed and configured
2. **Android Emulator** - Create an Android Virtual Device (AVD)
3. **Java Development Kit (JDK)** - Required for Android builds

## Setup

### 1. Install Dependencies

Dependencies are already installed in the project:
- `detox` - E2E testing framework

### 2. Android Emulator Setup

Create an Android Virtual Device:
```bash
# List available system images
avdmanager list target

# Create AVD (adjust API level as needed)
avdmanager create avd -n Pixel_API_34 -k "system-images;android-34;google_apis;x86_64"
```

Update the `detox.config.js` emulator configuration to match your AVD name.

### 3. Environment Configuration

The app is configured with the following Android permissions for E2E testing:
- `ACCESS_WIFI_STATE` - Required for router connectivity testing
- `INTERNET` - Network access
- `ACCESS_NETWORK_STATE` - Network state monitoring

## Running E2E Tests

### Available Scripts

```bash
# Build the app for testing
npm run e2e:build

# Run all E2E tests
npm run e2e:test

# Run specific configurations
npm run e2e:android:debug    # Android emulator debug build
npm run e2e:android:release  # Android emulator release build (recommended)
npm run e2e:ios:debug        # iOS simulator debug build
npm run e2e:ios:release      # iOS simulator release build
```

### Running Tests Step by Step

1. **Start Android Emulator**
   ```bash
   emulator -avd Pixel_API_34
   ```

2. **Build the App**
   ```bash
   npm run e2e:build
   ```

3. **Run Tests**
   ```bash
   npm run e2e:android:release
   ```

## Test Configuration

### Detox Configuration (detox.config.js)

The configuration includes:
- **Android Release Build**: Uses `npx expo run:android --variant release --no-bundler`
- **Emulator Setup**: Configured for `Pixel_API_34` AVD
- **Port Forwarding**: Metro bundler port 8081 is forwarded
- **Test Timeout**: 120 seconds for app launch and operations

### TestSprite MCP Integration

The E2E testing is integrated with TestSprite MCP:
```json
{
  "e2e": { 
    "tool": "detox", 
    "config": "detox.config.js" 
  }
}
```

## Test Structure

Tests are located in the `e2e/` directory:
- `e2e/starter.test.js` - Main app functionality tests
- `e2e/jest.config.js` - Jest configuration for Detox

### Example Test Cases

1. **App Launch**: Verifies the app launches successfully
2. **Connection Status**: Checks network status indicators
3. **Navigation**: Tests screen navigation
4. **Network Permissions**: Validates WiFi access permissions

## Troubleshooting

### Common Issues

1. **Emulator Not Found**
   - Ensure AVD name matches configuration
   - Check emulator is running: `adb devices`

2. **Build Failures**
   - Clear Expo cache: `npx expo start --clear`
   - Rebuild: `npm run e2e:build`

3. **Test Timeouts**
   - Increase timeout in `detox.config.js`
   - Ensure emulator has sufficient resources

4. **Permission Issues**
   - Verify Android permissions in `app.config.js`
   - Check `androidTestOnly` configuration

### Debug Mode

Enable debug logging:
```bash
DEBUG="detox:*" npm run e2e:test
```

## Continuous Integration

For CI/CD pipelines, consider:
- Using headless emulator: `emulator -avd Pixel_API_34 -no-window`
- Parallel test execution configuration
- Artifact collection for failed tests

## Additional Resources

- [Detox Documentation](https://wix.github.io/Detox/)
- [Expo Development Build](https://docs.expo.dev/development/build/)
- [Android Emulator Setup](https://developer.android.com/studio/run/managing-avds)
