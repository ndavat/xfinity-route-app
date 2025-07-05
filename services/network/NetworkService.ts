import { authService } from '../core/AuthenticationService';
import { AxiosInstance } from 'axios';
import { parse } from 'node-html-parser';

// Network configuration types
export interface DhcpConfiguration {
  enabled: boolean;
  startAddress: string;
  endAddress: string;
  leaseTime: number; // in minutes
  subnet: string;
  gateway: string;
}

export interface StaticReservation {
  mac: string;
  ip: string;
  hostname: string;
  description?: string;
}

export interface DnsConfiguration {
  primaryDns: string;
  secondaryDns: string;
  useDhcpDns: boolean;
}

export interface Ipv6Configuration {
  enabled: boolean;
  mode: 'auto' | 'static' | 'passthrough';
  prefix?: string;
  prefixLength?: number;
}

export interface BridgeModeStatus {
  enabled: boolean;
  canToggle: boolean;
  warning?: string;
}

export interface NetworkService {
  getDhcpSettings(): Promise<DhcpConfiguration>;
  setDhcpSettings(config: DhcpConfiguration): Promise<boolean>;
  getStaticReservations(): Promise<StaticReservation[]>;
  addStaticReservation(reservation: StaticReservation): Promise<boolean>;
  removeStaticReservation(mac: string): Promise<boolean>;
  getBridgeModeStatus(): Promise<BridgeModeStatus>;
  setBridgeMode(enabled: boolean): Promise<boolean>;
  getDnsSettings(): Promise<DnsConfiguration>;
  setDnsSettings(config: DnsConfiguration): Promise<boolean>;
  getIpv6Settings(): Promise<Ipv6Configuration>;
  setIpv6Settings(config: Ipv6Configuration): Promise<boolean>;
}

export class XfinityNetworkService implements NetworkService {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = authService.getAxiosInstance();
  }

  async getDhcpSettings(): Promise<DhcpConfiguration> {
    try {
      console.log('Getting DHCP settings...');
      
      // DHCP settings are typically on the Local IP Network page
      const response = await this.axiosInstance.get('/local_ip_network.asp');
      const root = parse(response.data);
      
      // Extract DHCP configuration
      const config: DhcpConfiguration = {
        enabled: this.extractFieldValue(root, 'DhcpEnable') === '1',
        startAddress: this.extractFieldValue(root, 'StartAddress') || '10.0.0.100',
        endAddress: this.extractFieldValue(root, 'EndAddress') || '10.0.0.250',
        leaseTime: parseInt(this.extractFieldValue(root, 'LeaseTime')) || 1440, // Default 24 hours
        subnet: this.extractFieldValue(root, 'SubnetMask') || '255.255.255.0',
        gateway: this.extractFieldValue(root, 'Gateway') || '10.0.0.1',
      };
      
      console.log('DHCP settings retrieved:', config);
      return config;
    } catch (error: any) {
      console.error('Error getting DHCP settings:', error);
      throw new Error(`Failed to get DHCP settings: ${error.message}`);
    }
  }

  async setDhcpSettings(config: DhcpConfiguration): Promise<boolean> {
    try {
      console.log('Setting DHCP configuration:', config);
      
      // Validate configuration
      this.validateDhcpConfig(config);
      
      // According to the manual, DHCP settings are posted to /goform/DhcpConfig
      const formData = new URLSearchParams({
        DhcpEnable: config.enabled ? '1' : '0',
        StartAddress: config.startAddress,
        EndAddress: config.endAddress,
        LeaseTime: config.leaseTime.toString(),
        SubnetMask: config.subnet,
        Gateway: config.gateway,
      });
      
      const response = await this.axiosInstance.post(
        '/goform/DhcpConfig',
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      
      if (response.status === 200 || response.status === 302) {
        console.log('DHCP settings updated successfully');
        return true;
      }
      
      console.error('Failed to update DHCP settings:', response.status);
      return false;
    } catch (error: any) {
      console.error('Error setting DHCP configuration:', error);
      throw new Error(`Failed to set DHCP configuration: ${error.message}`);
    }
  }

  async getStaticReservations(): Promise<StaticReservation[]> {
    try {
      console.log('Getting static IP reservations...');
      
      // Static reservations are typically on a separate page
      const response = await this.axiosInstance.get('/dhcp_reservations.asp');
      const root = parse(response.data);
      
      // Find the reservations table
      const table = root.querySelector('table.reservations');
      if (!table) {
        console.log('No reservations table found');
        return [];
      }
      
      // Parse reservation rows
      const rows = table.querySelectorAll('tr:not(:first-child)'); // Skip header
      const reservations: StaticReservation[] = [];
      
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 3) {
          reservations.push({
            mac: cells[0].text.trim(),
            ip: cells[1].text.trim(),
            hostname: cells[2].text.trim(),
            description: cells[3]?.text.trim(),
          });
        }
      });
      
      console.log(`Found ${reservations.length} static reservations`);
      return reservations;
    } catch (error: any) {
      console.error('Error getting static reservations:', error);
      // Return empty array if the feature is not available
      return [];
    }
  }

  async addStaticReservation(reservation: StaticReservation): Promise<boolean> {
    try {
      console.log('Adding static reservation:', reservation);
      
      // Validate reservation
      this.validateReservation(reservation);
      
      const formData = new URLSearchParams({
        action: 'add',
        mac: reservation.mac,
        ip: reservation.ip,
        hostname: reservation.hostname,
        description: reservation.description || '',
      });
      
      const response = await this.axiosInstance.post(
        '/goform/DhcpReservation',
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      
      if (response.status === 200 || response.status === 302) {
        console.log('Static reservation added successfully');
        return true;
      }
      
      console.error('Failed to add static reservation:', response.status);
      return false;
    } catch (error: any) {
      console.error('Error adding static reservation:', error);
      throw new Error(`Failed to add static reservation: ${error.message}`);
    }
  }

  async removeStaticReservation(mac: string): Promise<boolean> {
    try {
      console.log('Removing static reservation for MAC:', mac);
      
      const formData = new URLSearchParams({
        action: 'delete',
        mac: mac,
      });
      
      const response = await this.axiosInstance.post(
        '/goform/DhcpReservation',
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      
      if (response.status === 200 || response.status === 302) {
        console.log('Static reservation removed successfully');
        return true;
      }
      
      console.error('Failed to remove static reservation:', response.status);
      return false;
    } catch (error: any) {
      console.error('Error removing static reservation:', error);
      throw new Error(`Failed to remove static reservation: ${error.message}`);
    }
  }

  async getBridgeModeStatus(): Promise<BridgeModeStatus> {
    try {
      console.log('Getting bridge mode status...');
      
      // Bridge mode status is typically on the gateway settings page
      const response = await this.axiosInstance.get('/gateway_settings.asp');
      const root = parse(response.data);
      
      // Extract bridge mode status
      const bridgeModeEnabled = this.extractFieldValue(root, 'BridgeMode') === '1';
      const canToggle = !root.querySelector('.bridge-mode-disabled');
      
      const status: BridgeModeStatus = {
        enabled: bridgeModeEnabled,
        canToggle,
        warning: bridgeModeEnabled 
          ? 'Router is in bridge mode. Most features are disabled.'
          : 'Enabling bridge mode will disable router features including Wi-Fi.',
      };
      
      console.log('Bridge mode status:', status);
      return status;
    } catch (error: any) {
      console.error('Error getting bridge mode status:', error);
      return {
        enabled: false,
        canToggle: false,
        warning: 'Unable to determine bridge mode status',
      };
    }
  }

  async setBridgeMode(enabled: boolean): Promise<boolean> {
    try {
      console.log(`${enabled ? 'Enabling' : 'Disabling'} bridge mode...`);
      
      // Bridge mode toggle requires confirmation and will reboot the router
      const formData = new URLSearchParams({
        BridgeModeEnable: enabled ? '1' : '0',
        confirm: '1', // Confirm the action
      });
      
      const response = await this.axiosInstance.post(
        '/goform/BridgeModeEnable',
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 10000, // Router will reboot
        }
      );
      
      // A timeout or connection reset is expected as the router reboots
      if (response.status === 200 || response.status === 302) {
        console.log('Bridge mode change initiated, router will reboot');
        return true;
      }
      
      console.error('Failed to change bridge mode:', response.status);
      return false;
    } catch (error: any) {
      // Timeout is expected when changing bridge mode
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
        console.log('Bridge mode change initiated (timeout expected)');
        return true;
      }
      console.error('Error setting bridge mode:', error);
      throw new Error(`Failed to set bridge mode: ${error.message}`);
    }
  }

  async getDnsSettings(): Promise<DnsConfiguration> {
    try {
      console.log('Getting DNS settings...');
      
      // DNS settings might be on the WAN or network settings page
      const response = await this.axiosInstance.get('/wan_network.asp');
      const root = parse(response.data);
      
      // Extract DNS configuration
      const config: DnsConfiguration = {
        primaryDns: this.extractFieldValue(root, 'PrimaryDNS') || '8.8.8.8',
        secondaryDns: this.extractFieldValue(root, 'SecondaryDNS') || '8.8.4.4',
        useDhcpDns: this.extractFieldValue(root, 'UseDhcpDNS') === '1',
      };
      
      console.log('DNS settings retrieved:', config);
      return config;
    } catch (error: any) {
      console.error('Error getting DNS settings:', error);
      // Return default DNS settings
      return {
        primaryDns: '8.8.8.8',
        secondaryDns: '8.8.4.4',
        useDhcpDns: true,
      };
    }
  }

  async setDnsSettings(config: DnsConfiguration): Promise<boolean> {
    try {
      console.log('Setting DNS configuration:', config);
      
      // Validate DNS addresses
      this.validateDnsConfig(config);
      
      const formData = new URLSearchParams({
        PrimaryDNS: config.primaryDns,
        SecondaryDNS: config.secondaryDns,
        UseDhcpDNS: config.useDhcpDns ? '1' : '0',
      });
      
      const response = await this.axiosInstance.post(
        '/goform/DnsConfig',
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      
      if (response.status === 200 || response.status === 302) {
        console.log('DNS settings updated successfully');
        return true;
      }
      
      console.error('Failed to update DNS settings:', response.status);
      return false;
    } catch (error: any) {
      console.error('Error setting DNS configuration:', error);
      throw new Error(`Failed to set DNS configuration: ${error.message}`);
    }
  }

  async getIpv6Settings(): Promise<Ipv6Configuration> {
    try {
      console.log('Getting IPv6 settings...');
      
      // IPv6 settings might be on a separate page or under advanced settings
      const response = await this.axiosInstance.get('/ipv6_settings.asp');
      const root = parse(response.data);
      
      // Extract IPv6 configuration
      const config: Ipv6Configuration = {
        enabled: this.extractFieldValue(root, 'IPv6Enable') === '1',
        mode: (this.extractFieldValue(root, 'IPv6Mode') || 'auto') as any,
        prefix: this.extractFieldValue(root, 'IPv6Prefix'),
        prefixLength: parseInt(this.extractFieldValue(root, 'IPv6PrefixLength')) || 64,
      };
      
      console.log('IPv6 settings retrieved:', config);
      return config;
    } catch (error: any) {
      console.error('Error getting IPv6 settings:', error);
      // Return default IPv6 settings
      return {
        enabled: false,
        mode: 'auto',
      };
    }
  }

  async setIpv6Settings(config: Ipv6Configuration): Promise<boolean> {
    try {
      console.log('Setting IPv6 configuration:', config);
      
      const formData = new URLSearchParams({
        IPv6Enable: config.enabled ? '1' : '0',
        IPv6Mode: config.mode,
      });
      
      if (config.mode === 'static' && config.prefix && config.prefixLength) {
        formData.append('IPv6Prefix', config.prefix);
        formData.append('IPv6PrefixLength', config.prefixLength.toString());
      }
      
      const response = await this.axiosInstance.post(
        '/goform/IPv6Config',
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      
      if (response.status === 200 || response.status === 302) {
        console.log('IPv6 settings updated successfully');
        return true;
      }
      
      console.error('Failed to update IPv6 settings:', response.status);
      return false;
    } catch (error: any) {
      console.error('Error setting IPv6 configuration:', error);
      // IPv6 might not be available on all firmware versions
      if (error.response?.status === 404) {
        throw new Error('IPv6 configuration not available on this router');
      }
      throw new Error(`Failed to set IPv6 configuration: ${error.message}`);
    }
  }

  // Helper methods
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

  private validateDhcpConfig(config: DhcpConfiguration) {
    // Validate IP addresses
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    
    if (!ipRegex.test(config.startAddress) || !ipRegex.test(config.endAddress)) {
      throw new Error('Invalid IP address format');
    }
    
    // Validate IP range
    const start = this.ipToNumber(config.startAddress);
    const end = this.ipToNumber(config.endAddress);
    
    if (start >= end) {
      throw new Error('Start address must be less than end address');
    }
    
    // Validate lease time
    if (config.leaseTime < 1 || config.leaseTime > 10080) { // 1 minute to 1 week
      throw new Error('Lease time must be between 1 minute and 1 week');
    }
  }

  private validateReservation(reservation: StaticReservation) {
    // Validate MAC address
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    if (!macRegex.test(reservation.mac)) {
      throw new Error('Invalid MAC address format');
    }
    
    // Validate IP address
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(reservation.ip)) {
      throw new Error('Invalid IP address format');
    }
    
    // Validate hostname
    if (!reservation.hostname || reservation.hostname.length > 63) {
      throw new Error('Hostname must be between 1 and 63 characters');
    }
  }

  private validateDnsConfig(config: DnsConfiguration) {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    
    if (!config.useDhcpDns) {
      if (!ipRegex.test(config.primaryDns)) {
        throw new Error('Invalid primary DNS address');
      }
      
      if (config.secondaryDns && !ipRegex.test(config.secondaryDns)) {
        throw new Error('Invalid secondary DNS address');
      }
    }
  }

  private ipToNumber(ip: string): number {
    const parts = ip.split('.');
    return parts.reduce((acc, part, index) => {
      return acc + (parseInt(part) << (8 * (3 - index)));
    }, 0);
  }
}

// Export singleton instance
export const networkService = new XfinityNetworkService();
