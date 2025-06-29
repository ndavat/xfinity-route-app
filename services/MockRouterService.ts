import { RouterService, RestartResult, RouterInfo } from './ServiceInterfaces';
import { Config } from '../utils/config';

export class MockRouterService implements RouterService {
  async restartRouter(): Promise<RestartResult> {
    if (Config.app.debugMode) {
      console.log('Mock router restart initiated');
    }
    
    // Use configured mock delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      success: true,
      message: 'Router restart simulated successfully',
      estimatedDowntime: 120
    };
  }

  isRestartSupported(): boolean {
    return true; // Mock always supports restart
  }

  async checkConnection(): Promise<boolean> {
    if (Config.app.debugMode) {
      console.log('Mock router connection check - always returns true');
    }
    
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return true; // Mock mode is always "connected"
  }

  async getRouterInfo(): Promise<RouterInfo> {
    if (Config.app.debugMode) {
      console.log('Mock router info requested');
    }
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return {
      status: 'Online',
      uptime: '2 days, 14 hours, 23 minutes',
      connectedDevices: 8, // Match the actual device count from devicelist.json
      model: 'Xfinity XB7 Gateway (Simulated)',
      firmware: '2.0.1.7-MOCK',
      wifiSSID: 'HOME-WIFI-DEMO'
    };
  }
}
