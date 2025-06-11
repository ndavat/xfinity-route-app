export interface Device {
  mac: string;
  ip: string;
  hostname?: string;
  connectionType: 'WiFi' | 'Ethernet';
  customName?: string;
  isBlocked: boolean;
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