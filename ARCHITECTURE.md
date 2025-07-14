# Xfinity Router App Architecture Design Document

## Overview
This document describes the architecture of the Xfinity Router mobile application, a React Native app for managing home network devices and router configurations. The architecture follows a layered pattern with clear separation of concerns between UI, services, and core logic.

## Key Components
### UI Layer
- **Screens**: HomeScreen, DeviceControlScreen, SettingsScreen, DiagnosticsScreen, NetworkConfigurationScreen, WifiConfigurationScreen
- **Components**: Button, TextInput, CustomToggle, DeviceList, DebugPanel, LoggerManager, RestartRouterButton
- **Contexts**: MockModeContext (manages mock/real mode state)

### Service Layer
- **Service Interfaces**: 
  - `RouterService` (restartRouter, getRouterInfo, checkConnection)
  - `DeviceService` (getDevices, blockDevice, getTrafficData)
- **Implementations**:
  - **Live Mode**: LiveDeviceService, LiveRouterService (direct router communication)
  - **Mock Mode**: MockDeviceService, MockRouterService (simulated data)
- **Service Factory**: 
  ```ts
  class ServiceFactory {
    static createRouterService(isMockMode: boolean): RouterService
    static createDeviceService(isMockMode: boolean): DeviceService
  }
  ```

### Core Layer
- **Authentication**: AuthenticationService (handles login/session management)
- **Session Management**: SessionManager (token handling, session validation)
- **Data Models**: 
  - `Device` (mac, name, connectionType, signalStrength, trafficData)
  - `RouterInfo` (firmware, uptime, connection status)
- **Utils**: 
  - GatewayDiscovery (router IP detection)
  - CookieHelpers (session cookie management)
  - ErrorLogger (error tracking)

### Network Layer
- **Axios Configuration**: axiosConfig.ts (timeout, base URL, interceptors)
- **API Endpoints**: 
  - `/api/router/restart`
  - `/api/devices`
  - `/api/traffic`
- **Network Monitoring**: NetworkMonitor (connectivity checks, diagnostics)

## Architecture Diagram
```mermaid
graph TD
    A[UI Layer] --> B[Service Layer]
    B --> C[Core Layer]
    C --> D[Network Layer]
    D --> E[Router API]
    
    subgraph UI Layer
        F[HomeScreen]
        G[DeviceControlScreen]
        H[SettingsScreen]
    end
    
    subgraph Service Layer
        I[ServiceFactory]
        J[RouterService]
        K[DeviceService]
    end
    
    subgraph Core Layer
        L[AuthenticationService]
        M[SessionManager]
        N[Device Model]
    end
    
    subgraph Network Layer
        O[axiosConfig]
        P[NetworkMonitor]
    end
    
    I --> J
    I --> K
    J --> L
    K --> M
    M --> N
    O --> P
    P --> E
</mermaid>
```

## Data Flow
1. UI components dispatch actions through context or direct service calls
2. ServiceFactory routes requests to appropriate implementation (mock/live)
3. Core services handle business logic and data transformation
4. Network layer manages HTTP communication and error handling
5. Data is returned to UI for rendering

## Mock vs Live Mode
- **Service Switching**: 
  ```ts
  const routerService = ServiceFactory.createRouterService(isMockMode);
  const deviceService = ServiceFactory.createDeviceService(isMockMode);
  ```
- **Mock Mode**: Uses predefined test data for development
- **Live Mode**: Communicates directly with router via HTTP requests

## Security Considerations
- HTTPS enforcement through `isHttpsToHttpBlocked()` utility
- Session management with token validation
- Data sanitization in logging components
- Network permission handling

## Scalability Features
- Modular service architecture allows adding new features
- Factory pattern enables easy service implementation switching
- Centralized logging system for monitoring
- Performance monitoring in logger components
