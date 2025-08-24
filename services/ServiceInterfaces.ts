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
  fetchConnectedDevicesPage(): Promise<string>;
}

// Service Factory for creating service instances based on mode
export class ServiceFactory {
  static createRouterService(): RouterService {
    console.log('ServiceFactory: Creating LiveRouterService');
    const { LiveRouterService } = require('./LiveRouterService');
    return new LiveRouterService();
  }

  static createDeviceService(): DeviceService {
    console.log('ServiceFactory: Creating LiveDeviceService');
    const { LiveDeviceService } = require('./LiveDeviceService');
    return new LiveDeviceService();
  }
}
