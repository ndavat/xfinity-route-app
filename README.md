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

### Version 1.1.0 (June 2025)

#### New Features
- Enhanced real router connection support
- Improved device data validation
- Better error handling and user feedback
- Detailed connection diagnostics

#### Bug Fixes
- Fixed device navigation issues
- Resolved undefined device data errors
- Improved error handling in DeviceControlScreen
- Enhanced type checking for device properties

#### Technical Improvements
- Added comprehensive error logging
- Enhanced TypeScript type safety
- Improved AsyncStorage handling
- Better state management for device data

## 🛠 Technology Stack

### Frontend Framework
- **React Native**: 0.76.9
- **Expo SDK**: 53.0.0
- **TypeScript**: 5.6.0

### Navigation
- **React Navigation**: 6.x
  - Native Stack Navigator
  - Bottom Tabs (future implementation)

### UI Components
- **Custom Components**: Alert, Button, ConfirmModal, TextInput
- **React Native Safe Area Context**: 4.14.0
- **Expo Vector Icons**: 14.0.4
- **Lucide React Native**: 0.513.0 (Modern icons)
- **Sonner Native**: 0.20.0 (Toast notifications)

### State Management & Storage
- **AsyncStorage**: 1.23.1 (Local data persistence)
- **React Hooks**: Built-in state management

### Networking & Data
- **Axios**: 1.9.0 (HTTP client)
- **Node HTML Parser**: 7.0.1 (Router response parsing)

### Additional Libraries
- **Expo Camera**: 16.0.18 (QR code scanning for router setup)
- **Expo Linear Gradient**: 14.0.2 (UI gradients)
- **React Native Gesture Handler**: 2.21.0
- **React Native Reanimated**: 3.16.1
- **React Native SVG**: 15.8.0

## 📋 Prerequisites

Before installing the app, make sure you have:

- **Node.js**: 18.x or higher
- **npm**: 9.x or higher (or yarn)
- **Expo CLI**: Latest version
- **Git**: For cloning the repository

### For Mobile Development
- **iOS**: Xcode 14+ (macOS only)
- **Android**: Android Studio with SDK 33+

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd xfinity-route-app
```

### 2. Install Dependencies
```bash
# Install npm dependencies
npm install

# Or using yarn
yarn install
```

### 3. Install Expo CLI (if not already installed)
```bash
npm install -g @expo/cli
```

## 🏃‍♂️ Running the Application

### Development Mode
```bash
# Start the Expo development server
npm start

# Run in real router mode (no mocking)
npm start -- --no-mock

# Run with detailed logging
npm start -- --verbose
```

### Production Mode
```bash
# Build for production
npm run build

# Run production build
npm run start:prod
```

### Platform-Specific Commands

#### Web Browser
```bash
npm run web
# or
npx expo start --web
```

#### iOS Simulator (macOS only)
```bash
npm run ios
# or
npx expo run:ios
```

#### Android Emulator
```bash
npm run android
# or
npx expo run:android
```

### Mobile Device Testing

1. Install **Expo Go** app on your mobile device:
   - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
   - [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. Scan the QR code displayed in your terminal with:
   - **iOS**: Camera app or Expo Go
   - **Android**: Expo Go app

## 🔧 Configuration

### Router Connection
```typescript
// Default router configuration (.env.dev)
EXPO_PUBLIC_DEFAULT_ROUTER_IP=10.0.0.1
EXPO_PUBLIC_DEFAULT_USERNAME=admin
EXPO_PUBLIC_DEFAULT_PASSWORD=password1
```

### Debug Mode
```typescript
// Enable debug logging
EXPO_PUBLIC_DEBUG_MODE=true

// Force real router mode
EXPO_PUBLIC_MOCK_DATA_MODE=false
EXPO_PUBLIC_FORCE_REAL_MODE=true
```

### Router Setup

1. **Find Your Router IP**: Usually determined by your network configuration (default: `10.0.0.1` or `192.168.1.1`)
2. **Default Credentials**: 
   - Username: Configured in environment variables (default: `admin`)
   - Password: Set per your router configuration (check router label)
3. **Configure in App**: Use the Settings screen to update router details

### Environment Variables

The app uses environment variables for configuration. Create a `.env` file in the root directory:

```env
# Router Configuration
EXPO_PUBLIC_DEFAULT_ROUTER_IP=10.0.0.1
EXPO_PUBLIC_DEFAULT_USERNAME=admin
EXPO_PUBLIC_DEFAULT_PASSWORD=your_router_password

# API Configuration
EXPO_PUBLIC_API_TIMEOUT=15000
EXPO_PUBLIC_CONNECTION_TIMEOUT=5000

# App Configuration
EXPO_PUBLIC_APP_NAME=Xfinity Router App
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_DEBUG_MODE=false
EXPO_PUBLIC_MOCK_DATA_MODE=false

# Development Settings
EXPO_PUBLIC_ENABLE_DIAGNOSTICS=true
EXPO_PUBLIC_ENABLE_ADVANCED_SETTINGS=false

# Network Settings
EXPO_PUBLIC_MAX_RETRY_ATTEMPTS=3
EXPO_PUBLIC_RETRY_DELAY=1000

# Storage Keys (for consistency)
EXPO_PUBLIC_ROUTER_CONFIG_KEY=xfinity_router_config
EXPO_PUBLIC_DEVICE_NAMES_KEY=xfinity_device_names

# Security Settings
EXPO_PUBLIC_ENABLE_HTTPS=false
EXPO_PUBLIC_VALIDATE_SSL=false
```

**Note**: Copy `.env.dev` to `.env` and update the values according to your router configuration. All configuration can also be changed through the app's Settings screen.

## ⚙️ Configuration System

The app uses a centralized configuration system that supports environment variables and provides smart defaults:

### Configuration Features

- **Environment Variable Support**: All settings can be configured via `.env` file
- **Smart Defaults**: Fallback values are provided for all configuration options
- **Runtime Validation**: Configuration is validated on app startup
- **Type Safety**: Full TypeScript support for all configuration options
- **Centralized Management**: Single source of truth for all app settings

### Configuration File Structure

The configuration system is located in `utils/config.ts` and provides:

```typescript
// Router Configuration
Config.router.defaultIp          // Default router IP address
Config.router.defaultUsername    // Default router username
Config.router.defaultPassword    // Default router password
Config.router.enableHttps        // HTTPS support flag

// API Configuration  
Config.api.timeout              // Request timeout in milliseconds
Config.api.connectionTimeout    // Connection timeout
Config.api.maxRetryAttempts     // Maximum retry attempts
Config.api.retryDelay          // Delay between retries

// App Configuration
Config.app.name                // Application name
Config.app.version             // Application version
Config.app.debugMode           // Debug mode flag
Config.app.mockDataMode        // Mock data mode for testing

// Development Settings
Config.development.enableDiagnostics        // Enable diagnostic tools
Config.development.enableAdvancedSettings   // Show advanced options

// Storage Configuration
Config.storage.routerConfigKey   // AsyncStorage key for router config
Config.storage.deviceNamesKey    // AsyncStorage key for device names
```

### Configuration Utilities

The `ConfigUtils` object provides helper functions:

- `ConfigUtils.isDevelopment()` - Check if in development mode
- `ConfigUtils.isDiagnosticsEnabled()` - Check if diagnostics are enabled
- `ConfigUtils.isMockDataMode()` - Check if mock data mode is active
- `ConfigUtils.getDefaultRouterConfig()` - Get default router configuration
- `ConfigUtils.getApiConfig()` - Get API configuration for axios
- `ConfigUtils.validateConfig()` - Validate all configuration settings

### Environment Files

- `.env` - Main environment configuration (not committed to git)
- `.env.dev` - Development environment template and example values
- `.env.example` - Example environment file (deprecated, use `.env.dev`)

## 🔄 Recent Updates

### Version 1.0.0 - Environment Configuration Update

**Major Changes:**
- **Environment Variable Support**: All router and app configuration moved to `.env` files
- **Centralized Configuration**: New `utils/config.ts` provides type-safe configuration management
- **Removed Hardcoded Values**: All hardcoded router IPs, usernames, and passwords removed
- **Configuration Validation**: Runtime validation ensures configuration integrity
- **Smart Defaults**: Fallback values provided for all configuration options

**Migration from Hardcoded Values:**
- Router IP: Now configurable via `EXPO_PUBLIC_DEFAULT_ROUTER_IP` 
- Username: Now configurable via `EXPO_PUBLIC_DEFAULT_USERNAME`
- Password: Now configurable via `EXPO_PUBLIC_DEFAULT_PASSWORD`
- Timeouts: Now configurable via `EXPO_PUBLIC_API_TIMEOUT` and `EXPO_PUBLIC_CONNECTION_TIMEOUT`
- App Settings: Debug mode, mock data, and advanced settings now configurable

**Benefits:**
- **Security**: No hardcoded credentials in source code
- **Flexibility**: Easy configuration for different environments
- **Maintainability**: Centralized configuration management
- **Type Safety**: Full TypeScript support for all settings
- **Consistency**: Unified approach to configuration across the app

## 📁 Project Structure

```
xfinity-route-app/
├── assets/               # App icons and images
│   ├── adaptive-icon.png # Android adaptive icon
│   ├── favicon.png      # Web favicon
│   ├── icon.png         # Main app icon
│   └── splash-icon.png  # Splash screen
├── components/          # Reusable UI components
│   ├── Alert.tsx
│   ├── Button.tsx
│   ├── ConfirmModal.tsx
│   ├── EnvironmentAlert.tsx
│   └── TextInput.tsx
├── screens/            # Main application screens
│   ├── DeviceControlScreen.tsx
│   ├── DevicesScreen.tsx
│   ├── HomeScreen.tsx
│   └── SettingsScreen.tsx
├── services/          # Business logic and API services
│   └── RouterConnectionService.ts
├── types/            # TypeScript type definitions
│   └── Device.ts
├── utils/           # Utility functions and helpers
│   ├── config.ts
│   └── helpers.ts
├── scripts/         # Build and development scripts
│   └── generate-icons.js
├── app.json        # Expo configuration
├── eas.json       # EAS Build configuration
└── package.json   # Dependencies and scripts
```

## 🏗️ Building for Production

### Android Production Build (.aab)

1. Install EAS CLI globally:
```bash
npm install -g eas-cli
```

2. Login to your Expo account:
```bash
eas login
```

3. Configure EAS build:
```bash
eas build:configure
```

4. Create a production build:
```bash
eas build --platform android --profile production
eas build --profile apk --platform android
```

The build will be processed on Expo's servers. You can monitor progress:
- Through the CLI output
- On Expo website: https://expo.dev/builds
- Final .aab file will be available for download upon completion

### iOS Production Build

Coming soon...

## 🎨 App Icons

The app includes the following icon assets:

- **app icon** (`icon.png`): 1024x1024px main app icon
- **adaptive icon** (`adaptive-icon.png`): 1024x1024px Android adaptive icon
- **favicon** (`favicon.png`): 196x196px web browser favicon
- **splash icon** (`splash-icon.png`): 2048x2048px splash screen image

To regenerate icons:
```bash
node scripts/generate-icons.js
```

## Additional Resources
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Android App Bundle Guide](https://docs.expo.dev/build-reference/android-builds/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the **0BSD License** - see the [LICENSE](LICENSE) file for details.

## 🔗 Useful Links

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [React Navigation](https://reactnavigation.org/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 📞 Support

For support and questions:
- Create an issue in this repository
- Check the troubleshooting section above
- Review Expo documentation for platform-specific issues

---

**Note**: This app is designed for educational and personal use. Ensure you have proper authorization before accessing router administration interfaces.
