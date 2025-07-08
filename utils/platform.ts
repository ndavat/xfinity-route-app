/**
 * Platform detection utility for React Native vs Node.js environments
 * This helps to conditionally import platform-specific modules
 */

/**
 * Check if the current platform is React Native
 * @returns true if running on React Native, false if Node.js
 */
export function isReactNative(): boolean {
  try {
    // React Native has a global navigator object with a specific product
    return typeof (globalThis as any).navigator !== 'undefined' && 
           (globalThis as any).navigator.product === 'ReactNative';
  } catch {
    return false;
  }
}

/**
 * Check if the current platform is Node.js
 * @returns true if running on Node.js, false if React Native
 */
export function isNode(): boolean {
  try {
    // Node.js has a global process object with specific properties
    return typeof process !== 'undefined' && 
           process.versions != null && 
           process.versions.node != null;
  } catch {
    return false;
  }
}

/**
 * Get the current platform name
 * @returns 'react-native' | 'node' | 'unknown'
 */
export function getPlatform(): 'react-native' | 'node' | 'unknown' {
  if (isReactNative()) return 'react-native';
  if (isNode()) return 'node';
  return 'unknown';
}

/**
 * Execute a function only on Node.js platforms
 * @param fn Function to execute on Node.js
 * @returns Result of function or undefined if not on Node.js
 */
export function onNode<T>(fn: () => T): T | undefined {
  return isNode() ? fn() : undefined;
}

/**
 * Execute a function only on React Native platforms
 * @param fn Function to execute on React Native
 * @returns Result of function or undefined if not on React Native
 */
export function onReactNative<T>(fn: () => T): T | undefined {
  return isReactNative() ? fn() : undefined;
}
