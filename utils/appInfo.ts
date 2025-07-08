/**
 * App Information Utility
 * Provides app version and build information for the logger
 */

import { Platform } from 'react-native';
import { Config } from './config';
import Constants from 'expo-constants';

export interface AppInfo {
  name: string;
  version: string;
  buildNumber: string;
  bundleId: string;
  platform: string;
  osVersion: string;
  deviceName?: string;
  isDevice: boolean;
  nativeAppVersion?: string;
  nativeBuildVersion?: string;
}

/**
 * Get comprehensive app information
 */
export function getAppInfo(): AppInfo {
  return {
    name: Config.app.name,
    version: Config.app.version,
    buildNumber: Constants.expoConfig?.version || Config.app.version,
    bundleId: Constants.expoConfig?.slug || 'xfinity-router-app',
    platform: Platform.OS,
    osVersion: Platform.Version.toString(),
    deviceName: Constants.deviceName,
    isDevice: Constants.isDevice,
    nativeAppVersion: Constants.nativeAppVersion,
    nativeBuildVersion: Constants.nativeBuildVersion
  };
}

/**
 * Get app version string for display
 */
export function getAppVersionString(): string {
  const info = getAppInfo();
  return `${info.version} (${info.buildNumber})`;
}

/**
 * Get platform information string
 */
export function getPlatformInfo(): string {
  const info = getAppInfo();
  return `${info.platform} ${info.osVersion}`;
}

/**
 * Check if running in development mode
 */
export function isDevelopmentMode(): boolean {
  return __DEV__ || Config.app.debugMode;
}

/**
 * Get environment information
 */
export function getEnvironmentInfo(): {
  isDevelopment: boolean;
  isDevice: boolean;
  platform: string;
  expoVersion: string;
} {
  return {
    isDevelopment: isDevelopmentMode(),
    isDevice: Constants.isDevice,
    platform: Platform.OS,
    expoVersion: Constants.expoVersion || 'unknown'
  };
}
