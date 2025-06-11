/**
 * Formats a MAC address to a standardized format (XX:XX:XX:XX:XX:XX)
 */
export function formatMacAddress(mac: string): string {
  // Remove any non-alphanumeric characters
  const cleanedMac = mac.replace(/[^a-fA-F0-9]/g, '');
  
  // Check if we have a valid MAC address (12 hex characters)
  if (cleanedMac.length !== 12) {
    return mac; // Return original if invalid
  }
  
  // Insert colons between each pair of characters
  const formattedMac = cleanedMac.match(/.{2}/g)?.join(':');
  return formattedMac ? formattedMac.toUpperCase() : mac;
}

/**
 * Converts minutes to a human-readable time format
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else if (minutes < 1440) { // Less than a day
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 
      ? `${hours} hour${hours !== 1 ? 's' : ''} ${mins} minute${mins !== 1 ? 's' : ''}`
      : `${hours} hour${hours !== 1 ? 's' : ''}`;
  } else {
    const days = Math.floor(minutes / 1440);
    const remainingMinutes = minutes % 1440;
    const hours = Math.floor(remainingMinutes / 60);
    
    if (hours > 0) {
      return `${days} day${days !== 1 ? 's' : ''} ${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
      return `${days} day${days !== 1 ? 's' : ''}`;
    }
  }
}

/**
 * Returns a date object representing the next occurrence of the specified time and day
 */
export function getNextScheduledTime(hour: number, minute: number, dayOfWeek: number): Date {
  const now = new Date();
  const result = new Date(now);
  
  result.setHours(hour, minute, 0, 0);
  
  // If day is today but time has passed, move to next week
  if (
    result.getDay() === now.getDay() &&
    (result.getHours() < now.getHours() || 
      (result.getHours() === now.getHours() && result.getMinutes() <= now.getMinutes())
    )
  ) {
    result.setDate(result.getDate() + 7);
  }
  
  // Move to the target day of the week
  const daysUntilTargetDay = (dayOfWeek + 7 - result.getDay()) % 7;
  result.setDate(result.getDate() + daysUntilTargetDay);
  
  return result;
}

/**
 * Debug helper for logging API responses
 */
export function debugLog(label: string, data: any): void {
  // This will only log if debug mode is enabled
  try {
    const isDebugMode = localStorage.getItem('debug_mode') === 'true';
    if (isDebugMode) {
      console.log(`📡 DEBUG [${label}]:`, data);
    }
  } catch (error) {
    // In case localStorage is not available (React Native)
  }
}

/**
 * Create a simple hash from a string (for device identification)
 */
export function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Gets a color based on a string (for device icons)
 */
export function stringToColor(str: string): string {
  const hash = simpleHash(str);
  const colors = [
    '#4285F4', // Blue
    '#EA4335', // Red
    '#FBBC05', // Yellow
    '#34A853', // Green
    '#FF6D01', // Orange
    '#46BDC6', // Teal
    '#7B1FA2', // Purple
    '#C2185B', // Pink
  ];
  
  return colors[hash % colors.length];
}

/**
 * Formats time string from Date object (HH:MM format)
 */
export function formatTimeString(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Determine if a string is a valid IPv4 address
 */
export function isValidIpv4(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  if (!ipv4Regex.test(ip)) {
    return false;
  }
  
  // Check that each part is between 0-255
  const parts = ip.split('.');
  for (const part of parts) {
    const num = parseInt(part, 10);
    if (num < 0 || num > 255) {
      return false;
    }
  }
  
  return true;
}

/**
 * Format bytes to readable size
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}