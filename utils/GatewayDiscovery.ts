import AsyncStorage from '@react-native-async-storage/async-storage';
import { NetworkInfo } from 'react-native-network-info';

// Storage key for persisting the detected router IP
const ROUTER_DETECTED_IP_KEY = 'router_detected_ip';

// Common gateway IP addresses to try as fallbacks
const COMMON_GATEWAY_IPS = [
  '10.0.0.1',
  '192.168.1.1',
  '192.168.0.1',
  '192.168.1.254',
  '10.0.0.254',
  '192.168.2.1',
  '172.16.0.1'
];

/**
 * Gateway Discovery utility for detecting router IP addresses
 * Provides fallback mechanisms and persistence of successful IPs
 */
export class GatewayDiscovery {
  
  /**
   * Get the router IP address using multiple detection methods
   * 1. Attempts to get gateway IP from NetworkInfo
   * 2. Falls back to previously stored IP from AsyncStorage
   * 3. Falls back to common gateway IPs
   * 4. Persists successful IP to AsyncStorage
   * 
   * @returns Promise<string> The detected or fallback router IP address
   */
  static async getRouterIp(): Promise<string> {
    console.log('🔍 Starting gateway discovery...');
    
    // Method 1: Try to get gateway IP from NetworkInfo
    try {
      const gatewayIp = await NetworkInfo.getGatewayIPAddress();
      if (gatewayIp && this.isValidIpAddress(gatewayIp)) {
        console.log('✅ Gateway IP discovered via NetworkInfo:', gatewayIp);
        await this.persistRouterIp(gatewayIp);
        return gatewayIp;
      }
    } catch (error) {
      console.warn('⚠️ NetworkInfo.getGatewayIPAddress() failed:', error);
    }
    
    // Method 2: Try to get previously stored IP
    try {
      const storedIp = await AsyncStorage.getItem(ROUTER_DETECTED_IP_KEY);
      if (storedIp && this.isValidIpAddress(storedIp)) {
        console.log('✅ Using previously stored router IP:', storedIp);
        return storedIp;
      }
    } catch (error) {
      console.warn('⚠️ Failed to retrieve stored router IP:', error);
    }
    
    // Method 3: Try common gateway IPs
    console.log('🔄 Trying common gateway IPs...');
    for (const ip of COMMON_GATEWAY_IPS) {
      if (await this.testGatewayConnectivity(ip)) {
        console.log('✅ Found working gateway IP:', ip);
        await this.persistRouterIp(ip);
        return ip;
      }
    }
    
    // Method 4: Final fallback to most common IP
    const fallbackIp = COMMON_GATEWAY_IPS[0]; // '10.0.0.1'
    console.log('⚠️ No working gateway found, using fallback:', fallbackIp);
    return fallbackIp;
  }
  
  /**
   * Test if a gateway IP is reachable
   * Makes a simple HTTP request to test connectivity
   * 
   * @param ip The IP address to test
   * @returns Promise<boolean> True if the IP is reachable
   */
  private static async testGatewayConnectivity(ip: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      const response = await fetch(`http://${ip}`, {
        signal: controller.signal,
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Cache-Control': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      
      // If we get any response (even errors like 401, 403), it means the IP is reachable
      return response.status >= 200 && response.status < 600;
    } catch (error) {
      // Network errors, timeouts, etc. mean the IP is not reachable
      return false;
    }
  }
  
  /**
   * Persist the successful router IP to AsyncStorage
   * 
   * @param ip The IP address to store
   */
  private static async persistRouterIp(ip: string): Promise<void> {
    try {
      await AsyncStorage.setItem(ROUTER_DETECTED_IP_KEY, ip);
      console.log('💾 Router IP persisted to storage:', ip);
    } catch (error) {
      console.error('❌ Failed to persist router IP:', error);
    }
  }
  
  /**
   * Validate if a string is a valid IP address
   * 
   * @param ip The IP address string to validate
   * @returns boolean True if valid IP address
   */
  private static isValidIpAddress(ip: string): boolean {
    if (!ip || typeof ip !== 'string') return false;
    
    const ipPattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipPattern.test(ip);
  }
  
  /**
   * Clear the stored router IP from AsyncStorage
   * Useful for testing or when the stored IP is no longer valid
   */
  static async clearStoredRouterIp(): Promise<void> {
    try {
      await AsyncStorage.removeItem(ROUTER_DETECTED_IP_KEY);
      console.log('🗑️ Stored router IP cleared from storage');
    } catch (error) {
      console.error('❌ Failed to clear stored router IP:', error);
    }
  }
  
  /**
   * Get the currently stored router IP without attempting discovery
   * 
   * @returns Promise<string | null> The stored IP or null if none exists
   */
  static async getStoredRouterIp(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(ROUTER_DETECTED_IP_KEY);
    } catch (error) {
      console.error('❌ Failed to get stored router IP:', error);
      return null;
    }
  }
  
  /**
   * Force refresh of the gateway discovery process
   * Clears stored IP and runs discovery again
   * 
   * @returns Promise<string> The newly discovered router IP
   */
  static async refreshGatewayDiscovery(): Promise<string> {
    console.log('🔄 Refreshing gateway discovery...');
    await this.clearStoredRouterIp();
    return await this.getRouterIp();
  }
}

/**
 * Convenience function to get router IP
 * This is the main export that services should use
 */
export const getRouterIp = async (): Promise<string> => {
  return await GatewayDiscovery.getRouterIp();
};

export default GatewayDiscovery;
