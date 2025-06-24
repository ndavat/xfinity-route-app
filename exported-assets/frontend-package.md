# Enhanced React Native Frontend - Package.json and New Dependencies

## package.json (Frontend Updates)

```json
{
  "name": "xfinity-route-app",
  "version": "1.1.0",
  "main": "expo/AppEntry.js",
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "web": "expo start --web"
  },
  "dependencies": {
    "expo": "~53.0.0",
    "react": "18.3.1",
    "react-native": "0.76.9",
    "expo-router": "~4.0.9",
    
    "expo-secure-store": "~14.0.0",
    "expo-local-authentication": "~15.0.0",
    "expo-camera": "~16.0.18",
    "expo-linear-gradient": "~14.0.2",
    
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/native-stack": "^6.9.0",
    "react-native-safe-area-context": "4.14.0",
    "react-native-screens": "^3.31.0",
    
    "axios": "^1.9.0",
    "react-native-async-storage": "^1.23.1",
    
    "lucide-react-native": "^0.513.0",
    "react-native-svg": "15.8.0",
    "sonner-native": "^0.20.0",
    "react-native-gesture-handler": "~2.21.0",
    "react-native-reanimated": "~3.16.1",
    
    "date-fns": "^2.30.0",
    "react-native-modal": "^13.0.1",
    "react-native-picker-select": "^8.1.0"
  },
  "devDependencies": {
    "@babel/core": "^7.20.0",
    "@types/react": "~18.2.45",
    "@types/react-native": "~0.73.0",
    "typescript": "~5.6.0"
  }
}
```

## Updated .env (Frontend Configuration)

```env
# Backend Configuration
EXPO_PUBLIC_BACKEND_URL=http://192.168.1.100:3001
EXPO_PUBLIC_API_TIMEOUT=15000

# Router Configuration
EXPO_PUBLIC_DEFAULT_ROUTER_IP=http://10.0.0.1
EXPO_PUBLIC_DEFAULT_USERNAME=admin
EXPO_PUBLIC_DEFAULT_PASSWORD=password1

# App Configuration
EXPO_PUBLIC_APP_NAME=Xfinity Router App
EXPO_PUBLIC_APP_VERSION=1.1.0
EXPO_PUBLIC_DEBUG_MODE=true

# Live Mode Configuration (Enable by default as requested)
EXPO_PUBLIC_MOCK_DATA_MODE=false
EXPO_PUBLIC_FORCE_LIVE_MODE=true
EXPO_PUBLIC_ENABLE_MOCK_TOGGLE=true

# Security Configuration
EXPO_PUBLIC_BIOMETRIC_AUTH_ENABLED=true
EXPO_PUBLIC_REQUIRE_PIN_FALLBACK=true
EXPO_PUBLIC_SESSION_TIMEOUT=1800000

# Storage Keys
EXPO_PUBLIC_ROUTER_CONFIG_KEY=xfinity_router_config_secure
EXPO_PUBLIC_DEVICE_NAMES_KEY=xfinity_device_names
EXPO_PUBLIC_USER_PREFERENCES_KEY=xfinity_user_preferences
EXPO_PUBLIC_SCHEDULE_CONFIG_KEY=xfinity_schedule_config

# Development Settings
EXPO_PUBLIC_ENABLE_DIAGNOSTICS=true
EXPO_PUBLIC_ENABLE_ADVANCED_SETTINGS=true
EXPO_PUBLIC_LOG_LEVEL=debug
```

## types/Device.ts (Enhanced)

```typescript
export interface Device {
  id: string;
  name: string;
  customName?: string; // User-assigned friendly name
  ip: string | null;
  mac: string;
  connectionType: 'WiFi' | 'Ethernet' | 'Unknown';
  status: 'connected' | 'disconnected';
  lastSeen: string;
  isBlocked: boolean;
  blockSchedule?: BlockSchedule;
  deviceType?: 'phone' | 'laptop' | 'tablet' | 'smart_tv' | 'gaming_console' | 'other';
  manufacturer?: string;
  signalStrength?: number; // For WiFi devices
}

export interface BlockSchedule {
  enabled: boolean;
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  days: number[]; // 0-6 (Sunday-Saturday)
  duration?: 'permanent' | '1hour' | '2hours' | '4hours' | '8hours' | '24hours';
  timezone?: string;
}

export interface RouterCredentials {
  routerIP: string;
  username: string;
  password: string;
  lastConnected?: string;
}

export interface UserPreferences {
  enableBiometricAuth: boolean;
  requirePinFallback: boolean;
  defaultView: 'dashboard' | 'devices' | 'settings';
  notifications: {
    deviceBlocked: boolean;
    deviceConnected: boolean;
    routerOffline: boolean;
  };
  theme: 'light' | 'dark' | 'system';
}

export interface AppMode {
  isLiveMode: boolean;
  canToggle: boolean;
  lastSwitched?: string;
}
```