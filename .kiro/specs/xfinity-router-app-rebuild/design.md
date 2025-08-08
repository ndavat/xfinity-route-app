# Design Document

## Overview

This document outlines the technical design for the Home Router Master app. The design follows modern React Native best practices with a clean architecture approach, emphasizing separation of concerns, testability, and maintainability. The app will be built using the latest Expo SDK with TypeScript for type safety and modern development tooling.

## Architecture

### High-Level Architecture

The application follows a layered architecture pattern with clear separation between presentation, business logic, and data layers:

```
┌─────────────────────────────────────────┐
│           Presentation Layer            │
│  (Screens, Components, Navigation)      │
├─────────────────────────────────────────┤
│            Business Layer               │
│     (Hooks, State Management)           │
├─────────────────────────────────────────┤
│             Service Layer               │
│    (API Services, Data Processing)      │
├─────────────────────────────────────────┤
│              Data Layer                 │
│   (Storage, Network, External APIs)     │
└─────────────────────────────────────────┘
```

### Technology Stack

**Core Framework:**
- React Native 0.76+ with latest Expo SDK
- TypeScript 5.6+ for type safety
- Expo Router for file-based navigation

**State Management:**
- Zustand 5.0+ for global state management
- TanStack Query (React Query) 5.0+ for server state management
- React Hook Form for form state management

**UI Framework:**
- Expo Vector Icons for consistent iconography
- React Native Reanimated 3.0+ for smooth animations
- React Native Gesture Handler for touch interactions
- Custom component library with design system

**Networking & Data:**
- Axios 1.7+ with interceptors for HTTP requests
- AsyncStorage for local data persistence
- Expo SecureStore for sensitive data storage
- React Native NetInfo for network state monitoring

**Development & Quality:**
- ESLint + Prettier for code formatting
- Jest + React Native Testing Library for testing
- Expo Development Build for native debugging
- Sentry for error tracking and performance monitoring

## Components and Interfaces

### Core Data Models

```typescript
// Device Model
interface Device {
  id: string;
  mac: string;
  ip: string;
  hostname: string;
  customName?: string;
  connectionType: 'WiFi' | 'Ethernet' | 'Unknown';
  isBlocked: boolean;
  isOnline: boolean;
  networkDetails: {
    band: '2.4GHz' | '5GHz' | 'Unknown';
    protocol: 'Wi-Fi 4' | 'Wi-Fi 5' | 'Wi-Fi 6' | 'Unknown';
    signalStrength?: number;
    speed?: string;
    lastSeen: Date;
    ipv6?: string;
    dhcpType: 'DHCP' | 'Reserved';
    rssiLevel?: string;
  };
  comments?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Router Information Model
interface RouterInfo {
  status: 'Online' | 'Offline' | 'Unknown';
  uptime: string;
  connectedDevices: number;
  model: string;
  firmware: string;
  wifiSSID: string;
  internetStatus: 'Connected' | 'Disconnected' | 'Limited';
  ipAddress: string;
  lastUpdated: Date;
}

// Router Configuration Model
interface RouterConfig {
  id: string;
  name: string;
  ip: string;
  username: string;
  password: string;
  useHttps: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Service Layer Architecture

```typescript
// Base Service Interface
interface BaseService {
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
  isReady(): boolean;
}

// Router Service Interface
interface RouterService extends BaseService {
  connect(config: RouterConfig): Promise<ConnectionResult>;
  disconnect(): Promise<void>;
  checkConnection(): Promise<boolean>;
  getRouterInfo(): Promise<RouterInfo>;
  restartRouter(): Promise<RestartResult>;
  getNetworkStatus(): Promise<NetworkStatus>;
}

// Device Service Interface
interface DeviceService extends BaseService {
  getDevices(): Promise<Device[]>;
  getDevice(id: string): Promise<Device | null>;
  blockDevice(id: string): Promise<OperationResult>;
  unblockDevice(id: string): Promise<OperationResult>;
  updateDeviceName(id: string, name: string): Promise<OperationResult>;
  getDeviceTraffic(id: string): Promise<TrafficData>;
}

// Configuration Service Interface
interface ConfigService extends BaseService {
  getRouterConfigs(): Promise<RouterConfig[]>;
  saveRouterConfig(config: RouterConfig): Promise<void>;
  deleteRouterConfig(id: string): Promise<void>;
  getActiveConfig(): Promise<RouterConfig | null>;
  setActiveConfig(id: string): Promise<void>;
}
```

### State Management Design

```typescript
// Router Store (Zustand)
interface RouterStore {
  // State
  isConnected: boolean;
  currentConfig: RouterConfig | null;
  routerInfo: RouterInfo | null;
  connectionStatus: 'idle' | 'connecting' | 'connected' | 'error';
  error: string | null;
  
  // Actions
  connect: (config: RouterConfig) => Promise<void>;
  disconnect: () => Promise<void>;
  updateRouterInfo: (info: RouterInfo) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

// Device Store (Zustand)
interface DeviceStore {
  // State
  devices: Device[];
  selectedDevice: Device | null;
  isLoading: boolean;
  lastUpdated: Date | null;
  
  // Actions
  setDevices: (devices: Device[]) => void;
  updateDevice: (device: Device) => void;
  selectDevice: (device: Device | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

// App Store (Zustand)
interface AppStore {
  // State
  isDevelopmentMode: boolean;
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  
  // Actions
  setDevelopmentMode: (enabled: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setNotifications: (enabled: boolean) => void;
}
```

### Component Architecture

```typescript
// Screen Components
interface ScreenProps {
  navigation: NavigationProp<any>;
  route: RouteProp<any>;
}

// Base Screen Component
abstract class BaseScreen<T = {}> extends React.Component<ScreenProps & T> {
  abstract render(): React.ReactNode;
  
  protected showError(message: string): void;
  protected showSuccess(message: string): void;
  protected handleNavigation(screen: string, params?: any): void;
}

// Custom Hook Pattern
interface UseRouterConnection {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: (config: RouterConfig) => Promise<void>;
  disconnect: () => Promise<void>;
  retry: () => Promise<void>;
}

// Component Props Pattern
interface DeviceListProps {
  devices: Device[];
  onDeviceSelect: (device: Device) => void;
  onDeviceBlock: (device: Device) => Promise<void>;
  onDeviceUnblock: (device: Device) => Promise<void>;
  loading?: boolean;
  error?: string | null;
}
```

## Data Models

### Device Management

The device model includes comprehensive network information and supports custom naming and comments for better organization:

```typescript
interface Device {
  // Core Identification
  id: string; // Generated UUID for internal use
  mac: string; // Primary identifier from router
  ip: string; // Current IP address
  hostname: string; // Router-provided hostname
  
  // User Customization
  customName?: string; // User-defined friendly name
  comments?: string; // User notes
  
  // Network Information
  connectionType: 'WiFi' | 'Ethernet' | 'Unknown';
  isBlocked: boolean; // Access control status
  isOnline: boolean; // Current connectivity status
  
  // Detailed Network Data
  networkDetails: {
    band: '2.4GHz' | '5GHz' | 'Unknown';
    protocol: 'Wi-Fi 4' | 'Wi-Fi 5' | 'Wi-Fi 6' | 'Unknown';
    signalStrength?: number; // dBm value
    speed?: string; // Connection speed
    lastSeen: Date; // Last activity timestamp
    ipv6?: string; // IPv6 address if available
    dhcpType: 'DHCP' | 'Reserved'; // IP assignment type
    rssiLevel?: string; // Signal strength description
  };
  
  // Metadata
  createdAt: Date; // First discovery time
  updatedAt: Date; // Last information update
}
```

### Router Configuration

Support for multiple router configurations with secure credential storage:

```typescript
interface RouterConfig {
  id: string; // Unique configuration ID
  name: string; // User-friendly name
  ip: string; // Router IP address
  username: string; // Authentication username
  password: string; // Encrypted password
  useHttps: boolean; // Protocol preference
  isDefault: boolean; // Default configuration flag
  createdAt: Date;
  updatedAt: Date;
}
```

## Error Handling

### Error Classification

```typescript
enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  ROUTER_UNREACHABLE = 'ROUTER_UNREACHABLE',
  OPERATION_FAILED = 'OPERATION_FAILED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

interface AppError {
  type: ErrorType;
  message: string;
  details?: string;
  code?: string;
  timestamp: Date;
  context?: Record<string, any>;
}
```

### Error Handling Strategy

1. **Network Errors**: Automatic retry with exponential backoff
2. **Authentication Errors**: Clear user guidance and re-authentication flow
3. **Router Unreachable**: Connection diagnostics and troubleshooting steps
4. **Operation Failures**: Detailed error messages with recovery options
5. **Validation Errors**: Real-time form validation with helpful hints

### Global Error Boundary

```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class GlobalErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  // Error boundary implementation with Sentry integration
  // Fallback UI for unrecoverable errors
  // Error reporting and user feedback collection
}
```

## Testing Strategy

### Testing Pyramid

1. **Unit Tests (70%)**
   - Service layer functions
   - Utility functions
   - Custom hooks
   - Component logic

2. **Integration Tests (20%)**
   - API service integration
   - State management integration
   - Navigation flows
   - Data persistence

3. **E2E Tests (10%)**
   - Critical user journeys
   - Router connection flow
   - Device management operations
   - Error scenarios

### Testing Tools and Patterns

```typescript
// Service Testing Pattern
describe('RouterService', () => {
  let service: RouterService;
  let mockAxios: jest.Mocked<typeof axios>;
  
  beforeEach(() => {
    service = new LiveRouterService();
    mockAxios = axios as jest.Mocked<typeof axios>;
  });
  
  it('should connect to router successfully', async () => {
    // Test implementation
  });
});

// Component Testing Pattern
describe('DeviceList', () => {
  const mockDevices: Device[] = [
    // Mock data
  ];
  
  it('should render device list correctly', () => {
    render(
      <DeviceList 
        devices={mockDevices}
        onDeviceSelect={jest.fn()}
        onDeviceBlock={jest.fn()}
        onDeviceUnblock={jest.fn()}
      />
    );
    
    expect(screen.getByText('Device 1')).toBeInTheDocument();
  });
});

// Hook Testing Pattern
describe('useRouterConnection', () => {
  it('should handle connection state correctly', async () => {
    const { result } = renderHook(() => useRouterConnection());
    
    await act(async () => {
      await result.current.connect(mockConfig);
    });
    
    expect(result.current.isConnected).toBe(true);
  });
});
```

### Mock Strategy

- **Development Mode**: Full mock implementation for offline development
- **Testing Mode**: Configurable mocks for different test scenarios
- **Production Mode**: Real router communication with fallback handling

## Security Considerations

### Data Protection

1. **Credential Storage**: Use Expo SecureStore for router passwords
2. **Network Communication**: Enforce HTTPS where possible
3. **Input Validation**: Sanitize all user inputs and router responses
4. **Session Management**: Implement secure session handling with timeout

### Network Security

```typescript
// Secure HTTP Client Configuration
const createSecureAxiosInstance = () => {
  const instance = axios.create({
    timeout: 10000,
    headers: {
      'User-Agent': 'HomeRouterMaster/2.0',
      'Accept': 'application/json, text/html',
    },
  });
  
  // Request interceptor for authentication
  instance.interceptors.request.use((config) => {
    // Add authentication headers
    // Validate request parameters
    return config;
  });
  
  // Response interceptor for error handling
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      // Handle authentication errors
      // Log security events
      return Promise.reject(error);
    }
  );
  
  return instance;
};
```

### Privacy Protection

- **Local Data Only**: No external data transmission except to user's router
- **Minimal Permissions**: Request only necessary device permissions
- **Data Encryption**: Encrypt sensitive local storage data
- **Audit Logging**: Log security-relevant events for debugging

## Performance Optimization

### Rendering Performance

1. **React.memo**: Memoize expensive components
2. **useMemo/useCallback**: Optimize hook dependencies
3. **FlatList**: Efficient large list rendering
4. **Image Optimization**: Lazy loading and caching

### Network Performance

1. **Request Batching**: Combine multiple API calls where possible
2. **Caching Strategy**: Cache router data with appropriate TTL
3. **Background Sync**: Update data when app becomes active
4. **Retry Logic**: Intelligent retry with exponential backoff

### Memory Management

1. **Cleanup Hooks**: Proper cleanup in useEffect
2. **Event Listeners**: Remove listeners on component unmount
3. **Large Data Sets**: Implement pagination for device lists
4. **Image Memory**: Optimize image loading and caching

## UI/UX Design Mockups

### Design System

**Color Palette:**
- Primary: #0261C2 (Xfinity Blue)
- Secondary: #43A047 (Success Green)
- Error: #E53935 (Error Red)
- Warning: #FF9800 (Warning Orange)
- Background: #F5F5F5 (Light Gray)
- Surface: #FFFFFF (White)
- Text Primary: #212121 (Dark Gray)
- Text Secondary: #757575 (Medium Gray)

**Typography:**
- Heading 1: 24px, Bold
- Heading 2: 20px, Bold
- Heading 3: 18px, Semi-Bold
- Body: 16px, Regular
- Caption: 14px, Regular
- Small: 12px, Regular

### Screen Layouts

#### Home Screen Layout
```
┌─────────────────────────────────────┐
│ ≡  Home Router Master       🔄     │
├─────────────────────────────────────┤
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 📶 Router Connected             │ │
│ │ Status: Online                  │ │
│ │ Uptime: 2d 14h 32m             │ │
│ │ Connected Devices: 8            │ │
│ │ MODE: LIVE                      │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 📱 Connected Devices            │ │
│ │ View and manage all devices     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🚫 Device Control               │ │
│ │ Block/unblock specific devices  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ⚙️  Router Settings             │ │
│ │ Configure router credentials    │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🔄 Restart Router               │ │
│ │ Restart your router remotely    │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

#### Device List Screen Layout
```
┌─────────────────────────────────────┐
│ ← Connected Devices          🔍     │
├─────────────────────────────────────┤
│ Search devices...                   │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ 📱 OnePlus 7 Pro        ●      │ │
│ │ 10.0.0.169 • WiFi 5GHz         │ │
│ │ Signal: -62 dBm                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 📺 43TCLRokuTV          ●      │ │
│ │ 10.0.0.161 • WiFi 5GHz         │ │
│ │ Signal: -69 dBm                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 💻 DESKTOP-843R24E      ●      │ │
│ │ 10.0.0.98 • WiFi 5GHz          │ │
│ │ Signal: -70 dBm                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 📱 Moto G Stylus        ○      │ │
│ │ 10.0.0.117 • WiFi 5GHz         │ │
│ │ Last seen: 2 min ago            │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

#### Device Control Screen Layout
```
┌─────────────────────────────────────┐
│ ← OnePlus 7 Pro                     │
├─────────────────────────────────────┤
│                                     │
│ ┌─────────────────────────────────┐ │
│ │           📱                    │ │
│ │      OnePlus 7 Pro              │ │
│ │                                 │ │
│ │ MAC: 36:E7:B5:EA:84:A1         │ │
│ │ IP: 10.0.0.169                 │ │
│ │ Status: ● Online               │ │
│ │ Connection: WiFi 5GHz          │ │
│ │ Signal: -62 dBm (Excellent)    │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Custom Name                     │ │
│ │ [OnePlus 7 Pro            ]    │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Comments                        │ │
│ │ [Personal phone device    ]    │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │        Access Control           │ │
│ │                                 │ │
│ │ [    🚫 Block Device    ]      │ │
│ │                                 │ │
│ │ [   📊 View Traffic     ]      │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

#### Settings Screen Layout
```
┌─────────────────────────────────────┐
│ ← Settings                          │
├─────────────────────────────────────┤
│                                     │
│ Router Configuration                │
│ ┌─────────────────────────────────┐ │
│ │ Router IP                       │ │
│ │ [10.0.0.1              ]       │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Username                        │ │
│ │ [admin                 ]       │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Password                        │ │
│ │ [••••••••••••••••••••••]       │ │
│ └─────────────────────────────────┘ │
│                                     │
│ App Settings                        │
│ ┌─────────────────────────────────┐ │
│ │ Development Mode        [  ○  ] │ │
│ │ Enable mock data for testing    │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Notifications          [  ●  ] │ │
│ │ Device connection alerts        │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [        Save Settings        ]     │
└─────────────────────────────────────┘
```

### Component Design Patterns

#### Device Card Component
```
┌─────────────────────────────────────┐
│ 📱 Device Name              ● Status│
│ IP Address • Connection Type        │
│ Additional Info (Signal/Last Seen)  │
└─────────────────────────────────────┘
```

#### Status Indicator Component
```
● Online (Green)
○ Offline (Gray)
🚫 Blocked (Red)
⚠️ Limited (Orange)
```

#### Action Button Component
```
┌─────────────────────┐
│   Icon   Action     │
│          Text       │
└─────────────────────┘
```

## Scalability Features

### Modular Architecture

- **Feature Modules**: Organize code by feature domains
- **Plugin System**: Extensible architecture for new router types
- **Configuration Driven**: Support multiple router models through configuration
- **Microservice Ready**: Prepare for potential backend service integration

### Future Enhancements

1. **Multi-Router Support**: Manage multiple routers from single app
2. **Advanced Analytics**: Network usage analytics and reporting
3. **Automation Rules**: Scheduled device blocking and network management
4. **Cloud Sync**: Optional cloud backup of configurations and settings
5. **Family Profiles**: User-based device management and parental controls