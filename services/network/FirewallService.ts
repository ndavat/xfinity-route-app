import { authService } from '../core/AuthenticationService';
import { AxiosInstance } from 'axios';
import { parse } from 'node-html-parser';

// Firewall and port forwarding types
export interface PortForwardingRule {
  id: string;
  serviceName: string;
  externalPort: number;
  internalPort: number;
  internalIp: string;
  protocol: Protocol;
  enabled: boolean;
}

export interface FirewallConfiguration {
  level: FirewallLevel;
  enablePingBlock: boolean;
  enableIpv6Firewall: boolean;
  customRules?: CustomFirewallRule[];
}

export interface CustomFirewallRule {
  id: string;
  name: string;
  direction: 'inbound' | 'outbound';
  action: 'allow' | 'block';
  protocol: Protocol;
  sourceIp?: string;
  destinationIp?: string;
  port?: number;
  enabled: boolean;
}

export interface UpnpDevice {
  name: string;
  ip: string;
  mac: string;
  manufacturer: string;
  mappings: UpnpMapping[];
}

export interface UpnpMapping {
  description: string;
  externalPort: number;
  internalPort: number;
  protocol: Protocol;
  duration: number; // in seconds
}

export interface DmzConfiguration {
  enabled: boolean;
  hostIp: string;
}

export type Protocol = 'TCP' | 'UDP' | 'Both';
export type FirewallLevel = 'Low' | 'Typical' | 'High' | 'Custom';

export interface FirewallService {
  getPortForwardingRules(): Promise<PortForwardingRule[]>;
  addPortForwardingRule(rule: PortForwardingRule): Promise<boolean>;
  updatePortForwardingRule(rule: PortForwardingRule): Promise<boolean>;
  removePortForwardingRule(id: string): Promise<boolean>;
  getFirewallSettings(): Promise<FirewallConfiguration>;
  setFirewallSettings(config: FirewallConfiguration): Promise<boolean>;
  getUpnpDevices(): Promise<UpnpDevice[]>;
  setUpnpEnabled(enabled: boolean): Promise<boolean>;
  isUpnpEnabled(): Promise<boolean>;
  getDmzConfiguration(): Promise<DmzConfiguration>;
  setDmzConfiguration(config: DmzConfiguration): Promise<boolean>;
}

export class XfinityFirewallService implements FirewallService {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = authService.getAxiosInstance();
  }

  async getPortForwardingRules(): Promise<PortForwardingRule[]> {
    try {
      console.log('Getting port forwarding rules...');
      
      // Port forwarding page
      const response = await this.axiosInstance.get('/port_forwarding.asp');
      const root = parse(response.data);
      
      // Check if port forwarding is disabled by Comcast
      const disabledNotice = root.querySelector('.port-forward-disabled');
      if (disabledNotice) {
        console.warn('Port forwarding is managed by Xfinity app only');
        throw new Error('Port forwarding must be configured through the Xfinity mobile app');
      }
      
      // Find the port forwarding table
      const table = root.querySelector('table.port-forward-table');
      if (!table) {
        console.log('No port forwarding table found');
        return [];
      }
      
      // Parse forwarding rules
      const rows = table.querySelectorAll('tr:not(:first-child)'); // Skip header
      const rules: PortForwardingRule[] = [];
      
      rows.forEach((row, index) => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 6) {
          rules.push({
            id: `rule_${index}`,
            serviceName: cells[0].text.trim(),
            externalPort: parseInt(cells[1].text.trim()) || 0,
            internalPort: parseInt(cells[2].text.trim()) || 0,
            internalIp: cells[3].text.trim(),
            protocol: this.parseProtocol(cells[4].text.trim()),
            enabled: cells[5].querySelector('input[type="checkbox"]')?.getAttribute('checked') === 'checked',
          });
        }
      });
      
      console.log(`Found ${rules.length} port forwarding rules`);
      return rules;
    } catch (error: any) {
      console.error('Error getting port forwarding rules:', error);
      throw new Error(`Failed to get port forwarding rules: ${error.message}`);
    }
  }

  async addPortForwardingRule(rule: PortForwardingRule): Promise<boolean> {
    try {
      console.log('Adding port forwarding rule:', rule);
      
      // Validate rule
      this.validatePortForwardingRule(rule);
      
      // Check if we need to use UPnP workaround
      const upnpEnabled = await this.isUpnpEnabled();
      if (!upnpEnabled) {
        console.log('Enabling UPnP for port forwarding workaround...');
        await this.setUpnpEnabled(true);
      }
      
      // Try direct approach first
      const formData = new URLSearchParams({
        action: 'add',
        serviceName: rule.serviceName,
        externalPort: rule.externalPort.toString(),
        internalPort: rule.internalPort.toString(),
        internalIp: rule.internalIp,
        protocol: rule.protocol,
        enabled: rule.enabled ? '1' : '0',
      });
      
      const response = await this.axiosInstance.post(
        '/goform/PortForwarding',
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      
      if (response.status === 200 || response.status === 302) {
        console.log('Port forwarding rule added successfully');
        return true;
      }
      
      // If direct approach fails, try UPnP workaround
      console.log('Direct port forwarding failed, attempting UPnP workaround...');
      return await this.addPortForwardingViaUpnp(rule);
    } catch (error: any) {
      console.error('Error adding port forwarding rule:', error);
      throw new Error(`Failed to add port forwarding rule: ${error.message}`);
    }
  }

  async updatePortForwardingRule(rule: PortForwardingRule): Promise<boolean> {
    try {
      console.log('Updating port forwarding rule:', rule);
      
      // Validate rule
      this.validatePortForwardingRule(rule);
      
      const formData = new URLSearchParams({
        action: 'update',
        id: rule.id,
        serviceName: rule.serviceName,
        externalPort: rule.externalPort.toString(),
        internalPort: rule.internalPort.toString(),
        internalIp: rule.internalIp,
        protocol: rule.protocol,
        enabled: rule.enabled ? '1' : '0',
      });
      
      const response = await this.axiosInstance.post(
        '/goform/PortForwarding',
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      
      if (response.status === 200 || response.status === 302) {
        console.log('Port forwarding rule updated successfully');
        return true;
      }
      
      console.error('Failed to update port forwarding rule:', response.status);
      return false;
    } catch (error: any) {
      console.error('Error updating port forwarding rule:', error);
      throw new Error(`Failed to update port forwarding rule: ${error.message}`);
    }
  }

  async removePortForwardingRule(id: string): Promise<boolean> {
    try {
      console.log('Removing port forwarding rule:', id);
      
      const formData = new URLSearchParams({
        action: 'delete',
        id: id,
      });
      
      const response = await this.axiosInstance.post(
        '/goform/PortForwarding',
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      
      if (response.status === 200 || response.status === 302) {
        console.log('Port forwarding rule removed successfully');
        return true;
      }
      
      console.error('Failed to remove port forwarding rule:', response.status);
      return false;
    } catch (error: any) {
      console.error('Error removing port forwarding rule:', error);
      throw new Error(`Failed to remove port forwarding rule: ${error.message}`);
    }
  }

  async getFirewallSettings(): Promise<FirewallConfiguration> {
    try {
      console.log('Getting firewall settings...');
      
      // Firewall settings page
      const response = await this.axiosInstance.get('/firewall_settings.asp');
      const root = parse(response.data);
      
      // Extract firewall configuration
      const config: FirewallConfiguration = {
        level: this.parseFirewallLevel(this.extractFieldValue(root, 'FirewallLevel')),
        enablePingBlock: this.extractFieldValue(root, 'BlockPing') === '1',
        enableIpv6Firewall: this.extractFieldValue(root, 'IPv6Firewall') === '1',
      };
      
      // Get custom rules if in custom mode
      if (config.level === 'Custom') {
        config.customRules = await this.getCustomFirewallRules();
      }
      
      console.log('Firewall settings retrieved:', config);
      return config;
    } catch (error: any) {
      console.error('Error getting firewall settings:', error);
      // Return default settings
      return {
        level: 'Typical',
        enablePingBlock: false,
        enableIpv6Firewall: true,
      };
    }
  }

  async setFirewallSettings(config: FirewallConfiguration): Promise<boolean> {
    try {
      console.log('Setting firewall configuration:', config);
      
      const formData = new URLSearchParams({
        FirewallLevel: config.level,
        BlockPing: config.enablePingBlock ? '1' : '0',
        IPv6Firewall: config.enableIpv6Firewall ? '1' : '0',
      });
      
      const response = await this.axiosInstance.post(
        '/goform/FirewallSettings',
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      
      if (response.status === 200 || response.status === 302) {
        console.log('Firewall settings updated successfully');
        
        // Apply custom rules if needed
        if (config.level === 'Custom' && config.customRules) {
          await this.applyCustomFirewallRules(config.customRules);
        }
        
        return true;
      }
      
      console.error('Failed to update firewall settings:', response.status);
      return false;
    } catch (error: any) {
      console.error('Error setting firewall configuration:', error);
      throw new Error(`Failed to set firewall configuration: ${error.message}`);
    }
  }

  async getUpnpDevices(): Promise<UpnpDevice[]> {
    try {
      console.log('Getting UPnP devices...');
      
      // UPnP status page
      const response = await this.axiosInstance.get('/upnp_status.asp');
      const root = parse(response.data);
      
      // Find the UPnP devices table
      const table = root.querySelector('table.upnp-devices');
      if (!table) {
        console.log('No UPnP devices table found');
        return [];
      }
      
      // Parse UPnP devices
      const rows = table.querySelectorAll('tr:not(:first-child)'); // Skip header
      const devices: UpnpDevice[] = [];
      
      for (const row of rows) {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 4) {
          const device: UpnpDevice = {
            name: cells[0].text.trim(),
            ip: cells[1].text.trim(),
            mac: cells[2].text.trim(),
            manufacturer: cells[3].text.trim(),
            mappings: [],
          };
          
          // Get port mappings for this device
          device.mappings = await this.getUpnpMappingsForDevice(device.ip);
          
          devices.push(device);
        }
      }
      
      console.log(`Found ${devices.length} UPnP devices`);
      return devices;
    } catch (error: any) {
      console.error('Error getting UPnP devices:', error);
      return [];
    }
  }

  async setUpnpEnabled(enabled: boolean): Promise<boolean> {
    try {
      console.log(`${enabled ? 'Enabling' : 'Disabling'} UPnP...`);
      
      const formData = new URLSearchParams({
        UPNPEnable: enabled ? '1' : '0',
      });
      
      const response = await this.axiosInstance.post(
        '/goform/UPNPEnable',
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      
      if (response.status === 200 || response.status === 302) {
        console.log(`UPnP ${enabled ? 'enabled' : 'disabled'} successfully`);
        return true;
      }
      
      console.error('Failed to change UPnP status:', response.status);
      return false;
    } catch (error: any) {
      console.error('Error setting UPnP status:', error);
      throw new Error(`Failed to set UPnP status: ${error.message}`);
    }
  }

  async isUpnpEnabled(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get('/device_discovery.asp');
      const root = parse(response.data);
      
      const upnpCheckbox = root.querySelector('input[name="UPNPEnable"]');
      return upnpCheckbox?.getAttribute('checked') === 'checked';
    } catch (error: any) {
      console.error('Error checking UPnP status:', error);
      return false;
    }
  }

  async getDmzConfiguration(): Promise<DmzConfiguration> {
    try {
      console.log('Getting DMZ configuration...');
      
      const response = await this.axiosInstance.get('/dmz_settings.asp');
      const root = parse(response.data);
      
      const config: DmzConfiguration = {
        enabled: this.extractFieldValue(root, 'DmzEnable') === '1',
        hostIp: this.extractFieldValue(root, 'DmzHost') || '',
      };
      
      console.log('DMZ configuration retrieved:', config);
      return config;
    } catch (error: any) {
      console.error('Error getting DMZ configuration:', error);
      return {
        enabled: false,
        hostIp: '',
      };
    }
  }

  async setDmzConfiguration(config: DmzConfiguration): Promise<boolean> {
    try {
      console.log('Setting DMZ configuration:', config);
      
      if (config.enabled && !this.isValidIp(config.hostIp)) {
        throw new Error('Invalid DMZ host IP address');
      }
      
      const formData = new URLSearchParams({
        DmzEnable: config.enabled ? '1' : '0',
        DmzHost: config.hostIp,
      });
      
      const response = await this.axiosInstance.post(
        '/goform/DmzConfig',
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      
      if (response.status === 200 || response.status === 302) {
        console.log('DMZ configuration updated successfully');
        return true;
      }
      
      console.error('Failed to update DMZ configuration:', response.status);
      return false;
    } catch (error: any) {
      console.error('Error setting DMZ configuration:', error);
      throw new Error(`Failed to set DMZ configuration: ${error.message}`);
    }
  }

  // Helper methods
  private async addPortForwardingViaUpnp(rule: PortForwardingRule): Promise<boolean> {
    try {
      console.log('Attempting to add port forwarding via UPnP workaround...');
      
      // Connect to miniupnpd on port 2828 as mentioned in the manual
      const soapEnvelope = `<?xml version="1.0"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" 
            s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <s:Body>
    <u:AddPortMapping xmlns:u="urn:schemas-upnp-org:service:WANIPConnection:1">
      <NewRemoteHost></NewRemoteHost>
      <NewExternalPort>${rule.externalPort}</NewExternalPort>
      <NewProtocol>${rule.protocol === 'Both' ? 'TCP' : rule.protocol}</NewProtocol>
      <NewInternalPort>${rule.internalPort}</NewInternalPort>
      <NewInternalClient>${rule.internalIp}</NewInternalClient>
      <NewEnabled>1</NewEnabled>
      <NewPortMappingDescription>${rule.serviceName}</NewPortMappingDescription>
      <NewLeaseDuration>0</NewLeaseDuration>
    </u:AddPortMapping>
  </s:Body>
</s:Envelope>`;
      
      // Send SOAP request to UPnP service
      const upnpResponse = await this.axiosInstance.post(
        'http://10.0.0.1:2828/control/WANIPConnection',
        soapEnvelope,
        {
          headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            'SOAPAction': '"urn:schemas-upnp-org:service:WANIPConnection:1#AddPortMapping"',
          },
        }
      );
      
      if (upnpResponse.status === 200) {
        console.log('Port forwarding rule added via UPnP successfully');
        
        // If protocol is "Both", add UDP rule as well
        if (rule.protocol === 'Both') {
          const udpEnvelope = soapEnvelope.replace('<NewProtocol>TCP</NewProtocol>', '<NewProtocol>UDP</NewProtocol>');
          await this.axiosInstance.post(
            'http://10.0.0.1:2828/control/WANIPConnection',
            udpEnvelope,
            {
              headers: {
                'Content-Type': 'text/xml; charset=utf-8',
                'SOAPAction': '"urn:schemas-upnp-org:service:WANIPConnection:1#AddPortMapping"',
              },
            }
          );
        }
        
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('UPnP port forwarding failed:', error);
      return false;
    }
  }

  private async getUpnpMappingsForDevice(deviceIp: string): Promise<UpnpMapping[]> {
    // This would require querying UPnP service for device-specific mappings
    // For now, return empty array
    return [];
  }

  private async getCustomFirewallRules(): Promise<CustomFirewallRule[]> {
    // Get custom firewall rules if available
    // This feature might not be exposed in standard Xfinity firmware
    return [];
  }

  private async applyCustomFirewallRules(rules: CustomFirewallRule[]): Promise<boolean> {
    // Apply custom firewall rules
    // This would require specific endpoints based on firmware
    console.log('Custom firewall rules not implemented in standard firmware');
    return true;
  }

  private extractFieldValue(root: any, fieldName: string): string {
    const input = root.querySelector(`input[name="${fieldName}"]`);
    if (input) {
      return input.getAttribute('value') || '';
    }
    
    const select = root.querySelector(`select[name="${fieldName}"] option[selected]`);
    if (select) {
      return select.getAttribute('value') || '';
    }
    
    const element = root.querySelector(`#${fieldName}`);
    if (element) {
      return element.text || element.getAttribute('value') || '';
    }
    
    return '';
  }

  private validatePortForwardingRule(rule: PortForwardingRule) {
    if (!rule.serviceName || rule.serviceName.length > 32) {
      throw new Error('Service name must be between 1 and 32 characters');
    }
    
    if (rule.externalPort < 1 || rule.externalPort > 65535) {
      throw new Error('External port must be between 1 and 65535');
    }
    
    if (rule.internalPort < 1 || rule.internalPort > 65535) {
      throw new Error('Internal port must be between 1 and 65535');
    }
    
    if (!this.isValidIp(rule.internalIp)) {
      throw new Error('Invalid internal IP address');
    }
  }

  private isValidIp(ip: string): boolean {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) {
      return false;
    }
    
    const parts = ip.split('.');
    return parts.every(part => {
      const num = parseInt(part);
      return num >= 0 && num <= 255;
    });
  }

  private parseProtocol(value: string): Protocol {
    const normalized = value.toUpperCase();
    if (normalized === 'TCP' || normalized === 'UDP') {
      return normalized as Protocol;
    }
    return 'Both';
  }

  private parseFirewallLevel(value: string): FirewallLevel {
    const levelMap: Record<string, FirewallLevel> = {
      'low': 'Low',
      'typical': 'Typical',
      'high': 'High',
      'custom': 'Custom',
    };
    
    return levelMap[value.toLowerCase()] || 'Typical';
  }
}

// Export singleton instance
export const firewallService = new XfinityFirewallService();
