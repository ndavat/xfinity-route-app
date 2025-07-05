import { authService } from '../core/AuthenticationService';
import { AxiosInstance } from 'axios';
import { parse } from 'node-html-parser';

// Wi-Fi configuration types
export interface WifiConfiguration {
  ssid: string;
  band: WifiBand;
  authMode: AuthMode;
  password: string;
  channel: number; // 0 for auto
  enabled: boolean;
  broadcastSSID: boolean;
  wpsEnabled: boolean;
}

export interface GuestNetworkConfig {
  enabled: boolean;
  ssid: string;
  password: string;
  authMode: AuthMode;
  maxGuests: number;
  isolateGuests: boolean;
}

export interface WifiNetwork {
  ssid: string;
  bssid: string;
  channel: number;
  frequency: number;
  signalLevel: number;
  capabilities: string[];
}

export interface WifiSchedule {
  enabled: boolean;
  days: string[]; // ['Mon', 'Tue', etc.]
  startTime: string; // 'HH:MM'
  endTime: string; // 'HH:MM'
}

export type WifiBand = '2.4GHz' | '5GHz';
export type AuthMode = 'Open' | 'WEP' | 'WPA-PSK' | 'WPA2-PSK' | 'WPA3-PSK' | 'WPA2/WPA3-PSK';
export type WifiProtocol = '802.11b' | '802.11g' | '802.11n' | '802.11ac' | '802.11ax';

export interface WifiService {
  getWifiConfiguration(band?: WifiBand): Promise<WifiConfiguration>;
  setWifiConfiguration(config: WifiConfiguration): Promise<boolean>;
  getAvailableChannels(band: WifiBand): Promise<number[]>;
  scanNetworks(): Promise<WifiNetwork[]>;
  toggleWifi(enabled: boolean, band?: WifiBand): Promise<boolean>;
  configureGuestNetwork(config: GuestNetworkConfig): Promise<boolean>;
  getGuestNetworkConfig(): Promise<GuestNetworkConfig>;
  setWifiSchedule(schedule: WifiSchedule): Promise<boolean>;
  getWifiSchedule(): Promise<WifiSchedule>;
}

export class XfinityWifiService implements WifiService {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = authService.getAxiosInstance();
  }

  async getWifiConfiguration(band?: WifiBand): Promise<WifiConfiguration> {
    try {
      console.log(`Getting Wi-Fi configuration for ${band || 'all bands'}...`);
      
      // According to the manual, Wi-Fi config is at /wlanRadio.asp
      const response = await this.axiosInstance.get('/wlanRadio.asp');
      
      // Parse the HTML response
      const root = parse(response.data);
      
      // Extract configuration based on band
      const targetBand = band || '2.4GHz'; // Default to 2.4GHz if not specified
      const config = this.extractWifiConfig(root, targetBand);
      
      console.log('Wi-Fi configuration retrieved:', config);
      return config;
    } catch (error: any) {
      console.error('Error getting Wi-Fi configuration:', error);
      throw new Error(`Failed to get Wi-Fi configuration: ${error.message}`);
    }
  }

  async setWifiConfiguration(config: WifiConfiguration): Promise<boolean> {
    try {
      console.log('Setting Wi-Fi configuration:', config);
      
      // Validate configuration
      this.validateWifiConfig(config);
      
      // According to the manual, Wi-Fi settings are posted to /goform/WifiBasicCfg
      const formData = new URLSearchParams({
        wlOpMode: config.band === '5GHz' ? '5G' : '2.4G',
        wlSsid: config.ssid,
        wlAuthMode: this.mapAuthMode(config.authMode),
        wlWpaPsk: config.password,
        wlChannel: config.channel.toString(),
        wlHide: config.broadcastSSID ? '0' : '1',
        wlEnableWireless: config.enabled ? '1' : '0',
        wlWpsEnable: config.wpsEnabled ? '1' : '0',
      });
      
      const response = await this.axiosInstance.post(
        '/goform/WifiBasicCfg',
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      
      // Check if the configuration was applied successfully
      if (response.status === 200 || response.status === 302) {
        console.log('Wi-Fi configuration updated successfully');
        return true;
      }
      
      console.error('Failed to update Wi-Fi configuration:', response.status);
      return false;
    } catch (error: any) {
      console.error('Error setting Wi-Fi configuration:', error);
      throw new Error(`Failed to set Wi-Fi configuration: ${error.message}`);
    }
  }

  async getAvailableChannels(band: WifiBand): Promise<number[]> {
    try {
      console.log(`Getting available channels for ${band}...`);
      
      // Standard channels for each band
      const channelMap: Record<WifiBand, number[]> = {
        '2.4GHz': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        '5GHz': [36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 144, 149, 153, 157, 161, 165],
      };
      
      // In a real implementation, you might query the router for supported channels
      // For now, return standard channels
      const channels = channelMap[band] || [];
      
      console.log(`Available channels for ${band}:`, channels);
      return channels;
    } catch (error: any) {
      console.error('Error getting available channels:', error);
      throw new Error(`Failed to get available channels: ${error.message}`);
    }
  }

  async scanNetworks(): Promise<WifiNetwork[]> {
    try {
      console.log('Scanning for nearby Wi-Fi networks...');
      
      // Note: Most routers don't expose network scanning via web interface
      // This would typically require special firmware or alternative access
      // For now, return empty array or mock data
      
      console.warn('Network scanning not available on standard Xfinity firmware');
      return [];
    } catch (error: any) {
      console.error('Error scanning networks:', error);
      throw new Error(`Failed to scan networks: ${error.message}`);
    }
  }

  async toggleWifi(enabled: boolean, band?: WifiBand): Promise<boolean> {
    try {
      console.log(`${enabled ? 'Enabling' : 'Disabling'} Wi-Fi for ${band || 'all bands'}...`);
      
      // Get current configuration
      const currentConfig = await this.getWifiConfiguration(band);
      
      // Update enabled status
      currentConfig.enabled = enabled;
      
      // Apply the configuration
      const success = await this.setWifiConfiguration(currentConfig);
      
      if (success) {
        console.log(`Wi-Fi ${enabled ? 'enabled' : 'disabled'} successfully`);
      }
      
      return success;
    } catch (error: any) {
      console.error('Error toggling Wi-Fi:', error);
      throw new Error(`Failed to toggle Wi-Fi: ${error.message}`);
    }
  }

  async configureGuestNetwork(config: GuestNetworkConfig): Promise<boolean> {
    try {
      console.log('Configuring guest network:', config);
      
      // Guest network configuration varies by firmware
      // This is a typical implementation
      const formData = new URLSearchParams({
        guestNetworkEnable: config.enabled ? '1' : '0',
        guestNetworkSSID: config.ssid,
        guestNetworkPassword: config.password,
        guestNetworkAuthMode: this.mapAuthMode(config.authMode),
        guestNetworkMaxClients: config.maxGuests.toString(),
        guestNetworkIsolation: config.isolateGuests ? '1' : '0',
      });
      
      const response = await this.axiosInstance.post(
        '/goform/GuestNetwork',
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      
      if (response.status === 200 || response.status === 302) {
        console.log('Guest network configured successfully');
        return true;
      }
      
      console.error('Failed to configure guest network:', response.status);
      return false;
    } catch (error: any) {
      console.error('Error configuring guest network:', error);
      // Guest network might not be available on all firmware versions
      if (error.response?.status === 404) {
        throw new Error('Guest network feature not available on this router');
      }
      throw new Error(`Failed to configure guest network: ${error.message}`);
    }
  }

  async getGuestNetworkConfig(): Promise<GuestNetworkConfig> {
    try {
      console.log('Getting guest network configuration...');
      
      // Try to get guest network settings
      const response = await this.axiosInstance.get('/guest_network.asp');
      const root = parse(response.data);
      
      // Extract guest network configuration
      const config: GuestNetworkConfig = {
        enabled: this.extractFieldValue(root, 'guestNetworkEnable') === '1',
        ssid: this.extractFieldValue(root, 'guestNetworkSSID'),
        password: this.extractFieldValue(root, 'guestNetworkPassword'),
        authMode: this.parseAuthMode(this.extractFieldValue(root, 'guestNetworkAuthMode')),
        maxGuests: parseInt(this.extractFieldValue(root, 'guestNetworkMaxClients')) || 10,
        isolateGuests: this.extractFieldValue(root, 'guestNetworkIsolation') === '1',
      };
      
      console.log('Guest network configuration retrieved:', config);
      return config;
    } catch (error: any) {
      console.error('Error getting guest network configuration:', error);
      // Return default configuration if guest network is not available
      return {
        enabled: false,
        ssid: '',
        password: '',
        authMode: 'WPA2-PSK',
        maxGuests: 10,
        isolateGuests: true,
      };
    }
  }

  async setWifiSchedule(schedule: WifiSchedule): Promise<boolean> {
    try {
      console.log('Setting Wi-Fi schedule:', schedule);
      
      // Wi-Fi scheduling might be under parental controls or access control
      const formData = new URLSearchParams({
        wifiScheduleEnable: schedule.enabled ? '1' : '0',
        wifiScheduleDays: schedule.days.join(','),
        wifiScheduleStartTime: schedule.startTime,
        wifiScheduleEndTime: schedule.endTime,
      });
      
      const response = await this.axiosInstance.post(
        '/goform/WifiSchedule',
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      
      if (response.status === 200 || response.status === 302) {
        console.log('Wi-Fi schedule set successfully');
        return true;
      }
      
      console.error('Failed to set Wi-Fi schedule:', response.status);
      return false;
    } catch (error: any) {
      console.error('Error setting Wi-Fi schedule:', error);
      // Wi-Fi scheduling might not be available
      if (error.response?.status === 404) {
        throw new Error('Wi-Fi scheduling not available on this router');
      }
      throw new Error(`Failed to set Wi-Fi schedule: ${error.message}`);
    }
  }

  async getWifiSchedule(): Promise<WifiSchedule> {
    try {
      console.log('Getting Wi-Fi schedule...');
      
      // Try to get Wi-Fi schedule settings
      const response = await this.axiosInstance.get('/wifi_schedule.asp');
      const root = parse(response.data);
      
      // Extract schedule configuration
      const schedule: WifiSchedule = {
        enabled: this.extractFieldValue(root, 'wifiScheduleEnable') === '1',
        days: this.extractFieldValue(root, 'wifiScheduleDays').split(',').filter(d => d),
        startTime: this.extractFieldValue(root, 'wifiScheduleStartTime') || '00:00',
        endTime: this.extractFieldValue(root, 'wifiScheduleEndTime') || '00:00',
      };
      
      console.log('Wi-Fi schedule retrieved:', schedule);
      return schedule;
    } catch (error: any) {
      console.error('Error getting Wi-Fi schedule:', error);
      // Return default schedule if not available
      return {
        enabled: false,
        days: [],
        startTime: '00:00',
        endTime: '00:00',
      };
    }
  }

  // Helper methods
  private extractWifiConfig(root: any, band: WifiBand): WifiConfiguration {
    // Extract configuration from parsed HTML
    // This would need to be adapted based on actual HTML structure
    const bandPrefix = band === '5GHz' ? 'wl5g' : 'wl';
    
    return {
      ssid: this.extractFieldValue(root, `${bandPrefix}Ssid`),
      band,
      authMode: this.parseAuthMode(this.extractFieldValue(root, `${bandPrefix}AuthMode`)),
      password: this.extractFieldValue(root, `${bandPrefix}WpaPsk`),
      channel: parseInt(this.extractFieldValue(root, `${bandPrefix}Channel`)) || 0,
      enabled: this.extractFieldValue(root, `${bandPrefix}EnableWireless`) !== '0',
      broadcastSSID: this.extractFieldValue(root, `${bandPrefix}Hide`) !== '1',
      wpsEnabled: this.extractFieldValue(root, `${bandPrefix}WpsEnable`) === '1',
    };
  }

  private extractFieldValue(root: any, fieldName: string): string {
    // Try to find input field
    const input = root.querySelector(`input[name="${fieldName}"]`);
    if (input) {
      return input.getAttribute('value') || '';
    }
    
    // Try to find select field
    const select = root.querySelector(`select[name="${fieldName}"] option[selected]`);
    if (select) {
      return select.getAttribute('value') || '';
    }
    
    // Try to find by ID
    const element = root.querySelector(`#${fieldName}`);
    if (element) {
      return element.text || element.getAttribute('value') || '';
    }
    
    return '';
  }

  private validateWifiConfig(config: WifiConfiguration) {
    // Validate SSID
    if (!config.ssid || config.ssid.length > 32) {
      throw new Error('SSID must be between 1 and 32 characters');
    }
    
    // Validate password based on auth mode
    if (config.authMode !== 'Open') {
      if (!config.password || config.password.length < 8 || config.password.length > 63) {
        throw new Error('Password must be between 8 and 63 characters');
      }
    }
    
    // Validate channel
    const availableChannels = config.band === '5GHz' 
      ? [0, 36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 144, 149, 153, 157, 161, 165]
      : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    
    if (!availableChannels.includes(config.channel)) {
      throw new Error(`Invalid channel ${config.channel} for ${config.band}`);
    }
  }

  private mapAuthMode(authMode: AuthMode): string {
    // Map our auth modes to router-specific values
    const authMap: Record<AuthMode, string> = {
      'Open': 'open',
      'WEP': 'wep',
      'WPA-PSK': 'wpapsk',
      'WPA2-PSK': 'wpa2psk',
      'WPA3-PSK': 'wpa3psk',
      'WPA2/WPA3-PSK': 'wpa2wpa3psk',
    };
    
    return authMap[authMode] || 'wpa2psk';
  }

  private parseAuthMode(value: string): AuthMode {
    // Map router values back to our auth modes
    const reverseMap: Record<string, AuthMode> = {
      'open': 'Open',
      'wep': 'WEP',
      'wpapsk': 'WPA-PSK',
      'wpa2psk': 'WPA2-PSK',
      'wpa3psk': 'WPA3-PSK',
      'wpa2wpa3psk': 'WPA2/WPA3-PSK',
    };
    
    return reverseMap[value.toLowerCase()] || 'WPA2-PSK';
  }
}

