import { DeviceService } from './ServiceInterfaces';
import { Device, TrafficData } from '../types/Device';
import { Config } from '../utils/config';

export class LiveDeviceService implements DeviceService {
  private baseUrl: string;
  private timeout: number;
  private username: string;

  constructor() {
    this.baseUrl = `http://${Config.router.defaultIp}`;
    this.timeout = Config.api.timeout;
    this.username = Config.router.defaultUsername;
  }

  async getDevices(): Promise<Device[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/devices`, {
        headers: {
          'Authorization': `Basic ${btoa(`${this.username}:${Config.router.defaultPassword}`)}`
        },
        signal: AbortSignal.timeout(this.timeout),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error: any) {
      if (Config.app.debugMode) {
        console.error('Failed to fetch devices:', error);
      }
      throw new Error(`Failed to fetch devices: ${error.message}`);
    }
  }

  async getDevice(id: string): Promise<Device | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/devices/${id}`, {
        headers: {
          'Authorization': `Basic ${btoa(`${this.username}:${Config.router.defaultPassword}`)}`
        },
        signal: AbortSignal.timeout(this.timeout),
      });
      
      if (response.status === 404) {
        return null;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error: any) {
      if (Config.app.debugMode) {
        console.error(`Failed to fetch device ${id}:`, error);
      }
      return null;
    }
  }

  async blockDevice(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/devices/${id}/block`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${this.username}:${Config.router.defaultPassword}`)}`
        },
        signal: AbortSignal.timeout(this.timeout),
      });
      
      return response.ok;
    } catch (error: any) {
      if (Config.app.debugMode) {
        console.error(`Failed to block device ${id}:`, error);
      }
      return false;
    }
  }

  async unblockDevice(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/devices/${id}/unblock`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${this.username}:${Config.router.defaultPassword}`)}`
        },
        signal: AbortSignal.timeout(this.timeout),
      });
      
      return response.ok;
    } catch (error: any) {
      if (Config.app.debugMode) {
        console.error(`Failed to unblock device ${id}:`, error);
      }
      return false;
    }
  }

  async getTrafficData(id: string): Promise<TrafficData | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/devices/${id}/traffic`, {
        headers: {
          'Authorization': `Basic ${btoa(`${this.username}:${Config.router.defaultPassword}`)}`
        },
        signal: AbortSignal.timeout(this.timeout),
      });
      
      if (response.status === 404) {
        return null;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return {
        ...data,
        lastUpdated: new Date(data.lastUpdated)
      };
    } catch (error: any) {
      if (Config.app.debugMode) {
        console.error(`Failed to fetch traffic data for device ${id}:`, error);
      }
      return null;
    }
  }
}
