import { parse } from 'node-html-parser';

export interface ConnectedDevice {
  hostName: string;
  macAddress: string;
  ipv4Address?: string;
  ipv6Address?: string;
  localLinkIPv6Address?: string;
  connectionType?: string;
  rssiLevel?: string;
  comments?: string;
  leaseExpires?: string;
}

export interface RouterStatus {
  systemUptime?: string;
  internetStatus?: string;
  totalClients?: number;
  connectedDevices: ConnectedDevice[];
}

export class RouterHtmlParser {
  /**
   * Parse connection status page HTML to extract router status information
   */
  public static parseConnectionStatus(html: string): RouterStatus {
    const root = parse(html);
    const status: RouterStatus = { connectedDevices: [] };

    // Extract system uptime from the connection status page
    // Look for elements that contain uptime information
    const uptimeElements = root.querySelectorAll('span, td, div');
    for (const element of uptimeElements) {
      const text = element.text.trim();
      if (text.includes('System Uptime') || text.includes('uptime')) {
        // Try to find the uptime value in the same element or nearby elements
        const parent = element.parentNode;
        if (parent) {
          const parentText = parent.text;
          const uptimeMatch = parentText.match(/(\d+\s+days?\s+\d+\s+hours?\s+\d+\s+minutes?)/i) ||
                             parentText.match(/(\d+:\d+:\d+)/);
          if (uptimeMatch) {
            status.systemUptime = uptimeMatch[1];
            break;
          }
        }
      }
    }

    // Extract internet status from connection status indicators
    const internetStatusImg = root.querySelector('img[alt*="Internet"]');
    if (internetStatusImg) {
      const alt = internetStatusImg.getAttribute('alt') || '';
      status.internetStatus = alt.replace('Internet ', '').toLowerCase();
    } else {
      // Try alternative selectors for internet status
      const statusElements = root.querySelectorAll('.status, .connection-status, [class*="internet"]');
      for (const element of statusElements) {
        const text = element.text.toLowerCase();
        if (text.includes('connected') || text.includes('online')) {
          status.internetStatus = 'connected';
          break;
        } else if (text.includes('disconnected') || text.includes('offline')) {
          status.internetStatus = 'disconnected';
          break;
        }
      }
    }

    return status;
  }

  /**
   * Parse connected devices page HTML to extract device information
   */
  public static parseConnectedDevices(html: string): RouterStatus {
    const root = parse(html);
    const status: RouterStatus = { connectedDevices: [] };

    // Find the main devices table
    const deviceTable = root.querySelector('table.data, table[class*="device"], .device-list table');
    
    if (!deviceTable) {
      return status;
    }

    // Get all device rows (skip header rows)
    const rows = deviceTable.querySelectorAll('tbody tr, tr:not(:first-child)');

    for (const row of rows) {
      const device: ConnectedDevice = {
        hostName: '',
        macAddress: ''
      };

      // Extract device information from various possible structures
      const cells = row.querySelectorAll('td');
      
      // Try to find hostname
      const hostNameCell = cells.find(cell => 
        cell.getAttribute('headers')?.includes('host') ||
        cell.classNames.includes('host') ||
        cell.querySelector('a')
      );
      
      if (hostNameCell) {
        const link = hostNameCell.querySelector('a');
        device.hostName = (link?.text || hostNameCell.text).trim();
      }

      // Extract MAC address
      const macCell = cells.find(cell => 
        cell.text.match(/([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})/)
      );
      
      if (macCell) {
        const macMatch = macCell.text.match(/([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})/);
        if (macMatch) {
          device.macAddress = macMatch[0];
        }
      }

      // Extract IP addresses
      const ipv4Match = row.text.match(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/);
      if (ipv4Match) {
        device.ipv4Address = ipv4Match[0];
      }

      const ipv6Match = row.text.match(/([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}/);
      if (ipv6Match) {
        device.ipv6Address = ipv6Match[0];
      }

      // Extract connection type
      const connectionTypes = ['Ethernet', 'Wi-Fi', 'WiFi', 'Wireless', 'MoCA'];
      for (const type of connectionTypes) {
        if (row.text.includes(type)) {
          device.connectionType = type;
          break;
        }
      }

      // Extract RSSI level for wireless devices
      const rssiMatch = row.text.match(/-?\d+\s*dBm/);
      if (rssiMatch) {
        device.rssiLevel = rssiMatch[0];
      }

      // Only add device if we have at least hostname or MAC address
      if (device.hostName || device.macAddress) {
        status.connectedDevices.push(device);
      }
    }

    status.totalClients = status.connectedDevices.length;

    return status;
  }

  /**
   * Parse "at a glance" dashboard page to extract summary information
   */
  public static parseAtAGlance(html: string): RouterStatus {
    const root = parse(html);
    const status: RouterStatus = { connectedDevices: [] };

    // Extract total client count from summary displays
    const clientCountElements = root.querySelectorAll('.client-count, .device-count, [class*="connected"]');
    for (const element of clientCountElements) {
      const text = element.text;
      const countMatch = text.match(/(\d+)\s*(?:device|client|connected)/i);
      if (countMatch) {
        status.totalClients = parseInt(countMatch[1], 10);
        break;
      }
    }

    // Extract internet status from dashboard indicators
    const internetStatusImg = root.querySelector('img[alt*="Internet"], img[src*="internet"]');
    if (internetStatusImg) {
      const alt = internetStatusImg.getAttribute('alt') || '';
      const src = internetStatusImg.getAttribute('src') || '';
      
      if (alt.toLowerCase().includes('connected') || src.includes('connected')) {
        status.internetStatus = 'connected';
      } else if (alt.toLowerCase().includes('disconnected') || src.includes('disconnected')) {
        status.internetStatus = 'disconnected';
      }
    }

    return status;
  }

  /**
   * Generic method to extract any router parameter by selector
   */
  public static extractParameter(html: string, selector: string): string | null {
    const root = parse(html);
    const element = root.querySelector(selector);
    return element ? element.text.trim() : null;
  }

  /**
   * Extract multiple parameters at once using an object map of selectors
   */
  public static extractParameters(html: string, selectors: Record<string, string>): Record<string, string | null> {
    const root = parse(html);
    const results: Record<string, string | null> = {};
    
    for (const [key, selector] of Object.entries(selectors)) {
      const element = root.querySelector(selector);
      results[key] = element ? element.text.trim() : null;
    }
    
    return results;
  }
}
