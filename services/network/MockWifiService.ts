import { 
  WifiService, 
  WifiConfiguration, 
  WifiBand, 
  AuthMode,
  GuestNetworkConfig,
  WifiNetwork,
  WifiSchedule 
} from './WifiService';

export class MockWifiService implements WifiService {
  private mockWifiConfig2_4: WifiConfiguration = {
    ssid: 'MyHome_2.4G',
    band: '2.4GHz',
    authMode: 'WPA2-PSK',
    password: 'SecurePassword123',
    channel: 6,
    enabled: true,
    broadcastSSID: true,
    wpsEnabled: false,
  };

  private mockWifiConfig5: WifiConfiguration = {
    ssid: 'MyHome_5G',
    band: '5GHz',
    authMode: 'WPA2-PSK',
    password: 'SecurePassword123',
    channel: 36,
    enabled: true,
    broadcastSSID: true,
    wpsEnabled: false,
  };

  private mockGuestConfig: GuestNetworkConfig = {
    enabled: false,
    ssid: 'MyHome_Guest',
    password: 'GuestPassword123',
    authMode: 'WPA2-PSK',
    maxGuests: 10,
    isolateGuests: true,
  };

  private mockSchedule: WifiSchedule = {
    enabled: false,
    days: [],
    startTime: '22:00',
    endTime: '06:00',
  };

  async getWifiConfiguration(band?: WifiBand): Promise<WifiConfiguration> {
    console.log(`MockWifiService: Getting Wi-Fi configuration for ${band || 'all bands'}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (band === '5GHz') {
      return { ...this.mockWifiConfig5 };
    }
    return { ...this.mockWifiConfig2_4 };
  }

  async setWifiConfiguration(config: WifiConfiguration): Promise<boolean> {
    console.log('MockWifiService: Setting Wi-Fi configuration:', config);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update the mock configuration
    if (config.band === '5GHz') {
      this.mockWifiConfig5 = { ...config };
    } else {
      this.mockWifiConfig2_4 = { ...config };
    }
    
    return true;
  }

  async getAvailableChannels(band: WifiBand): Promise<number[]> {
    console.log(`MockWifiService: Getting available channels for ${band}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    if (band === '5GHz') {
      return [36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 144, 149, 153, 157, 161, 165];
    }
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  }

  async scanNetworks(): Promise<WifiNetwork[]> {
    console.log('MockWifiService: Scanning for Wi-Fi networks');
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Return mock nearby networks
    return [
      {
        ssid: 'Neighbor_WiFi',
        bssid: '00:11:22:33:44:55',
        channel: 1,
        frequency: 2412,
        signalLevel: -65,
        capabilities: ['WPA2-PSK'],
      },
      {
        ssid: 'Coffee_Shop_WiFi',
        bssid: '00:11:22:33:44:66',
        channel: 11,
        frequency: 2462,
        signalLevel: -80,
        capabilities: ['Open'],
      },
      {
        ssid: 'Another_Network_5G',
        bssid: '00:11:22:33:44:77',
        channel: 36,
        frequency: 5180,
        signalLevel: -70,
        capabilities: ['WPA3-PSK'],
      },
    ];
  }

  async toggleWifi(enabled: boolean, band?: WifiBand): Promise<boolean> {
    console.log(`MockWifiService: ${enabled ? 'Enabling' : 'Disabling'} Wi-Fi for ${band || 'all bands'}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (band === '5GHz' || !band) {
      this.mockWifiConfig5.enabled = enabled;
    }
    if (band === '2.4GHz' || !band) {
      this.mockWifiConfig2_4.enabled = enabled;
    }
    
    return true;
  }

  async configureGuestNetwork(config: GuestNetworkConfig): Promise<boolean> {
    console.log('MockWifiService: Configuring guest network:', config);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.mockGuestConfig = { ...config };
    return true;
  }

  async getGuestNetworkConfig(): Promise<GuestNetworkConfig> {
    console.log('MockWifiService: Getting guest network configuration');
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return { ...this.mockGuestConfig };
  }

  async setWifiSchedule(schedule: WifiSchedule): Promise<boolean> {
    console.log('MockWifiService: Setting Wi-Fi schedule:', schedule);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    this.mockSchedule = { ...schedule };
    return true;
  }

  async getWifiSchedule(): Promise<WifiSchedule> {
    console.log('MockWifiService: Getting Wi-Fi schedule');
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return { ...this.mockSchedule };
  }
}

// Export singleton instance
export const mockWifiService = new MockWifiService();
