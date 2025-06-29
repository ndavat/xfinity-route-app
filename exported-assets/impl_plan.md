# Xfinity Router App - Implementation Plan

## Project Overview

This document outlines the technical design and implementation plan for enhancing the Xfinity Router App with new features including router restart functionality, mock mode configuration, device control screens, and device blocking capabilities.

**Tech Stack:** React Native + Expo  
**Target Platform:** Android  
**Default Mode:** Live Mode (real router API)  
**Mock Mode:** TestData simulation (configurable via settings)  
**Environment:** Production builds use .env configuration

---

## 📋 Table of Contents

1. [Current Architecture Analysis](#current-architecture-analysis)
2. [Feature Implementation Plans](#feature-implementation-plans)
3. [Environment Configuration & Production Setup](#environment-configuration--production-setup)
4. [Technical Architecture](#technical-architecture)
5. [Implementation Timeline](#implementation-timeline)
6. [Best Practices & Refactoring](#best-practices--refactoring)
7. [Resources & References](#resources--references)
8. [Implementation Instructions & Help](#implementation-instructions--help)

---

## 🏗️ Current Architecture Analysis

### Assumed Project Structure
```
xfinity-route-app/
├── src/
│   ├── components/           # Reusable UI components
│   ├── screens/             # Screen components
│   ├── services/            # API and data services
│   ├── utils/               # Utility functions
│   ├── types/               # TypeScript type definitions
│   └── navigation/          # Navigation configuration
├── TestData/                # Mock HTML files
│   ├── devices.html
│   ├── dashboard.html
│   └── ...
├── assets/                  # Images, fonts, etc.
└── App.js                   # Main app entry point
```

### Key Components to Enhance/Create
- Dashboard/Home Screen
- Router Settings Screen
- Device Control Screen
- Device List Component
- Mock Mode Toggle Component

---

## 🚀 Feature Implementation Plans

## 1. Restart Router Implementation

### 1.1 Technical Requirements
- [ ] Router restart API endpoint integration
- [ ] Mock mode simulation for restart functionality
- [ ] Error handling and timeout management
- [ ] User feedback with loading states and confirmation

### 1.2 Implementation Steps

#### API Service Layer
```typescript
// src/services/RouterService.ts
export interface RouterService {
  restartRouter(): Promise<RestartResult>;
  isRestartSupported(): boolean;
}

export interface RestartResult {
  success: boolean;
  message: string;
  estimatedDowntime?: number;
}

export class LiveRouterService implements RouterService {
  async restartRouter(): Promise<RestartResult> {
    try {
      const response = await fetch('/api/router/restart', {
        method: 'POST',
        timeout: 30000,
      });
      
      if (response.ok) {
        return {
          success: true,
          message: 'Router restart initiated successfully',
          estimatedDowntime: 120 // seconds
        };
      }
      
      throw new Error('Restart request failed');
    } catch (error) {
      return {
        success: false,
        message: `Restart failed: ${error.message}`
      };
    }
  }
}

export class MockRouterService implements RouterService {
  async restartRouter(): Promise<RestartResult> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      success: true,
      message: 'Router restart simulated successfully',
      estimatedDowntime: 120
    };
  }
}
```

#### UI Component
```typescript
// src/components/RestartRouterButton.tsx
import React, { useState } from 'react';
import { Alert, ActivityIndicator } from 'react-native';

interface Props {
  routerService: RouterService;
}

export const RestartRouterButton: React.FC<Props> = ({ routerService }) => {
  const [isRestarting, setIsRestarting] = useState(false);

  const handleRestart = async () => {
    Alert.alert(
      'Restart Router',
      'This will restart your router and temporarily disconnect all devices. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Restart', 
          style: 'destructive',
          onPress: performRestart 
        }
      ]
    );
  };

  const performRestart = async () => {
    setIsRestarting(true);
    try {
      const result = await routerService.restartRouter();
      
      Alert.alert(
        result.success ? 'Success' : 'Error',
        result.message,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to restart router');
    } finally {
      setIsRestarting(false);
    }
  };

  return (
    <TouchableOpacity 
      style={styles.restartButton}
      onPress={handleRestart}
      disabled={isRestarting}
    >
      {isRestarting ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text style={styles.buttonText}>Restart Router</Text>
      )}
    </TouchableOpacity>
  );
};
```

---

## 2. Mock Mode Configuration via Router Settings

### 2.1 Technical Requirements
- [ ] App defaults to Live Mode on first launch
- [ ] Toggle switch in Router Settings to enable Mock Mode
- [ ] Persistent mock mode state (AsyncStorage) with app reload
- [ ] Mock mode indicator on dashboard
- [ ] Service layer switching based on mode
- [ ] Environment configuration (.env) for production builds

### 2.2 Implementation Steps

#### Mock Mode Context
```typescript
// src/contexts/MockModeContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import * as Updates from 'expo-updates';

interface MockModeContextType {
  isMockMode: boolean;
  toggleMockMode: () => Promise<void>;
  isLoading: boolean;
}

const MockModeContext = createContext<MockModeContextType | undefined>(undefined);

export const MockModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMockMode, setIsMockMode] = useState(false); // Default to Live Mode
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMockModeState();
  }, []);

  const loadMockModeState = async () => {
    try {
      const savedMode = await AsyncStorage.getItem('mockMode');
      // Only set to mock mode if explicitly saved as 'true', otherwise default to Live Mode
      setIsMockMode(savedMode === 'true');
    } catch (error) {
      console.error('Failed to load mock mode state:', error);
      // On error, default to Live Mode
      setIsMockMode(false);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMockMode = async () => {
    try {
      const newMode = !isMockMode;
      await AsyncStorage.setItem('mockMode', newMode.toString());
      
      // Show confirmation dialog for app reload
      Alert.alert(
        'Mode Changed',
        `Switched to ${newMode ? 'Mock' : 'Live'} Mode. The app will reload to apply changes.`,
        [
          {
            text: 'Reload Now',
            onPress: () => {
              setIsMockMode(newMode);
              // Reload the app to apply mode changes
              if (Updates.isEnabled) {
                Updates.reloadAsync();
              } else {
                // For development, we can just update state
                setIsMockMode(newMode);
              }
            }
          },
          {
            text: 'Later',
            style: 'cancel',
            onPress: () => {
              // Revert the AsyncStorage change if user cancels
              AsyncStorage.setItem('mockMode', isMockMode.toString());
            }
          }
        ]
      );
    } catch (error) {
      console.error('Failed to save mock mode state:', error);
      Alert.alert('Error', 'Failed to change mode. Please try again.');
    }
  };

  return (
    <MockModeContext.Provider value={{ isMockMode, toggleMockMode, isLoading }}>
      {children}
    </MockModeContext.Provider>
  );
};

export const useMockMode = () => {
  const context = useContext(MockModeContext);
  if (!context) {
    throw new Error('useMockMode must be used within MockModeProvider');
  }
  return context;
};
```

#### Router Settings Screen Enhancement
```typescript
// src/screens/RouterSettingsScreen.tsx
import React, { useState } from 'react';
import { View, Text, Switch, Alert, ActivityIndicator } from 'react-native';
import { useMockMode } from '../contexts/MockModeContext';

export const RouterSettingsScreen: React.FC = () => {
  const { isMockMode, toggleMockMode } = useMockMode();
  const [isChanging, setIsChanging] = useState(false);

  const handleModeToggle = async () => {
    setIsChanging(true);
    try {
      await toggleMockMode();
    } catch (error) {
      Alert.alert('Error', 'Failed to change mode. Please try again.');
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Existing settings */}
      
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Mock Mode</Text>
          <Text style={styles.settingDescription}>
            Use test data instead of live router connection
          </Text>
          <Text style={styles.currentMode}>
            Current: {isMockMode ? 'Mock Mode' : 'Live Mode'} (Default: Live)
          </Text>
        </View>
        <View style={styles.switchContainer}>
          {isChanging ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Switch
              value={isMockMode}
              onValueChange={handleModeToggle}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={isMockMode ? '#f5dd4b' : '#f4f3f4'}
              disabled={isChanging}
            />
          )}
        </View>
      </View>
      
      <View style={styles.modeNote}>
        <Text style={styles.noteText}>
          ⚠️ Changing mode will reload the app to apply changes
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // ...existing styles...
  currentMode: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  modeNote: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFEAA7',
    borderWidth: 1,
    borderRadius: 4,
    padding: 12,
    marginTop: 16,
  },
  noteText: {
    fontSize: 12,
    color: '#856404',
    textAlign: 'center',
  },
  switchContainer: {
    minWidth: 50,
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
  },
});
```

#### Mock Mode Indicator Component
```typescript
// src/components/MockModeIndicator.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { useMockMode } from '../contexts/MockModeContext';

export const MockModeIndicator: React.FC = () => {
  const { isMockMode } = useMockMode();

  if (!isMockMode) return null;

  return (
    <View style={styles.indicator}>
      <Text style={styles.indicatorText}>🧪 Mock Mode Active</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  indicator: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFEAA7',
    borderWidth: 1,
    borderRadius: 4,
    padding: 8,
    margin: 16,
    alignItems: 'center',
  },
  indicatorText: {
    color: '#856404',
    fontSize: 12,
    fontWeight: '600',
  },
});
```

---

## 3. Device Control Screen Implementation

### 3.1 Technical Requirements
- [ ] Device list dropdown/picker on dashboard
- [ ] Navigation to Device Control screen
- [ ] Device details display (MAC, IP, status, hostname)
- [ ] Block/Unblock functionality
- [ ] Traffic viewing capability
- [ ] Live and Mock mode support

### 3.2 Implementation Steps

#### Device Types and Models
```typescript
// src/types/Device.ts
export interface Device {
  id: string;
  mac: string;
  ip: string;
  hostname: string;
  status: 'active' | 'inactive' | 'blocked';
  lastSeen: Date;
  deviceType?: string;
  trafficData?: TrafficData;
}

export interface TrafficData {
  bytesUp: number;
  bytesDown: number;
  packetsUp: number;
  packetsDown: number;
  lastUpdated: Date;
}
```

#### Device Service Layer
```typescript
// src/services/DeviceService.ts
export interface DeviceService {
  getDevices(): Promise<Device[]>;
  getDevice(id: string): Promise<Device | null>;
  blockDevice(id: string): Promise<boolean>;
  unblockDevice(id: string): Promise<boolean>;
  getTrafficData(id: string): Promise<TrafficData | null>;
}

export class LiveDeviceService implements DeviceService {
  async getDevices(): Promise<Device[]> {
    try {
      const response = await fetch('/api/devices');
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to fetch devices: ${error.message}`);
    }
  }

  async blockDevice(id: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/devices/${id}/block`, {
        method: 'POST',
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

export class MockDeviceService implements DeviceService {
  private mockDevices: Device[] = [
    {
      id: '1',
      mac: '00:11:22:33:44:55',
      ip: '192.168.1.100',
      hostname: 'Johns-iPhone',
      status: 'active',
      lastSeen: new Date(),
      deviceType: 'smartphone',
    },
    // ... more mock devices
  ];

  async getDevices(): Promise<Device[]> {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
    return [...this.mockDevices];
  }

  async blockDevice(id: string): Promise<boolean> {
    const device = this.mockDevices.find(d => d.id === id);
    if (device) {
      device.status = 'blocked';
      return true;
    }
    return false;
  }
}
```

#### Device List Component
```typescript
// src/components/DeviceList.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';

interface Props {
  deviceService: DeviceService;
}

export const DeviceList: React.FC<Props> = ({ deviceService }) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      const deviceList = await deviceService.getDevices();
      setDevices(deviceList);
    } catch (error) {
      console.error('Failed to load devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateToDevice = (device: Device) => {
    navigation.navigate('DeviceControl', { device });
  };

  const renderDevice = ({ item }: { item: Device }) => (
    <TouchableOpacity 
      style={styles.deviceItem}
      onPress={() => navigateToDevice(item)}
    >
      <View style={styles.deviceInfo}>
        <Text style={styles.hostname}>{item.hostname}</Text>
        <Text style={styles.ip}>{item.ip}</Text>
        <View style={[styles.statusBadge, styles[`status${item.status}`]]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connected Devices</Text>
      <FlatList
        data={devices}
        renderItem={renderDevice}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={loadDevices}
      />
    </View>
  );
};
```

#### Device Control Screen
```typescript
// src/screens/DeviceControlScreen.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';

interface Props {
  route: {
    params: {
      device: Device;
    };
  };
}

export const DeviceControlScreen: React.FC<Props> = ({ route }) => {
  const { device: initialDevice } = route.params;
  const [device, setDevice] = useState(initialDevice);
  const [isLoading, setIsLoading] = useState(false);

  const deviceService = useMockMode().isMockMode 
    ? new MockDeviceService() 
    : new LiveDeviceService();

  const handleBlockDevice = async () => {
    Alert.alert(
      'Block Device',
      `Block ${device.hostname}? This device will lose internet access.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Block', 
          style: 'destructive',
          onPress: performBlock 
        }
      ]
    );
  };

  const performBlock = async () => {
    setIsLoading(true);
    try {
      const success = await deviceService.blockDevice(device.id);
      if (success) {
        setDevice({ ...device, status: 'blocked' });
        Alert.alert('Success', 'Device has been blocked');
      } else {
        Alert.alert('Error', 'Failed to block device');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while blocking the device');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnblockDevice = async () => {
    setIsLoading(true);
    try {
      const success = await deviceService.unblockDevice(device.id);
      if (success) {
        setDevice({ ...device, status: 'active' });
        Alert.alert('Success', 'Device has been unblocked');
      } else {
        Alert.alert('Error', 'Failed to unblock device');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while unblocking the device');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.deviceHeader}>
        <Text style={styles.hostname}>{device.hostname}</Text>
        <View style={[styles.statusBadge, styles[`status${device.status}`]]}>
          <Text style={styles.statusText}>{device.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.deviceDetails}>
        <DetailRow label="MAC Address" value={device.mac} />
        <DetailRow label="IP Address" value={device.ip} />
        <DetailRow label="Last Seen" value={device.lastSeen.toLocaleString()} />
        {device.deviceType && (
          <DetailRow label="Device Type" value={device.deviceType} />
        )}
      </View>

      <View style={styles.actions}>
        {device.status === 'blocked' ? (
          <TouchableOpacity 
            style={[styles.actionButton, styles.unblockButton]}
            onPress={handleUnblockDevice}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Unblock Device</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.actionButton, styles.blockButton]}
            onPress={handleBlockDevice}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Block Device</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={[styles.actionButton, styles.trafficButton]}
          onPress={() => navigation.navigate('DeviceTraffic', { device })}
        >
          <Text style={styles.buttonText}>View Traffic</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}:</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);
```

---

## 4. Block Device Feature

### 4.1 Technical Requirements
- [ ] Block/Unblock API integration
- [ ] Mock mode simulation with state persistence
- [ ] User confirmation dialogs
- [ ] Real-time status updates
- [ ] Error handling and retry mechanisms

### 4.2 Implementation Details

The Block Device feature is integrated into the Device Control Screen (implemented above). Key aspects:

#### State Management
```typescript
// src/hooks/useDeviceBlockState.ts
import { useState, useCallback } from 'react';

export const useDeviceBlockState = (initialDevice: Device, deviceService: DeviceService) => {
  const [device, setDevice] = useState(initialDevice);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const blockDevice = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const success = await deviceService.blockDevice(device.id);
      if (success) {
        setDevice(prev => ({ ...prev, status: 'blocked' }));
        return true;
      } else {
        setError('Failed to block device');
        return false;
      }
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [device.id, deviceService]);

  const unblockDevice = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const success = await deviceService.unblockDevice(device.id);
      if (success) {
        setDevice(prev => ({ ...prev, status: 'active' }));
        return true;
      } else {
        setError('Failed to unblock device');
        return false;
      }
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [device.id, deviceService]);

  return {
    device,
    isLoading,
    error,
    blockDevice,
    unblockDevice,
  };
};
```

---

## 7. Suggested Improvements & Refactoring Tips

### 7.1 Architecture Improvements

#### TypeScript Integration
- [ ] **Convert to TypeScript**: If not already using TypeScript, migrate for better type safety
- [ ] **Strict Type Definitions**: Define comprehensive interfaces for all data models
- [ ] **Generic Service Interfaces**: Create generic interfaces for service layers

#### State Management
- [ ] **Centralized State**: Implement Redux Toolkit or Zustand for global state management
- [ ] **Persistent State**: Use Redux Persist for offline state management
- [ ] **Optimistic Updates**: Implement optimistic UI updates for better UX

```typescript
// src/store/deviceStore.ts (using Zustand)
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DeviceStore {
  devices: Device[];
  isLoading: boolean;
  error: string | null;
  setDevices: (devices: Device[]) => void;
  updateDevice: (id: string, updates: Partial<Device>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useDeviceStore = create<DeviceStore>()(
  persist(
    (set, get) => ({
      devices: [],
      isLoading: false,
      error: null,
      setDevices: (devices) => set({ devices }),
      updateDevice: (id, updates) => set((state) => ({
        devices: state.devices.map(device =>
          device.id === id ? { ...device, ...updates } : device
        )
      })),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
    }),
    {
      name: 'device-store',
    }
  )
);
```

### 7.2 Code Organization

#### Service Layer Pattern
```typescript
// src/services/ServiceFactory.ts
export class ServiceFactory {
  static createRouterService(isMockMode: boolean): RouterService {
    return isMockMode ? new MockRouterService() : new LiveRouterService();
  }

  static createDeviceService(isMockMode: boolean): DeviceService {
    return isMockMode ? new MockDeviceService() : new LiveDeviceService();
  }
}

// Usage in components
const { isMockMode } = useMockMode();
const deviceService = ServiceFactory.createDeviceService(isMockMode);
```

#### Error Boundary Implementation
```typescript
// src/components/ErrorBoundary.tsx
import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{this.state.error?.message}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => this.setState({ hasError: false })}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}
```

### 7.3 Performance Optimizations

#### React Query Integration
```typescript
// src/hooks/useDevices.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const useDevices = (deviceService: DeviceService) => {
  return useQuery({
    queryKey: ['devices'],
    queryFn: () => deviceService.getDevices(),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
  });
};

export const useBlockDevice = (deviceService: DeviceService) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (deviceId: string) => deviceService.blockDevice(deviceId),
    onSuccess: (success, deviceId) => {
      if (success) {
        queryClient.setQueryData(['devices'], (old: Device[]) =>
          old?.map(device =>
            device.id === deviceId ? { ...device, status: 'blocked' } : device
          )
        );
      }
    },
  });
};
```

### 7.4 Mobile Responsiveness

#### Responsive Design System
```typescript
// src/utils/responsive.ts
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const responsive = {
  wp: (percentage: number) => (width * percentage) / 100,
  hp: (percentage: number) => (height * percentage) / 100,
  isTablet: () => width >= 768,
  isSmallScreen: () => width < 350,
};

// Usage in styles
const styles = StyleSheet.create({
  container: {
    padding: responsive.wp(4),
    minHeight: responsive.hp(80),
  },
  title: {
    fontSize: responsive.isTablet() ? 24 : 18,
  },
});
```

### 7.5 Testing Strategy

#### Unit Testing Setup
```typescript
// src/__tests__/DeviceService.test.ts
import { MockDeviceService } from '../services/DeviceService';

describe('MockDeviceService', () => {
  let service: MockDeviceService;

  beforeEach(() => {
    service = new MockDeviceService();
  });

  test('should get devices list', async () => {
    const devices = await service.getDevices();
    expect(devices).toHaveLength(3);
    expect(devices[0]).toHaveProperty('mac');
  });

  test('should block device successfully', async () => {
    const success = await service.blockDevice('1');
    expect(success).toBe(true);
    
    const devices = await service.getDevices();
    const blockedDevice = devices.find(d => d.id === '1');
    expect(blockedDevice?.status).toBe('blocked');
  });
});
```

---

## 📅 Implementation Timeline

### Phase 1: Foundation & Environment Setup (Week 1-2)
- [ ] Set up environment configuration (.env files)
- [ ] Configure Expo app.config.js with environment variables
- [ ] Set up TypeScript (if not already configured)
- [ ] Implement Mock Mode Context with default Live Mode
- [ ] Create service interfaces and factory pattern
- [ ] Add Mock Mode toggle to Router Settings with app reload

### Phase 2: Core Features (Week 3-4)
- [ ] Implement Device Service layer (Live + Mock) with environment config
- [ ] Create Device List component
- [ ] Build Device Control Screen
- [ ] Add Router Restart functionality with retry logic
- [ ] Test mode switching and app reload functionality

### Phase 3: Enhancement (Week 5-6)
- [ ] Implement Block/Unblock device functionality
- [ ] Add Traffic viewing capabilities
- [ ] Enhance error handling and user feedback
- [ ] Add loading states and optimistic updates
- [ ] Configure production build settings

### Phase 4: Polish & Production (Week 7-8)
- [ ] Implement state management (Redux/Zustand)
- [ ] Add comprehensive error boundaries
- [ ] Improve mobile responsiveness
- [ ] Add unit and integration tests
- [ ] Performance optimizations
- [ ] Production build testing and deployment

---

## 🔧 Development Commands

```bash
# Install dependencies
npm install @react-navigation/native @react-navigation/stack
npm install @react-native-async-storage/async-storage
npm install @tanstack/react-query zustand
npm install expo-updates expo-constants
npm install dotenv

# TypeScript setup (if needed)
npm install -D typescript @types/react @types/react-native

# Testing setup
npm install -D jest @testing-library/react-native @testing-library/jest-native

# Environment setup
cp .env.dev .env  # For development

# Start development server
npx expo start

# Run tests
npm test

# Build for different environments
npm run build:dev      # Development build
npm run build:prod     # Production build
npm run build:preview  # Preview/Staging build
```

---

## 📝 Notes and Considerations

### Security Considerations
- **Router API Authentication**: Implement secure authentication for router API calls
- **Input Validation**: Validate all user inputs and API responses
- **Sensitive Data**: Avoid storing sensitive router credentials in AsyncStorage

### Performance Considerations
- **Image Optimization**: Optimize images and icons for mobile
- **Bundle Size**: Monitor bundle size and implement code splitting if needed
- **Memory Management**: Implement proper cleanup for subscriptions and timers

### Accessibility
- **Screen Reader Support**: Add accessibility labels and hints
- **High Contrast**: Support high contrast mode
- **Voice Control**: Ensure voice navigation compatibility

---

## 6. Environment Configuration & Production Setup

### 6.1 Environment Files Setup

#### Development Environment (.env.dev)
```bash
# .env.dev - Development configuration
ROUTER_API_BASE_URL=http://192.168.1.1
ROUTER_USERNAME=admin
ROUTER_TIMEOUT=30000
API_RETRY_ATTEMPTS=3
MOCK_MODE_DEFAULT=false
DEBUG_MODE=true
CRASH_REPORTING=false
ANALYTICS_ENABLED=false

# Mock Data Configuration
MOCK_DEVICE_COUNT=5
MOCK_API_DELAY=1000

# App Configuration
APP_VERSION=1.0.0
BUILD_NUMBER=1
```

#### Production Environment (.env)
```bash
# .env - Production configuration
ROUTER_API_BASE_URL=http://192.168.1.1
ROUTER_USERNAME=admin
ROUTER_TIMEOUT=30000
API_RETRY_ATTEMPTS=3
MOCK_MODE_DEFAULT=false
DEBUG_MODE=false
CRASH_REPORTING=true
ANALYTICS_ENABLED=true

# Mock Data Configuration (for testing in production)
MOCK_DEVICE_COUNT=5
MOCK_API_DELAY=500

# App Configuration
APP_VERSION=1.0.0
BUILD_NUMBER=1
```

### 6.2 Environment Configuration Service

```typescript
// src/config/environment.ts
import Constants from 'expo-constants';

interface AppConfig {
  routerApiBaseUrl: string;
  routerUsername: string;
  routerTimeout: number;
  apiRetryAttempts: number;
  mockModeDefault: boolean;
  debugMode: boolean;
  crashReporting: boolean;
  analyticsEnabled: boolean;
  mockDeviceCount: number;
  mockApiDelay: number;
  appVersion: string;
  buildNumber: string;
}

const getEnvironmentConfig = (): AppConfig => {
  // In Expo, environment variables are available through Constants.expoConfig.extra
  const config = Constants.expoConfig?.extra || {};
  
  return {
    routerApiBaseUrl: config.ROUTER_API_BASE_URL || 'http://192.168.1.1',
    routerUsername: config.ROUTER_USERNAME || 'admin',
    routerTimeout: parseInt(config.ROUTER_TIMEOUT || '30000'),
    apiRetryAttempts: parseInt(config.API_RETRY_ATTEMPTS || '3'),
    mockModeDefault: config.MOCK_MODE_DEFAULT === 'true',
    debugMode: config.DEBUG_MODE === 'true',
    crashReporting: config.CRASH_REPORTING === 'true',
    analyticsEnabled: config.ANALYTICS_ENABLED === 'true',
    mockDeviceCount: parseInt(config.MOCK_DEVICE_COUNT || '5'),
    mockApiDelay: parseInt(config.MOCK_API_DELAY || '1000'),
    appVersion: config.APP_VERSION || '1.0.0',
    buildNumber: config.BUILD_NUMBER || '1',
  };
};

export const AppConfig = getEnvironmentConfig();

// Debug logging utility
export const debugLog = (message: string, ...args: any[]) => {
  if (AppConfig.debugMode) {
    console.log(`[DEBUG] ${message}`, ...args);
  }
};
```

### 6.3 Expo Configuration (app.config.js)

```javascript
// app.config.js
import 'dotenv/config';

export default {
  expo: {
    name: "Xfinity Router App",
    slug: "xfinity-router-app",
    version: process.env.APP_VERSION || "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    updates: {
      fallbackToCacheTimeout: 0,
      url: "https://u.expo.dev/[your-project-id]"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#FFFFFF"
      },
      package: "com.yourcompany.xfinityrouter",
      versionCode: parseInt(process.env.BUILD_NUMBER || "1"),
      permissions: [
        "INTERNET",
        "ACCESS_NETWORK_STATE",
        "ACCESS_WIFI_STATE"
      ]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      // Environment variables available in the app
      ROUTER_API_BASE_URL: process.env.ROUTER_API_BASE_URL,
      ROUTER_USERNAME: process.env.ROUTER_USERNAME,
      ROUTER_TIMEOUT: process.env.ROUTER_TIMEOUT,
      API_RETRY_ATTEMPTS: process.env.API_RETRY_ATTEMPTS,
      MOCK_MODE_DEFAULT: process.env.MOCK_MODE_DEFAULT,
      DEBUG_MODE: process.env.DEBUG_MODE,
      CRASH_REPORTING: process.env.CRASH_REPORTING,
      ANALYTICS_ENABLED: process.env.ANALYTICS_ENABLED,
      MOCK_DEVICE_COUNT: process.env.MOCK_DEVICE_COUNT,
      MOCK_API_DELAY: process.env.MOCK_API_DELAY,
      APP_VERSION: process.env.APP_VERSION,
      BUILD_NUMBER: process.env.BUILD_NUMBER,
      eas: {
        projectId: "[your-eas-project-id]"
      }
    }
  }
};
```

### 6.4 Updated Service Layer with Environment Config

```typescript
// src/services/RouterService.ts
import { AppConfig, debugLog } from '../config/environment';

export class LiveRouterService implements RouterService {
  private baseUrl: string;
  private timeout: number;
  private retryAttempts: number;

  constructor() {
    this.baseUrl = AppConfig.routerApiBaseUrl;
    this.timeout = AppConfig.routerTimeout;
    this.retryAttempts = AppConfig.apiRetryAttempts;
    
    debugLog('LiveRouterService initialized', {
      baseUrl: this.baseUrl,
      timeout: this.timeout,
      retryAttempts: this.retryAttempts
    });
  }

  async restartRouter(): Promise<RestartResult> {
    debugLog('Attempting router restart...');
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/api/router/restart`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${btoa(`${AppConfig.routerUsername}:password`)}`
          },
          signal: AbortSignal.timeout(this.timeout),
        });
        
        if (response.ok) {
          debugLog('Router restart successful');
          return {
            success: true,
            message: 'Router restart initiated successfully',
            estimatedDowntime: 120
          };
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        debugLog(`Router restart attempt ${attempt} failed:`, error);
        
        if (attempt === this.retryAttempts) {
          return {
            success: false,
            message: `Restart failed after ${this.retryAttempts} attempts: ${error.message}`
          };
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  isRestartSupported(): boolean {
    return AppConfig.routerApiBaseUrl !== null;
  }
}

export class MockRouterService implements RouterService {
  async restartRouter(): Promise<RestartResult> {
    debugLog('Mock router restart initiated');
    
    // Use configured mock delay
    await new Promise(resolve => setTimeout(resolve, AppConfig.mockApiDelay));
    
    return {
      success: true,
      message: 'Router restart simulated successfully',
      estimatedDowntime: 120
    };
  }

  isRestartSupported(): boolean {
    return true; // Mock always supports restart
  }
}
```

### 6.5 Build Scripts and Configuration

#### Package.json Scripts
```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "build:dev": "cp .env.dev .env && eas build --platform android --profile development",
    "build:prod": "cp .env .env.local && eas build --platform android --profile production",
    "build:preview": "eas build --platform android --profile preview"
  }
}
```

#### EAS Build Configuration (eas.json)
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "NODE_ENV": "development"
      }
    },
    "preview": {
      "distribution": "internal",
      "env": {
        "NODE_ENV": "staging"
      }
    },
    "production": {
      "env": {
        "NODE_ENV": "production"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### 6.6 Production Build Checklist

#### Pre-Build Checklist
- [ ] Update `.env` file with production values
- [ ] Set `DEBUG_MODE=false` for production
- [ ] Enable crash reporting and analytics
- [ ] Update app version and build number
- [ ] Test both Live and Mock modes
- [ ] Verify router API endpoints are accessible

#### Build Commands
```bash
# Development build
npm run build:dev

# Production build
npm run build:prod

# Preview/Staging build
npm run build:preview
```

#### Post-Build Verification
- [ ] Test APK installation on target devices
- [ ] Verify default Live Mode behavior
- [ ] Test Mock Mode toggle and app reload
- [ ] Check environment configuration values
- [ ] Validate router API connectivity
- [ ] Test offline functionality

---

## Additional Production Considerations

#### Default Mode Behavior
- **First Launch**: App starts in Live Mode by default
- **Settings Persistence**: Mock mode setting persists across app sessions
- **Mode Switching**: Requires app reload to ensure clean state transition
- **Production Safety**: Live mode is the secure default for production builds

#### Environment Management
- **Development**: Use `.env.dev` for local development with debug enabled
- **Production**: Use `.env` for production builds with optimized settings
- **Configuration**: All router settings, timeouts, and API endpoints configurable via environment
- **Security**: Sensitive credentials managed through environment variables, not hardcoded

This implementation plan provides a comprehensive roadmap for enhancing the Xfinity Router App with the requested features while maintaining code quality, performance, and user experience standards. The app will default to Live Mode for production use while providing a robust Mock Mode for testing and development.

---

## 8. Resources & References

### 8.1 Official Documentation

#### React Native & Expo
- **React Native Documentation**: https://reactnative.dev/docs/getting-started
  - Navigation: https://reactnative.dev/docs/navigation
  - AsyncStorage: https://reactnative.dev/docs/asyncstorage
  - Alert API: https://reactnative.dev/docs/alert

- **Expo Documentation**: https://docs.expo.dev/
  - Constants: https://docs.expo.dev/versions/latest/sdk/constants/
  - Updates: https://docs.expo.dev/versions/latest/sdk/updates/
  - Environment Variables: https://docs.expo.dev/guides/environment-variables/
  - App Configuration: https://docs.expo.dev/workflow/configuration/

- **Expo Application Services (EAS)**: https://docs.expo.dev/eas/
  - EAS Build: https://docs.expo.dev/build/introduction/
  - Build Profiles: https://docs.expo.dev/build-reference/eas-json/

#### TypeScript
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **React TypeScript Cheatsheet**: https://react-typescript-cheatsheet.netlify.app/
- **TypeScript with React Native**: https://reactnative.dev/docs/typescript

### 8.2 State Management & Data Fetching

#### Zustand (Recommended State Management)
- **Zustand Documentation**: https://zustand-demo.pmnd.rs/
- **Getting Started**: https://github.com/pmndrs/zustand#readme
- **Persist Middleware**: https://github.com/pmndrs/zustand/blob/main/docs/integrations/persisting-store-data.md

#### React Query / TanStack Query
- **TanStack Query Documentation**: https://tanstack.com/query/latest
- **React Native Integration**: https://tanstack.com/query/latest/docs/react/guides/react-native
- **Mutations**: https://tanstack.com/query/latest/docs/react/guides/mutations

#### Redux Toolkit (Alternative)
- **Redux Toolkit Documentation**: https://redux-toolkit.js.org/
- **RTK Query**: https://redux-toolkit.js.org/rtk-query/overview

### 8.3 Navigation

#### React Navigation
- **React Navigation v6**: https://reactnavigation.org/docs/getting-started
- **Stack Navigator**: https://reactnavigation.org/docs/stack-navigator
- **Tab Navigator**: https://reactnavigation.org/docs/bottom-tab-navigator
- **TypeScript Guide**: https://reactnavigation.org/docs/typescript

### 8.4 Networking & API Integration

#### Fetch API & Error Handling
- **Fetch API Guide**: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
- **AbortController**: https://developer.mozilla.org/en-US/docs/Web/API/AbortController
- **Error Handling Patterns**: https://kentcdodds.com/blog/use-react-error-boundary-to-handle-errors-in-react

#### Router API Integration
- **Xfinity Router Admin Guide**: 
  - Common endpoints: `/api/devices`, `/api/router/restart`, `/api/wifi/settings`
  - Authentication: Basic Auth or session-based
  - CORS considerations for mobile apps

- **HTTP Status Codes Reference**: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status

### 8.5 Testing

#### React Native Testing
- **Testing Library**: https://testing-library.com/docs/react-native-testing-library/intro
- **Jest Documentation**: https://jestjs.io/docs/getting-started
- **Expo Testing**: https://docs.expo.dev/develop/unit-testing/

#### Testing Patterns
- **Testing Best Practices**: https://kentcdodds.com/blog/common-mistakes-with-react-testing-library
- **Mock Service Worker**: https://mswjs.io/ (for API mocking)

### 8.6 Performance & Optimization

#### React Native Performance
- **Performance Overview**: https://reactnative.dev/docs/performance
- **Flipper Debugging**: https://fbflipper.com/docs/getting-started/react-native/
- **Memory Management**: https://reactnative.dev/docs/debugging#memory-usage

#### Bundle Optimization
- **Metro Bundler**: https://metrobundler.dev/
- **Bundle Analyzer**: https://github.com/IjzerenHein/react-native-bundle-visualizer

### 8.7 Security & Best Practices

#### Security Guidelines
- **React Native Security**: https://reactnative.dev/docs/security
- **OWASP Mobile Security**: https://owasp.org/www-project-mobile-security-testing-guide/
- **AsyncStorage Security**: https://github.com/react-native-async-storage/async-storage/blob/main/docs/Security.md

#### Environment Variables
- **Expo Environment Variables**: https://docs.expo.dev/guides/environment-variables/
- **Securing API Keys**: https://docs.expo.dev/build-reference/variables/

### 8.8 Deployment & Distribution

#### App Store Deployment
- **Expo App Stores**: https://docs.expo.dev/submit/introduction/
- **Android Play Store**: https://docs.expo.dev/submit/android/
- **Internal Distribution**: https://docs.expo.dev/build/internal-distribution/

#### CI/CD
- **GitHub Actions with Expo**: https://docs.expo.dev/build-reference/github-actions/
- **Automated Testing**: https://docs.expo.dev/build-reference/automated-testing/

---

## 9. Implementation Instructions & Help

### 9.1 Getting Started Checklist

#### Prerequisites Setup
1. **Install Node.js**: https://nodejs.org/ (LTS version recommended)
2. **Install Expo CLI**: 
   ```bash
   npm install -g @expo/cli
   ```
3. **Setup Development Environment**:
   - Install Android Studio: https://developer.android.com/studio
   - Setup Android SDK and emulator
   - Install Expo Go app on physical device

#### Project Initialization
```bash
# Create new Expo project
npx create-expo-app XfinityRouterApp --template typescript

# Navigate to project
cd XfinityRouterApp

# Install additional dependencies
npm install @react-navigation/native @react-navigation/stack
npm install @react-native-async-storage/async-storage
npm install zustand @tanstack/react-query
npm install expo-updates expo-constants
npm install dotenv
```

### 9.2 Development Workflow

#### Daily Development Process
1. **Start Development Server**:
   ```bash
   npx expo start
   ```

2. **Run on Device/Emulator**:
   - Scan QR code with Expo Go (iOS/Android)
   - Press 'a' for Android emulator
   - Press 'i' for iOS simulator

3. **Live Reload**: Changes automatically reflect in app

#### Debugging Tools
- **React Native Debugger**: https://github.com/jhen0409/react-native-debugger
- **Flipper**: https://fbflipper.com/
- **Expo DevTools**: Built into Expo CLI

### 9.3 Common Implementation Patterns

#### Service Layer Pattern
```typescript
// Pattern for creating service interfaces
interface ServiceInterface {
  methodName(): Promise<ResultType>;
}

// Implementation for different modes
class LiveService implements ServiceInterface { /* ... */ }
class MockService implements ServiceInterface { /* ... */ }

// Factory pattern for service creation
class ServiceFactory {
  static create(mode: string): ServiceInterface {
    return mode === 'mock' ? new MockService() : new LiveService();
  }
}
```

#### Context Pattern for Global State
```typescript
// Create context with provider
const MyContext = createContext<ContextType | undefined>(undefined);

// Custom hook for using context
export const useMyContext = () => {
  const context = useContext(MyContext);
  if (!context) {
    throw new Error('useMyContext must be used within MyProvider');
  }
  return context;
};
```

### 9.4 Troubleshooting Guide

#### Common Issues & Solutions

1. **Metro Bundle Error**:
   ```bash
   npx expo start --clear
   # or
   rm -rf node_modules && npm install
   ```

2. **Android Build Issues**:
   - Check Android SDK installation
   - Verify ANDROID_HOME environment variable
   - Update Gradle if needed

3. **Environment Variables Not Loading**:
   - Ensure `.env` file is in project root
   - Check `app.config.js` extra configuration
   - Restart Expo development server

4. **AsyncStorage Issues**:
   ```bash
   # Clear storage during development
   npx expo install @react-native-async-storage/async-storage
   ```

5. **Navigation Issues**:
   - Verify all screens are properly registered
   - Check navigation parameters typing
   - Ensure proper navigation container setup

#### Performance Issues
- Use React DevTools Profiler
- Implement proper key props in lists
- Avoid inline functions in render
- Use React.memo for pure components

### 9.5 Code Quality & Standards

#### ESLint Configuration
```javascript
// .eslintrc.js
module.exports = {
  extends: ['expo', '@react-native-community'],
  rules: {
    'react-hooks/exhaustive-deps': 'warn',
    '@typescript-eslint/no-unused-vars': 'error',
  },
};
```

#### Prettier Configuration
```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

### 9.6 Testing Implementation

#### Unit Test Example
```typescript
// __tests__/DeviceService.test.ts
import { MockDeviceService } from '../src/services/DeviceService';

describe('DeviceService', () => {
  it('should fetch devices successfully', async () => {
    const service = new MockDeviceService();
    const devices = await service.getDevices();
    
    expect(devices).toBeDefined();
    expect(devices.length).toBeGreaterThan(0);
    expect(devices[0]).toHaveProperty('mac');
  });
});
```

#### Component Test Example
```typescript
// __tests__/DeviceList.test.tsx
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { DeviceList } from '../src/components/DeviceList';

test('renders device list correctly', async () => {
  const { getByText } = render(<DeviceList deviceService={mockService} />);
  
  await waitFor(() => {
    expect(getByText('Johns-iPhone')).toBeTruthy();
  });
});
```

### 9.7 Build & Deployment Instructions

#### Local Development Build
```bash
# Development build
npm run build:dev

# Preview build
npm run build:preview
```

#### Production Build Process
1. **Update Environment**:
   ```bash
   cp .env.prod .env
   ```

2. **Update Version Numbers**:
   - Increment version in `package.json`
   - Update `BUILD_NUMBER` in `.env`

3. **Build APK**:
   ```bash
   npm run build:prod
   ```

4. **Test Built APK**:
   - Install on test devices
   - Verify all features work
   - Test both Live and Mock modes

#### Deployment Checklist
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Version numbers updated
- [ ] APK tested on multiple devices
- [ ] Router API endpoints accessible
- [ ] Mock mode functionality verified

### 9.8 Helpful Resources & Communities

#### Developer Communities
- **React Native Community**: https://reactnative.dev/community/overview
- **Expo Community**: https://forums.expo.dev/
- **Stack Overflow**: https://stackoverflow.com/questions/tagged/react-native
- **Discord**: React Native Community Discord
- **Reddit**: r/reactnative

#### Learning Resources
- **React Native School**: https://www.reactnativeschool.com/
- **Expo Learn**: https://docs.expo.dev/tutorial/introduction/
- **React Native Express**: http://www.reactnativeexpress.com/
- **TypeScript React Native**: https://github.com/typescript-cheatsheets/react

#### Tools & Extensions
- **VS Code Extensions**:
  - React Native Tools
  - TypeScript Importer
  - ES7+ React/Redux/React-Native snippets
  - Expo Tools

#### Sample Projects & Templates
- **React Navigation Examples**: https://github.com/react-navigation/react-navigation/tree/6.x/example
- **Expo Examples**: https://github.com/expo/examples
- **React Native Elements**: https://reactnativeelements.com/
- **NativeBase**: https://nativebase.io/

This comprehensive guide provides all the necessary resources, documentation links, implementation patterns, and troubleshooting help needed to successfully implement the Xfinity Router App enhancements.
