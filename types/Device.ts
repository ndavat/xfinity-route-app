export interface Device {
  mac: string;
  ip: string;
  hostname: string;
  connectionType: 'WiFi' | 'Ethernet' | 'Unknown';
  customName?: string;
  isBlocked: boolean;
  isOnline: boolean;
  networkDetails: {
    band: '2.4GHz' | '5GHz' | 'Unknown';
    protocol: 'Wi-Fi 4' | 'Wi-Fi 5' | 'Wi-Fi 6' | 'Unknown';
    signalStrength?: number;
    speed?: string;
    lastSeen: string;
    ipv6?: string;
    localLinkIpv6?: string;
    dhcpType: 'DHCP' | 'Reserved';
    rssiLevel?: string;
  };
  comments?: string;
}

export interface BlockSchedule {
  mac: string;
  startTime: string; // Format: "HH:MM"
  endTime: string; // Format: "HH:MM"
  daysOfWeek: string[]; // Array of day names: "Monday", "Tuesday", etc.
  enabled: boolean;
}

export interface RouterConfig {
  ip: string;
  username: string;
  password: string;
  useHttps?: boolean;
}