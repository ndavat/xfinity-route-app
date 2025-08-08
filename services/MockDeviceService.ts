import { DeviceService } from './ServiceInterfaces';
import { Device, TrafficData } from '../types/Device';
import { Config } from '../utils/config';

// Import the real device data from TestData
const deviceListData = [
  {"comments": "OnePlus 7 Pro", "connectionType": "Unknown", "customName": "OnePlus 7 Pro", "hostname": "36:E7:B5:EA:84:A1", "ip": "10.0.0.169", "isBlocked": false, "isOnline": true, "mac": "36:E7:B5:EA:84:A1", "networkDetails": {"band": "5GHz", "dhcpType": "DHCP", "ipv6": "fe80::34e7:b5ff:feea:84a1", "lastSeen": "2025-06-14T00:40:23.666Z", "localLinkIpv6": "", "protocol": "Unknown", "rssiLevel": "-62 dBm", "signalStrength": -62, "speed": undefined}},
  {"connectionType": "Unknown", "customName": "43TCLRokuTV", "hostname": "43TCLRokuTV", "ip": "10.0.0.161", "isBlocked": false, "isOnline": true, "mac": "94:B3:F7:05:4D:C3", "networkDetails": {"band": "5GHz", "dhcpType": "DHCP", "ipv6": "fe80::96b3:f7ff:fe05:4dc3", "lastSeen": "2025-06-14T00:40:23.665Z", "localLinkIpv6": "", "protocol": "Unknown", "rssiLevel": "-69 dBm", "signalStrength": -69, "speed": undefined}},
  {"comments": "Moto G Stylus 5G - 2023", "connectionType": "Unknown", "customName": "Moto G Stylus 5G - 2023", "hostname": "7a:3d:75:e7:33:ad", "ip": "10.0.0.117", "isBlocked": false, "isOnline": true, "mac": "7A:3D:75:E7:33:AD", "networkDetails": {"band": "5GHz", "dhcpType": "DHCP", "ipv6": "fe80::783d:75ff:fee7:33ad", "lastSeen": "2025-06-14T00:40:23.660Z", "localLinkIpv6": "", "protocol": "Unknown", "rssiLevel": "-67 dBm", "signalStrength": -67, "speed": undefined}},
  {"connectionType": "Unknown", "customName": "Chromecast-HD", "hostname": "Chromecast-HD", "ip": "10.0.0.198", "isBlocked": false, "isOnline": true, "mac": "9E:44:35:61:35:0B", "networkDetails": {"band": "5GHz", "dhcpType": "DHCP", "ipv6": "fe80::9c44:35ff:fe61:350b", "lastSeen": "2025-06-14T00:40:23.662Z", "localLinkIpv6": "", "protocol": "Unknown", "rssiLevel": "-77 dBm", "signalStrength": -77, "speed": undefined}},
  {"connectionType": "Unknown", "customName": "CX-5CD4088ZS8", "hostname": "CX-5CD4088ZS8", "ip": "10.0.0.44", "isBlocked": false, "isOnline": true, "mac": "8C:53:E6:BB:53:39", "networkDetails": {"band": "5GHz", "dhcpType": "DHCP", "ipv6": "fe80::d87d:d523:b3ae:fe79", "lastSeen": "2025-06-14T00:40:23.664Z", "localLinkIpv6": "", "protocol": "Unknown", "rssiLevel": "-56 dBm", "signalStrength": -56, "speed": undefined}},
  {"connectionType": "Unknown", "customName": "DESKTOP-843R24E", "hostname": "DESKTOP-843R24E", "ip": "10.0.0.98", "isBlocked": false, "isOnline": true, "mac": "D8:12:65:73:DB:CF", "networkDetails": {"band": "5GHz", "dhcpType": "DHCP", "ipv6": "fe80::d4fc:5f99:dbb7:afe", "lastSeen": "2025-06-14T00:40:23.661Z", "localLinkIpv6": "", "protocol": "Unknown", "rssiLevel": "-70 dBm", "signalStrength": -70, "speed": undefined}},
  {"connectionType": "Unknown", "customName": "moto-g-power-5G-XT2415V-3", "hostname": "moto-g-power-5G-XT2415V-3", "ip": "10.0.0.192", "isBlocked": false, "isOnline": true, "mac": "02:07:BB:9A:39:47", "networkDetails": {"band": "5GHz", "dhcpType": "DHCP", "ipv6": "fe80::7:bbff:fe9a:3947", "lastSeen": "2025-06-14T00:40:23.659Z", "localLinkIpv6": "", "protocol": "Unknown", "rssiLevel": "-73 dBm", "signalStrength": -73, "speed": undefined}},
  {"connectionType": "Unknown", "customName": "ND-S23-ultra", "hostname": "ND-S23-ultra", "ip": "10.0.0.57", "isBlocked": false, "isOnline": true, "mac": "E2:87:F6:D5:33:E2", "networkDetails": {"band": "5GHz", "dhcpType": "DHCP", "ipv6": "fe80::e087:f6ff:fed5:33e2", "lastSeen": "2025-06-14T00:40:23.656Z", "localLinkIpv6": "", "protocol": "Unknown", "rssiLevel": "-53 dBm", "signalStrength": -53, "speed": undefined}}
];

export class MockDeviceService implements DeviceService {
  private mockDevices: Device[] = this.transformDeviceData(deviceListData);

  private transformDeviceData(rawData: any[]): Device[] {
    console.log('MockDeviceService: Transforming', rawData.length, 'raw devices');
    
    const transformed = rawData.map(item => {
      const device: Device = {
        mac: item.mac,
        ip: item.ip,
        hostname: item.hostname,
        connectionType: item.connectionType === 'Unknown' ? 'WiFi' : item.connectionType, // Default to WiFi for Unknown
        customName: item.customName,
        isBlocked: item.isBlocked,
        isOnline: item.isOnline,
        comments: item.comments,
        networkDetails: {
          band: item.networkDetails.band as '2.4GHz' | '5GHz' | 'Unknown',
          protocol: item.networkDetails.protocol === 'Unknown' ? 'Wi-Fi 5' : item.networkDetails.protocol, // Default to Wi-Fi 5
          signalStrength: item.networkDetails.signalStrength,
          speed: item.networkDetails.speed || this.calculateSpeedFromSignal(item.networkDetails.signalStrength),
          lastSeen: item.networkDetails.lastSeen,
          ipv6: item.networkDetails.ipv6,
          localLinkIpv6: item.networkDetails.localLinkIpv6,
          dhcpType: item.networkDetails.dhcpType as 'DHCP' | 'Reserved',
          rssiLevel: this.convertRSSIToLevel(item.networkDetails.rssiLevel, item.networkDetails.signalStrength)
        }
      };
      
      console.log('MockDeviceService: Transformed device:', device.customName, device);
      return device;
    });
    
    console.log('MockDeviceService: Transformation complete, returning', transformed.length, 'devices');
    return transformed;
  }

  private calculateSpeedFromSignal(signalStrength?: number): string {
    if (!signalStrength) return 'Unknown';
    
    // Convert negative dBm to approximate speeds
    const strength = Math.abs(signalStrength);
    if (strength <= 50) return '867 Mbps'; // Excellent signal
    if (strength <= 60) return '433 Mbps'; // Good signal
    if (strength <= 70) return '144 Mbps'; // Fair signal
    return '72 Mbps'; // Poor signal
  }

  private convertRSSIToLevel(rssiLevel?: string, signalStrength?: number): string {
    if (rssiLevel && rssiLevel !== 'undefined') {
      return rssiLevel.replace(' dBm', '');
    }
    
    if (!signalStrength) return 'Unknown';
    
    const strength = Math.abs(signalStrength);
    if (strength <= 50) return 'Excellent';
    if (strength <= 60) return 'Good';
    if (strength <= 70) return 'Fair';
    return 'Poor';
  }

  async getDevices(): Promise<Device[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('MockDeviceService: getDevices called, returning', this.mockDevices.length, 'devices');
    console.log('MockDeviceService: Device sample:', this.mockDevices[0]);
    
    if (Config.app.debugMode) {
      console.log('Mock device service: returning', this.mockDevices.length, 'devices');
    }
    
    return [...this.mockDevices];
  }

  async getDevice(mac: string): Promise<Device | null> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const device = this.mockDevices.find(d => d.mac === mac);
    return device ? { ...device } : null;
  }

  async blockDevice(mac: string): Promise<boolean> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const device = this.mockDevices.find(d => d.mac === mac);
    if (device) {
      device.isBlocked = true;
      device.isOnline = false;
      
      if (Config.app.debugMode) {
        console.log(`Mock device service: blocked device ${mac}`);
      }
      return true;
    }
    return false;
  }

  async unblockDevice(mac: string): Promise<boolean> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const device = this.mockDevices.find(d => d.mac === mac);
    if (device) {
      device.isBlocked = false;
      device.isOnline = true;
      device.networkDetails.lastSeen = new Date().toISOString();
      
      if (Config.app.debugMode) {
        console.log(`Mock device service: unblocked device ${mac}`);
      }
      return true;
    }
    return false;
  }

  async getTrafficData(mac: string): Promise<TrafficData | null> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const device = this.mockDevices.find(d => d.mac === mac);
    if (!device) return null;
    
    // Generate mock traffic data
    const mockTrafficData: TrafficData = {
      bytesUp: Math.floor(Math.random() * 1000000000), // Random bytes up to 1GB
      bytesDown: Math.floor(Math.random() * 5000000000), // Random bytes up to 5GB
      packetsUp: Math.floor(Math.random() * 1000000),
      packetsDown: Math.floor(Math.random() * 2000000),
      lastUpdated: new Date()
    };
    
    return mockTrafficData;
  }

  /**
   * Mock implementation of fetchConnectedDevicesPage for Step 4
   * Returns a mock HTML string simulating the connected devices page
   */
  async fetchConnectedDevicesPage(): Promise<string> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (Config.app.debugMode) {
      console.log('[MockDeviceService] Returning mock connected devices HTML page');
    }
    
    // Return a mock HTML string that simulates the router's connected devices page
    const mockHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Connected Devices - Mock</title>
</head>
<body>
  <div id="online-private">
    <table class="data">
      <thead>
        <tr>
          <th>Device Name</th>
          <th>IP Address</th>
          <th>MAC Address</th>
          <th>Connection Type</th>
        </tr>
      </thead>
      <tbody>
        ${this.mockDevices.map(device => `
        <tr>
          <td headers="host-name"><a>${device.hostname}</a></td>
          <td>${device.ip}</td>
          <td>${device.mac}</td>
          <td headers="connection-type">${device.connectionType}</td>
          <td headers="dhcp-or-reserved">${device.networkDetails.dhcpType}</td>
          <td headers="rssi-level">${device.networkDetails.signalStrength} dBm</td>
          <div class="device-info">
            <dl>
              <dd>IPV4 Address ${device.ip}</dd>
              <dd>IPV6 Address ${device.networkDetails.ipv6 || ''}</dd>
              <dd>Local Link IPV6 Address ${device.networkDetails.localLinkIpv6 || ''}</dd>
              <dd>MAC Address ${device.mac}</dd>
              <dd>Comments ${device.comments || device.customName}</dd>
            </dl>
          </div>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
</body>
</html>`;
    
    return mockHtml;
  }
}
