import { Device, TrafficData } from '../types/Device';

// Router Service Interfaces
export interface RestartResult {
  success: boolean;
  message: string;
  estimatedDowntime?: number;
}

export interface RouterInfo {
  status: string;
  uptime: string;
  connectedDevices: number;
  model?: string;
  firmware?: string;
  wifiSSID?: string;
}

export interface RouterService {
  restartRouter(): Promise<RestartResult>;
  isRestartSupported(): boolean;
  checkConnection(): Promise<boolean>;
  getRouterInfo(): Promise<RouterInfo>;
}

// Device Service Interfaces
export interface DeviceService {
  getDevices(): Promise<Device[]>;
  getDevice(id: string): Promise<Device | null>;
  blockDevice(id: string): Promise<boolean>;
  unblockDevice(id: string): Promise<boolean>;
  getTrafficData(id: string): Promise<TrafficData | null>;
}

// Service Factory for creating service instances based on mode
export class ServiceFactory {
  static createRouterService(isMockMode: boolean): RouterService {
    console.log('ServiceFactory: Creating router service, isMockMode:', isMockMode);
    
    if (isMockMode) {
      console.log('ServiceFactory: Creating MockRouterService');
      const { MockRouterService } = require('./MockRouterService');
      return new MockRouterService();
    } else {
      console.log('ServiceFactory: Creating LiveRouterService');
      const { LiveRouterService } = require('./LiveRouterService');
      return new LiveRouterService();
    }
  }

  static createDeviceService(isMockMode: boolean): DeviceService {
    console.log('ServiceFactory: Creating device service, isMockMode:', isMockMode);
    
    if (isMockMode) {
      console.log('ServiceFactory: Creating MockDeviceService');
      const { MockDeviceService } = require('./MockDeviceService');
      return new MockDeviceService();
    } else {
      const { LiveDeviceService } = require('./LiveDeviceService');
      return new LiveDeviceService();
    }
  }
}
