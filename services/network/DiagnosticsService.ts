import { authService } from '../core/AuthenticationService';
import { AxiosInstance } from 'axios';
import { parse } from 'node-html-parser';

// Diagnostics types
export interface SystemLog {
  timestamp: Date;
  level: LogLevel;
  category: string;
  message: string;
  source?: string;
}

export interface LogFilter {
  level?: LogLevel[];
  category?: string[];
  startDate?: Date;
  endDate?: Date;
  searchText?: string;
}

export interface PingResult {
  host: string;
  packetsTransmitted: number;
  packetsReceived: number;
  packetLoss: number; // percentage
  minTime: number; // ms
  avgTime: number; // ms
  maxTime: number; // ms
  success: boolean;
}

export interface TracerouteHop {
  hop: number;
  host: string;
  ip: string;
  times: number[]; // ms for each probe
}

export interface TracerouteResult {
  destination: string;
  hops: TracerouteHop[];
  complete: boolean;
}

export interface SpeedTestResult {
  download: number; // Mbps
  upload: number; // Mbps
  ping: number; // ms
  jitter: number; // ms
  testServer: string;
  timestamp: Date;
}

export interface LedStatus {
  power: LedState;
  cm: LedState; // Cable Modem (US/DS)
  online: LedState;
  wifi24: LedState;
  wifi50: LedState;
  tel1: LedState;
  tel2: LedState;
}

export interface SignalStrengthData {
  downstream: ChannelSignal[];
  upstream: ChannelSignal[];
}

export interface ChannelSignal {
  channel: number;
  frequency: number; // MHz
  power: number; // dBmV
  snr: number; // dB
  modulation: string;
  locked: boolean;
}

export interface BatteryStatus {
  present: boolean;
  charging: boolean;
  capacity: number; // percentage
  voltage: number; // volts
  temperature: number; // celsius
  runtime: number; // minutes
  health: 'Good' | 'Fair' | 'Poor' | 'Replace';
}

export type LogLevel = 'Error' | 'Warning' | 'Info' | 'Debug';
export type LedState = 'Off' | 'Solid' | 'Blinking';

export interface DiagnosticsService {
  getSystemLogs(): Promise<SystemLog[]>;
  getFilteredLogs(filter: LogFilter): Promise<SystemLog[]>;
  performPingTest(host: string, count?: number): Promise<PingResult>;
  performTraceroute(host: string): Promise<TracerouteResult>;
  performSpeedTest(): Promise<SpeedTestResult>;
  getLedStatus(): Promise<LedStatus>;
  getSignalStrength(): Promise<SignalStrengthData>;
  getBatteryStatus(): Promise<BatteryStatus>;
  downloadLogs(): Promise<Blob>;
}

export class XfinityDiagnosticsService implements DiagnosticsService {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = authService.getAxiosInstance();
  }

  async getSystemLogs(): Promise<SystemLog[]> {
    try {
      console.log('Getting system logs...');
      
      // According to the manual, logs are at /rg_logs.htm
      const response = await this.axiosInstance.get('/rg_logs.htm');
      
      // Parse the plain text logs
      const logs = this.parseSystemLogs(response.data);
      
      console.log(`Retrieved ${logs.length} system logs`);
      return logs;
    } catch (error: any) {
      console.error('Error getting system logs:', error);
      throw new Error(`Failed to get system logs: ${error.message}`);
    }
  }

  async getFilteredLogs(filter: LogFilter): Promise<SystemLog[]> {
    try {
      console.log('Getting filtered logs:', filter);
      
      // Get all logs first
      const allLogs = await this.getSystemLogs();
      
      // Apply filters
      let filteredLogs = allLogs;
      
      if (filter.level && filter.level.length > 0) {
        filteredLogs = filteredLogs.filter(log => filter.level!.includes(log.level));
      }
      
      if (filter.category && filter.category.length > 0) {
        filteredLogs = filteredLogs.filter(log => 
          filter.category!.some(cat => log.category.includes(cat))
        );
      }
      
      if (filter.startDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.startDate!);
      }
      
      if (filter.endDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= filter.endDate!);
      }
      
      if (filter.searchText) {
        const searchLower = filter.searchText.toLowerCase();
        filteredLogs = filteredLogs.filter(log => 
          log.message.toLowerCase().includes(searchLower)
        );
      }
      
      console.log(`Filtered to ${filteredLogs.length} logs`);
      return filteredLogs;
    } catch (error: any) {
      console.error('Error filtering logs:', error);
      throw new Error(`Failed to filter logs: ${error.message}`);
    }
  }

  async performPingTest(host: string, count: number = 4): Promise<PingResult> {
    try {
      console.log(`Performing ping test to ${host}...`);
      
      // Some routers expose ping functionality through web interface
      const formData = new URLSearchParams({
        action: 'ping',
        host: host,
        count: count.toString(),
      });
      
      const response = await this.axiosInstance.post(
        '/goform/DiagnosticPing',
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 30000, // 30 seconds for ping test
        }
      );
      
      // Parse ping results
      const result = this.parsePingResult(response.data);
      
      console.log('Ping test completed:', result);
      return result;
    } catch (error: any) {
      console.error('Error performing ping test:', error);
      // Return failed result if ping is not available
      return {
        host,
        packetsTransmitted: count,
        packetsReceived: 0,
        packetLoss: 100,
        minTime: 0,
        avgTime: 0,
        maxTime: 0,
        success: false,
      };
    }
  }

  async performTraceroute(host: string): Promise<TracerouteResult> {
    try {
      console.log(`Performing traceroute to ${host}...`);
      
      const formData = new URLSearchParams({
        action: 'traceroute',
        host: host,
        maxHops: '30',
      });
      
      const response = await this.axiosInstance.post(
        '/goform/DiagnosticTraceroute',
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 60000, // 60 seconds for traceroute
        }
      );
      
      // Parse traceroute results
      const result = this.parseTracerouteResult(response.data);
      
      console.log('Traceroute completed:', result);
      return result;
    } catch (error: any) {
      console.error('Error performing traceroute:', error);
      // Return empty result if traceroute is not available
      return {
        destination: host,
        hops: [],
        complete: false,
      };
    }
  }

  async performSpeedTest(): Promise<SpeedTestResult> {
    try {
      console.log('Performing speed test...');
      
      // Most routers don't have built-in speed test
      // This would typically require integration with external service
      console.warn('Speed test not available on standard Xfinity firmware');
      
      // Return placeholder result
      return {
        download: 0,
        upload: 0,
        ping: 0,
        jitter: 0,
        testServer: 'Not available',
        timestamp: new Date(),
      };
    } catch (error: any) {
      console.error('Error performing speed test:', error);
      throw new Error(`Speed test not available: ${error.message}`);
    }
  }

  async getLedStatus(): Promise<LedStatus> {
    try {
      console.log('Getting LED status...');
      
      // LED status might be on the status page
      const response = await this.axiosInstance.get('/status.asp');
      const root = parse(response.data);
      
      // Extract LED states based on the manual's JSON key mapping
      const status: LedStatus = {
        power: this.extractLedState(root, 'led.power'),
        cm: this.extractLedState(root, 'led.cm'),
        online: this.extractLedState(root, 'led.online'),
        wifi24: this.extractLedState(root, 'led.wifi24'),
        wifi50: this.extractLedState(root, 'led.wifi50'),
        tel1: this.extractLedState(root, 'led.tel1'),
        tel2: this.extractLedState(root, 'led.tel2'),
      };
      
      console.log('LED status retrieved:', status);
      return status;
    } catch (error: any) {
      console.error('Error getting LED status:', error);
      // Return default status
      return {
        power: 'Solid',
        cm: 'Solid',
        online: 'Solid',
        wifi24: 'Off',
        wifi50: 'Off',
        tel1: 'Off',
        tel2: 'Off',
      };
    }
  }

  async getSignalStrength(): Promise<SignalStrengthData> {
    try {
      console.log('Getting signal strength data...');
      
      // DOCSIS signal information is typically on the connection status page
      const response = await this.axiosInstance.get('/connection_status.asp');
      const root = parse(response.data);
      
      // Find downstream and upstream tables
      const downstreamTable = root.querySelector('table#downstream-table');
      const upstreamTable = root.querySelector('table#upstream-table');
      
      const data: SignalStrengthData = {
        downstream: this.parseChannelTable(downstreamTable, 'downstream'),
        upstream: this.parseChannelTable(upstreamTable, 'upstream'),
      };
      
      console.log('Signal strength data retrieved:', data);
      return data;
    } catch (error: any) {
      console.error('Error getting signal strength:', error);
      // Return empty data
      return {
        downstream: [],
        upstream: [],
      };
    }
  }

  async getBatteryStatus(): Promise<BatteryStatus> {
    try {
      console.log('Getting battery status...');
      
      // According to the manual, battery status is at /batteryTestStatus.asp
      const response = await this.axiosInstance.get('/batteryTestStatus.asp');
      const root = parse(response.data);
      
      // Extract battery information
      const status: BatteryStatus = {
        present: this.extractFieldValue(root, 'BATT_PRESENT') === '1',
        charging: this.extractFieldValue(root, 'BATT_CHARGING') === '1',
        capacity: parseInt(this.extractFieldValue(root, 'BATT_CAPACITY')) || 0,
        voltage: parseFloat(this.extractFieldValue(root, 'BATT_VOLTAGE')) || 0,
        temperature: parseFloat(this.extractFieldValue(root, 'BATT_TEMP')) || 0,
        runtime: parseInt(this.extractFieldValue(root, 'BATT_RUNTIME')) || 0,
        health: this.parseBatteryHealth(this.extractFieldValue(root, 'BATT_HEALTH')),
      };
      
      console.log('Battery status retrieved:', status);
      return status;
    } catch (error: any) {
      console.error('Error getting battery status:', error);
      // Return no battery status
      return {
        present: false,
        charging: false,
        capacity: 0,
        voltage: 0,
        temperature: 0,
        runtime: 0,
        health: 'Good',
      };
    }
  }

  async downloadLogs(): Promise<Blob> {
    try {
      console.log('Downloading system logs...');
      
      // Get logs as blob for download
      const response = await this.axiosInstance.get('/rg_logs.htm', {
        responseType: 'blob',
      });
      
      console.log('Logs downloaded successfully');
      return response.data;
    } catch (error: any) {
      console.error('Error downloading logs:', error);
      throw new Error(`Failed to download logs: ${error.message}`);
    }
  }

  // Helper methods
  private parseSystemLogs(logText: string): SystemLog[] {
    const logs: SystemLog[] = [];
    const lines = logText.split('\n');
    
    // Parse each log line
    // Format typically: [timestamp] level: category - message
    const logRegex = /\[([^\]]+)\]\s*(\w+):\s*([^-]+)\s*-\s*(.+)/;
    
    lines.forEach(line => {
      const match = line.match(logRegex);
      if (match) {
        logs.push({
          timestamp: new Date(match[1]),
          level: this.parseLogLevel(match[2]),
          category: match[3].trim(),
          message: match[4].trim(),
        });
      } else if (line.trim()) {
        // Fallback for lines that don't match the expected format
        logs.push({
          timestamp: new Date(),
          level: 'Info',
          category: 'System',
          message: line.trim(),
        });
      }
    });
    
    // Look for specific patterns mentioned in the manual
    logs.forEach(log => {
      if (log.message.includes('FW.IPv6 FORWARD drop')) {
        log.level = 'Warning';
        log.category = 'Firewall';
      }
    });
    
    return logs;
  }

  private parsePingResult(data: string): PingResult {
    // Parse ping output
    // Example: "4 packets transmitted, 4 received, 0% packet loss, time 3003ms"
    // "rtt min/avg/max/mdev = 1.234/2.345/3.456/0.567 ms"
    
    const transmitted = parseInt(data.match(/(\d+) packets transmitted/)?.[1] || '0');
    const received = parseInt(data.match(/(\d+) received/)?.[1] || '0');
    const loss = parseInt(data.match(/(\d+)% packet loss/)?.[1] || '100');
    
    const rttMatch = data.match(/min\/avg\/max\/\w+ = ([\d.]+)\/([\d.]+)\/([\d.]+)/);
    const minTime = parseFloat(rttMatch?.[1] || '0');
    const avgTime = parseFloat(rttMatch?.[2] || '0');
    const maxTime = parseFloat(rttMatch?.[3] || '0');
    
    return {
      host: '',
      packetsTransmitted: transmitted,
      packetsReceived: received,
      packetLoss: loss,
      minTime,
      avgTime,
      maxTime,
      success: received > 0,
    };
  }

  private parseTracerouteResult(data: string): TracerouteResult {
    const hops: TracerouteHop[] = [];
    const lines = data.split('\n');
    
    // Parse traceroute output
    // Example: " 1  gateway (192.168.1.1)  1.234 ms  1.345 ms  1.456 ms"
    const hopRegex = /^\s*(\d+)\s+([^\s]+)\s+\(([^)]+)\)\s+([\d.]+\s*ms\s*)+/;
    
    lines.forEach(line => {
      const match = line.match(hopRegex);
      if (match) {
        const times = line.match(/[\d.]+\s*ms/g)?.map(t => parseFloat(t)) || [];
        hops.push({
          hop: parseInt(match[1]),
          host: match[2],
          ip: match[3],
          times,
        });
      }
    });
    
    return {
      destination: '',
      hops,
      complete: hops.length > 0 && hops[hops.length - 1].times.some(t => t > 0),
    };
  }

  private parseChannelTable(table: any, type: 'downstream' | 'upstream'): ChannelSignal[] {
    const channels: ChannelSignal[] = [];
    
    if (!table) return channels;
    
    const rows = table.querySelectorAll('tr:not(:first-child)'); // Skip header
    
    rows.forEach((row: any) => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 5) {
        channels.push({
          channel: parseInt(cells[0].text.trim()) || 0,
          frequency: parseFloat(cells[1].text.trim()) || 0,
          power: parseFloat(cells[2].text.trim()) || 0,
          snr: parseFloat(cells[3].text.trim()) || 0,
          modulation: cells[4].text.trim(),
          locked: cells[5]?.text.trim().toLowerCase() === 'locked' || true,
        });
      }
    });
    
    return channels;
  }

  private extractLedState(root: any, ledKey: string): LedState {
    // Try to find LED status indicator
    const element = root.querySelector(`[data-led="${ledKey}"]`);
    if (element) {
      const classes = element.getAttribute('class') || '';
      if (classes.includes('blink')) return 'Blinking';
      if (classes.includes('on')) return 'Solid';
      return 'Off';
    }
    
    // Default to solid for basic functionality
    return 'Solid';
  }

  private extractFieldValue(root: any, fieldName: string): string {
    const input = root.querySelector(`input[name="${fieldName}"]`);
    if (input) {
      return input.getAttribute('value') || '';
    }
    
    const element = root.querySelector(`#${fieldName}`);
    if (element) {
      return element.text || element.getAttribute('value') || '';
    }
    
    // Look for data attribute
    const dataElement = root.querySelector(`[data-field="${fieldName}"]`);
    if (dataElement) {
      return dataElement.text || dataElement.getAttribute('value') || '';
    }
    
    return '';
  }

  private parseLogLevel(level: string): LogLevel {
    const normalized = level.toUpperCase();
    if (normalized.includes('ERR')) return 'Error';
    if (normalized.includes('WARN')) return 'Warning';
    if (normalized.includes('DEBUG')) return 'Debug';
    return 'Info';
  }

  private parseBatteryHealth(health: string): 'Good' | 'Fair' | 'Poor' | 'Replace' {
    const normalized = health.toLowerCase();
    if (normalized.includes('good')) return 'Good';
    if (normalized.includes('fair')) return 'Fair';
    if (normalized.includes('poor')) return 'Poor';
    if (normalized.includes('replace')) return 'Replace';
    return 'Good';
  }
}

// Export singleton instance
export const diagnosticsService = new XfinityDiagnosticsService();
