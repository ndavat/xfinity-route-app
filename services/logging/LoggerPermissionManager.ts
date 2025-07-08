/**
 * Permission Manager for Logger
 * Handles storage permissions, media library access, and permission requests
 */

import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { Platform, Alert, Linking } from 'react-native';
import { LoggerPermissions } from './LoggerTypes';

export class LoggerPermissionManager {
  private permissions: LoggerPermissions = {
    storagePermission: false,
    mediaLibraryPermission: false
  };

  /**
   * Initialize and request all necessary permissions
   */
  public async initializePermissions(requestPermissions: boolean = true): Promise<LoggerPermissions> {
    if (requestPermissions) {
      await this.requestAllPermissions();
    } else {
      await this.checkExistingPermissions();
    }

    return this.getPermissions();
  }

  /**
   * Request all necessary permissions for logging
   */
  public async requestAllPermissions(): Promise<void> {
    try {
      // For iOS, we mainly need access to Documents directory (which is always available)
      // For Android, we need storage permissions for external storage access
      
      if (Platform.OS === 'android') {
        await this.requestStoragePermission();
      } else {
        // iOS: Documents directory is always accessible
        this.permissions.storagePermission = true;
      }

      // Request media library permission for enhanced file sharing capabilities
      await this.requestMediaLibraryPermission();

    } catch (error) {
      console.error('Failed to request permissions:', error);
      throw new Error(`Permission request failed: ${error}`);
    }
  }

  /**
   * Check existing permissions without requesting new ones
   */
  public async checkExistingPermissions(): Promise<void> {
    try {
      // Check storage permission
      this.permissions.storagePermission = await this.hasStoragePermission();

      // Check media library permission
      const mediaStatus = await MediaLibrary.getPermissionsAsync();
      this.permissions.mediaLibraryPermission = mediaStatus.granted;

    } catch (error) {
      console.error('Failed to check existing permissions:', error);
    }
  }

  /**
   * Request storage permission (mainly for Android)
   */
  private async requestStoragePermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        // For Android 11+ (API 30+), we use scoped storage
        // Check if we can write to the app's external files directory
        const hasPermission = await this.hasStoragePermission();
        
        if (!hasPermission) {
          // Show explanation dialog
          await this.showPermissionExplanationDialog(
            'Storage Permission Required',
            'This app needs storage permission to save log files for debugging purposes. ' +
            'Log files help us troubleshoot issues and improve the app experience.'
          );
        }

        this.permissions.storagePermission = await this.hasStoragePermission();
        return this.permissions.storagePermission;
      } else {
        // iOS: Documents directory is always accessible
        this.permissions.storagePermission = true;
        return true;
      }
    } catch (error) {
      console.error('Failed to request storage permission:', error);
      this.permissions.storagePermission = false;
      return false;
    }
  }

  /**
   * Request media library permission for enhanced sharing
   */
  private async requestMediaLibraryPermission(): Promise<boolean> {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      this.permissions.mediaLibraryPermission = status === 'granted';
      
      if (status === 'denied') {
        await this.showPermissionExplanationDialog(
          'Media Library Access',
          'Media library access allows for easier sharing and management of log files. ' +
          'This permission is optional but recommended for the best experience.'
        );
      }

      return this.permissions.mediaLibraryPermission;
    } catch (error) {
      console.error('Failed to request media library permission:', error);
      this.permissions.mediaLibraryPermission = false;
      return false;
    }
  }

  /**
   * Check if app has storage permission
   */
  private async hasStoragePermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        // iOS: Always have access to Documents directory
        return true;
      }

      // Android: Test write access to external files directory
      const testDir = FileSystem.documentDirectory;
      if (!testDir) return false;

      // Try to create a test file
      const testFile = `${testDir}permission_test.txt`;
      try {
        await FileSystem.writeAsStringAsync(testFile, 'test');
        await FileSystem.deleteAsync(testFile);
        return true;
      } catch {
        return false;
      }
    } catch (error) {
      console.error('Error checking storage permission:', error);
      return false;
    }
  }

  /**
   * Show permission explanation dialog
   */
  private async showPermissionExplanationDialog(title: string, message: string): Promise<void> {
    return new Promise((resolve) => {
      Alert.alert(
        title,
        message,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve()
          },
          {
            text: 'Open Settings',
            onPress: () => {
              Linking.openSettings();
              resolve();
            }
          },
          {
            text: 'OK',
            onPress: () => resolve()
          }
        ]
      );
    });
  }

  /**
   * Get current permissions status
   */
  public getPermissions(): LoggerPermissions {
    return { ...this.permissions };
  }

  /**
   * Check if storage permission is granted
   */
  public hasStorageAccess(): boolean {
    return this.permissions.storagePermission;
  }

  /**
   * Check if media library permission is granted
   */
  public hasMediaLibraryAccess(): boolean {
    return this.permissions.mediaLibraryPermission;
  }

  /**
   * Check if all required permissions are granted
   */
  public hasAllRequiredPermissions(): boolean {
    return this.permissions.storagePermission; // Media library is optional
  }

  /**
   * Request specific permission
   */
  public async requestPermission(type: 'storage' | 'mediaLibrary'): Promise<boolean> {
    switch (type) {
      case 'storage':
        return await this.requestStoragePermission();
      case 'mediaLibrary':
        return await this.requestMediaLibraryPermission();
      default:
        return false;
    }
  }

  /**
   * Show permission settings dialog
   */
  public showPermissionSettingsDialog(): void {
    Alert.alert(
      'Permissions Required',
      'Some features require additional permissions. Would you like to open app settings to grant them?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Open Settings',
          onPress: () => Linking.openSettings()
        }
      ]
    );
  }

  /**
   * Get recommended storage location based on permissions
   */
  public getRecommendedStorageLocation(): string {
    if (this.permissions.storagePermission) {
      if (Platform.OS === 'ios') {
        return `${FileSystem.documentDirectory}logs/`;
      } else {
        // Android: Use external files directory if available
        return FileSystem.documentDirectory 
          ? `${FileSystem.documentDirectory}logs/`
          : `${FileSystem.cacheDirectory}logs/`;
      }
    } else {
      // Fallback to cache directory
      return `${FileSystem.cacheDirectory}logs/`;
    }
  }

  /**
   * Check available storage space
   */
  public async getAvailableStorageSpace(): Promise<number> {
    try {
      if (Platform.OS === 'ios') {
        // iOS: Get available space from Documents directory
        const dirInfo = await FileSystem.getInfoAsync(FileSystem.documentDirectory!);
        // Note: FileSystem.getFreeDiskStorageAsync() might be available in newer versions
        return Number.MAX_SAFE_INTEGER; // Fallback for iOS
      } else {
        // Android: Try to get free space information
        // This is a basic implementation - you might want to use a native module for accurate results
        return Number.MAX_SAFE_INTEGER; // Fallback
      }
    } catch (error) {
      console.error('Failed to get available storage space:', error);
      return 0;
    }
  }

  /**
   * Validate storage requirements
   */
  public async validateStorageRequirements(requiredSpace: number): Promise<{
    hasSpace: boolean;
    availableSpace: number;
    message?: string;
  }> {
    try {
      const availableSpace = await this.getAvailableStorageSpace();
      const hasSpace = availableSpace >= requiredSpace;

      return {
        hasSpace,
        availableSpace,
        message: hasSpace 
          ? undefined 
          : `Insufficient storage space. Required: ${this.formatBytes(requiredSpace)}, Available: ${this.formatBytes(availableSpace)}`
      };
    } catch (error) {
      return {
        hasSpace: false,
        availableSpace: 0,
        message: `Failed to check storage space: ${error}`
      };
    }
  }

  /**
   * Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Reset permissions cache (force recheck)
   */
  public async refreshPermissions(): Promise<LoggerPermissions> {
    await this.checkExistingPermissions();
    return this.getPermissions();
  }

  /**
   * Get permission status summary
   */
  public getPermissionSummary(): {
    status: 'full' | 'partial' | 'none';
    details: string[];
    recommendations: string[];
  } {
    const details: string[] = [];
    const recommendations: string[] = [];

    if (this.permissions.storagePermission) {
      details.push('✓ Storage access granted');
    } else {
      details.push('✗ Storage access denied');
      recommendations.push('Grant storage permission for full logging functionality');
    }

    if (this.permissions.mediaLibraryPermission) {
      details.push('✓ Media library access granted');
    } else {
      details.push('✗ Media library access denied');
      recommendations.push('Grant media library permission for enhanced file sharing');
    }

    let status: 'full' | 'partial' | 'none';
    if (this.permissions.storagePermission && this.permissions.mediaLibraryPermission) {
      status = 'full';
    } else if (this.permissions.storagePermission) {
      status = 'partial';
    } else {
      status = 'none';
    }

    return { status, details, recommendations };
  }
}
