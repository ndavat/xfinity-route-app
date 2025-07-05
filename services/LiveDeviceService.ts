import { DeviceService } from './ServiceInterfaces';
import { Device, TrafficData } from '../types/Device';
import { Config } from '../utils/config';
import { parse } from 'node-html-parser';

export class LiveDeviceService implements DeviceService {
  private baseUrl: string;
  private timeout: number;
  private username: string;

  constructor() {
    this.baseUrl = `http://${Config.router.defaultIp}`;
    this.timeout = Config.api.timeout;
    this.username = Config.router.defaultUsername;
  }

  private createTimeoutSignal(): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), this.timeout);
    return controller.signal;
  }

  async getDevices(): Promise<Device[]> {
    try {
      const response = await fetch(`${this.baseUrl}${Config.router.deviceEndpoint}`, {
        headers: {
          'Authorization': `Basic ${btoa(`${this.username}:${Config.router.defaultPassword}`)}`,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: this.createTimeoutSignal()
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseText = await response.text();
      const root = parse(responseText);
      
      // Find the online devices section
      const onlineSection = root.querySelector('#online-private');
      if (!onlineSection) {
        throw new Error('Invalid router response: Missing online-private section');
      }

      // Find the devices table
      const table = onlineSection.querySelector('table.data');
      if (!table) {
        throw new Error('Invalid router response: Missing devices table');
      }

      // Find all device rows in the table (skip header and footer)
      const deviceRows = table.querySelectorAll('tr:not(:first-child):not(:last-child)');
      if (Config.app.debugMode) {
        console.log(`Found ${deviceRows.length} device rows`);
      }
      
      // Extract and validate device information from each row
      const devices = deviceRows.map(row => {
        try {
          // Get the device info div that contains all the details
          const deviceInfoDiv = row.querySelector('.device-info');
          if (!deviceInfoDiv) return null;

          // Extract all details from the definition list
          const details = this.extractDeviceDetails(deviceInfoDiv);
          
          // Get the basic info from the row
          const hostNameCell = row.querySelector('[headers="host-name"] a');
          const dhcpCell = row.querySelector('[headers="dhcp-or-reserved"]');
          const rssiCell = row.querySelector('[headers="rssi-level"]');
          const connectionCell = row.querySelector('[headers="connection-type"]');

          const device: Device = {
            hostname: hostNameCell?.text?.trim() || 'Unknown Device',
            ip: details.ipv4,
            mac: details.mac,
            connectionType: this.parseConnectionType(connectionCell?.text?.trim()),
            isBlocked: false,
            isOnline: true,
            customName: details.comments || '',
            networkDetails: {
              band: 'Unknown',
              protocol: 'Unknown',
              dhcpType: dhcpCell?.text?.trim() === 'Reserved' ? 'Reserved' : 'DHCP',
              signalStrength: this.parseRSSI(rssiCell?.text?.trim()),
              lastSeen: new Date().toISOString()
            }
          };

          return device;
        } catch (error) {
          if (Config.app.debugMode) {
            console.error('Error parsing device row:', error);
          }
          return null;
        }
      });

      // Filter out invalid devices and sort by hostname
      const validDevices = devices
        .filter((device): device is Device => device !== null)
        .sort((a, b) => a.hostname.localeCompare(b.hostname));

      if (Config.app.debugMode) {
        console.log(`Successfully validated ${validDevices.length} devices`);
      }
      return validDevices;
    } catch (error: any) {
      if (Config.app.debugMode) {
        console.error('Failed to fetch devices:', error);
      }
      throw new Error(`Failed to fetch devices: ${error.message}`);
    }
  }

  private extractDeviceDetails(deviceInfoDiv: any) {
    const details: any = {
      ipv4: '',
      ipv6: '',
      localLinkIpv6: '',
      mac: '',
      comments: ''
    };

    const definitionList = deviceInfoDiv.querySelector('dl');
    if (!definitionList) return details;

    const definitions = definitionList.querySelectorAll('dd');
    definitions.forEach((dd: any) => {
      const text = dd.text.trim();
      if (text.includes('IPV4 Address')) {
        details.ipv4 = text.split('IPV4 Address')[1].trim();
      } else if (text.includes('IPV6 Address')) {
        details.ipv6 = text.split('IPV6 Address')[1].trim();
      } else if (text.includes('Local Link IPV6 Address')) {
        details.localLinkIpv6 = text.split('Local Link IPV6 Address')[1].trim();
      } else if (text.includes('MAC Address')) {
        details.mac = text.split('MAC Address')[1].trim();
      } else if (text.includes('Comments')) {
        details.comments = text.split('Comments')[1].trim();
      }
    });

    return details;
  }

  private parseRSSI(rssi: string | undefined): number | undefined {
    if (!rssi) return undefined;
    const match = rssi.match(/-?\d+/);
    return match ? parseInt(match[0], 10) : undefined;
  }

  private parseConnectionType(connectionType: string | undefined): 'WiFi' | 'Ethernet' | 'Unknown' {
    if (!connectionType) return 'Unknown';
    const type = connectionType.toLowerCase();
    if (type.includes('wifi') || type.includes('wi-fi') || type.includes('wireless')) {
      return 'WiFi';
    } else if (type.includes('ethernet') || type.includes('wired')) {
      return 'Ethernet';
    }
    return 'Unknown';
  }

  async getDevice(id: string): Promise<Device | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/devices/${id}`, {
        headers: {
          'Authorization': `Basic ${btoa(`${this.username}:${Config.router.defaultPassword}`)}`
        },
        signal: this.createTimeoutSignal(),
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
        signal: this.createTimeoutSignal(),
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
        signal: this.createTimeoutSignal(),
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
        signal: this.createTimeoutSignal(),
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
