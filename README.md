# Xfinity Router App

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

### Additional Libraries
- **Expo Camera**: 16.1.8 (QR code scanning for router setup)
- **Expo Linear Gradient**: 14.1.5 (UI gradients)
- **React Native SVG**: 15.11.2
- **DateTimePicker**: 8.3.0
- **Slider**: 4.5.6
- **Picker**: 2.11.0

## 📋 Prerequisites

Before installing the app, make sure you have:

- **Node.js**: 18.x or higher
- **npm**: 9.x or higher (or yarn)
- **Expo CLI**: Latest version
