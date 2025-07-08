/**
 * File Manager for Logger
 * Handles file operations, rotation, cleanup, and storage management
 */

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { Platform } from 'react-native';
import { LogFileInfo, ExportOptions, LogFilter, LogEntry } from './LoggerTypes';
import { getAppInfo, getPlatformInfo } from '../../utils/appInfo';

export class LoggerFileManager {
  private currentLogFile: string | null = null;
  private logDirectory: string;
  private filePrefix: string;
  private maxFileSize: number;
  private maxFiles: number;

  constructor(
    logDirectory?: string,
    filePrefix: string = 'app_log',
    maxFileSize: number = 10 * 1024 * 1024,
    maxFiles: number = 5
  ) {
    this.filePrefix = filePrefix;
    this.maxFileSize = maxFileSize;
    this.maxFiles = maxFiles;
    this.logDirectory = logDirectory || this.getDefaultLogDirectory();
  }

  /**
   * Initialize the file manager and create log directory
   */
  public async initialize(): Promise<void> {
    try {
      // Ensure log directory exists
      const dirInfo = await FileSystem.getInfoAsync(this.logDirectory);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.logDirectory, { intermediates: true });
      }

      // Create new log file for this session
      await this.createNewLogFile();

      // Clean up old files if needed
      await this.cleanupOldFiles();
    } catch (error) {
      console.error('Failed to initialize logger file manager:', error);
      throw new Error(`Logger file manager initialization failed: ${error}`);
    }
  }

  /**
   * Get the default log directory based on platform
   */
  private getDefaultLogDirectory(): string {
    if (Platform.OS === 'ios') {
      // Use Documents directory for iOS
      return `${FileSystem.documentDirectory}logs/`;
    } else {
      // Use external directory for Android if available, otherwise use document directory
      return FileSystem.documentDirectory 
        ? `${FileSystem.documentDirectory}logs/`
        : `${FileSystem.cacheDirectory}logs/`;
    }
  }

  /**
   * Create a new log file with timestamp-based naming
   */
  public async createNewLogFile(): Promise<string> {
    const timestamp = new Date().toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .split('.')[0];
    
    const fileName = `${this.filePrefix}_${timestamp}.txt`;
    const filePath = `${this.logDirectory}${fileName}`;
    
    try {
      // Create the file with initial header
      const header = this.generateFileHeader();
      await FileSystem.writeAsStringAsync(filePath, header);
      
      this.currentLogFile = filePath;
      return filePath;
    } catch (error) {
      console.error('Failed to create new log file:', error);
      throw new Error(`Failed to create log file: ${error}`);
    }
  }

  /**
   * Generate file header with device and app information
   */
  private generateFileHeader(): string {
    const timestamp = new Date().toISOString();
    const appInfo = getAppInfo();
    const platformInfo = getPlatformInfo();
    
    const header = [
      '='.repeat(60),
      `LOG SESSION STARTED: ${timestamp}`,
      `App: ${appInfo.name} v${appInfo.version} (${appInfo.buildNumber})`,
      `Platform: ${platformInfo}`,
      `Device: ${appInfo.deviceName || 'Unknown'} (${appInfo.isDevice ? 'Physical' : 'Simulator'})`,
      `Bundle ID: ${appInfo.bundleId}`,
      '='.repeat(60),
      ''
    ].join('\n');

    return header;
  }

  /**
   * Write log entry to current file
   */
  public async writeLogEntry(entry: string): Promise<void> {
    if (!this.currentLogFile) {
      await this.createNewLogFile();
    }

    try {
      // Check if file needs rotation
      await this.checkFileRotation();

      // Append log entry
      await FileSystem.writeAsStringAsync(this.currentLogFile!, entry + '\n', {
        encoding: FileSystem.EncodingType.UTF8
      });
    } catch (error) {
      console.error('Failed to write log entry:', error);
      // Try to create a new file and retry once
      try {
        await this.createNewLogFile();
        await FileSystem.writeAsStringAsync(this.currentLogFile!, entry + '\n', {
          encoding: FileSystem.EncodingType.UTF8
        });
      } catch (retryError) {
        console.error('Failed to write log entry after retry:', retryError);
        throw new Error(`Failed to write log entry: ${retryError}`);
      }
    }
  }

  /**
   * Check if current file needs rotation
   */
  private async checkFileRotation(): Promise<void> {
    if (!this.currentLogFile) return;

    try {
      const fileInfo = await FileSystem.getInfoAsync(this.currentLogFile);
      if (fileInfo.exists && fileInfo.size && fileInfo.size >= this.maxFileSize) {
        await this.createNewLogFile();
      }
    } catch (error) {
      console.error('Error checking file rotation:', error);
    }
  }

  /**
   * Get list of all log files
   */
  public async getLogFiles(): Promise<LogFileInfo[]> {
    try {
      const files = await FileSystem.readDirectoryAsync(this.logDirectory);
      const logFiles: LogFileInfo[] = [];

      for (const fileName of files) {
        if (fileName.startsWith(this.filePrefix) && fileName.endsWith('.txt')) {
          const filePath = `${this.logDirectory}${fileName}`;
          const fileInfo = await FileSystem.getInfoAsync(filePath);
          
          if (fileInfo.exists) {
            logFiles.push({
              fileName,
              filePath,
              size: fileInfo.size || 0,
              createdAt: new Date(fileInfo.modificationTime || 0),
              modifiedAt: new Date(fileInfo.modificationTime || 0)
            });
          }
        }
      }

      // Sort by creation time (newest first)
      return logFiles.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Failed to get log files:', error);
      return [];
    }
  }

  /**
   * Clean up old log files based on maxFiles setting
   */
  public async cleanupOldFiles(): Promise<void> {
    try {
      const logFiles = await this.getLogFiles();
      
      if (logFiles.length > this.maxFiles) {
        const filesToDelete = logFiles.slice(this.maxFiles);
        
        for (const file of filesToDelete) {
          try {
            await FileSystem.deleteAsync(file.filePath);
            console.log(`Deleted old log file: ${file.fileName}`);
          } catch (deleteError) {
            console.error(`Failed to delete log file ${file.fileName}:`, deleteError);
          }
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old files:', error);
    }
  }

  /**
   * Get current log file path
   */
  public getCurrentLogFile(): string | null {
    return this.currentLogFile;
  }

  /**
   * Get current log file size
   */
  public async getCurrentLogFileSize(): Promise<number> {
    if (!this.currentLogFile) return 0;

    try {
      const fileInfo = await FileSystem.getInfoAsync(this.currentLogFile);
      return fileInfo.exists ? (fileInfo.size || 0) : 0;
    } catch (error) {
      console.error('Failed to get current log file size:', error);
      return 0;
    }
  }

  /**
   * Export logs with various options
   */
  public async exportLogs(options: ExportOptions = { 
    format: 'txt', 
    includeMetadata: true, 
    compress: false 
  }): Promise<string> {
    try {
      const logFiles = await this.getLogFiles();
      const exportFileName = `exported_logs_${Date.now()}.${options.format}`;
      const exportPath = `${this.logDirectory}${exportFileName}`;

      let exportContent = '';

      if (options.format === 'json') {
        exportContent = await this.exportAsJson(logFiles, options);
      } else if (options.format === 'csv') {
        exportContent = await this.exportAsCsv(logFiles, options);
      } else {
        exportContent = await this.exportAsText(logFiles, options);
      }

      await FileSystem.writeAsStringAsync(exportPath, exportContent);
      return exportPath;
    } catch (error) {
      console.error('Failed to export logs:', error);
      throw new Error(`Failed to export logs: ${error}`);
    }
  }

  /**
   * Share log file using platform sharing
   */
  public async shareLogFile(filePath?: string): Promise<void> {
    const pathToShare = filePath || this.currentLogFile;
    
    if (!pathToShare) {
      throw new Error('No log file to share');
    }

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(pathToShare, {
          mimeType: 'text/plain',
          dialogTitle: 'Share Log File'
        });
      } else {
        throw new Error('Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Failed to share log file:', error);
      throw new Error(`Failed to share log file: ${error}`);
    }
  }

  /**
   * Delete all log files
   */
  public async clearAllLogs(): Promise<void> {
    try {
      const logFiles = await this.getLogFiles();
      
      for (const file of logFiles) {
        await FileSystem.deleteAsync(file.filePath);
      }

      // Create new log file for current session
      await this.createNewLogFile();
    } catch (error) {
      console.error('Failed to clear all logs:', error);
      throw new Error(`Failed to clear logs: ${error}`);
    }
  }

  /**
   * Get total size of all log files
   */
  public async getTotalLogSize(): Promise<number> {
    try {
      const logFiles = await this.getLogFiles();
      return logFiles.reduce((total, file) => total + file.size, 0);
    } catch (error) {
      console.error('Failed to get total log size:', error);
      return 0;
    }
  }

  /**
   * Export logs as JSON format
   */
  private async exportAsJson(logFiles: LogFileInfo[], options: ExportOptions): Promise<string> {
    const exportData = {
      exportDate: new Date().toISOString(),
      totalFiles: logFiles.length,
      logs: [] as any[]
    };

    for (const file of logFiles) {
      try {
        const content = await FileSystem.readAsStringAsync(file.filePath);
        const lines = content.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            // Try to parse as JSON log entry, fallback to plain text
            const logEntry = this.parseLogLine(line);
            if (this.matchesFilter(logEntry, options.filter)) {
              exportData.logs.push(logEntry);
            }
          } catch {
            // If parsing fails, include as raw text
            exportData.logs.push({ raw: line, file: file.fileName });
          }
        }
      } catch (error) {
        console.error(`Failed to read file ${file.fileName}:`, error);
      }
    }

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Export logs as CSV format
   */
  private async exportAsCsv(logFiles: LogFileInfo[], options: ExportOptions): Promise<string> {
    const headers = ['Timestamp', 'Level', 'Source', 'Message', 'File'];
    let csvContent = headers.join(',') + '\n';

    for (const file of logFiles) {
      try {
        const content = await FileSystem.readAsStringAsync(file.filePath);
        const lines = content.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const logEntry = this.parseLogLine(line);
            if (this.matchesFilter(logEntry, options.filter)) {
              const csvLine = [
                `"${logEntry.timestamp}"`,
                `"${logEntry.level}"`,
                `"${logEntry.source}"`,
                `"${logEntry.message.replace(/"/g, '""')}"`,
                `"${file.fileName}"`
              ].join(',');
              csvContent += csvLine + '\n';
            }
          } catch {
            // Skip unparseable lines in CSV export
          }
        }
      } catch (error) {
        console.error(`Failed to read file ${file.fileName}:`, error);
      }
    }

    return csvContent;
  }

  /**
   * Export logs as plain text format
   */
  private async exportAsText(logFiles: LogFileInfo[], options: ExportOptions): Promise<string> {
    let textContent = `Log Export - ${new Date().toISOString()}\n`;
    textContent += '='.repeat(60) + '\n\n';

    for (const file of logFiles) {
      try {
        textContent += `File: ${file.fileName}\n`;
        textContent += `Size: ${file.size} bytes\n`;
        textContent += `Created: ${file.createdAt.toISOString()}\n`;
        textContent += '-'.repeat(40) + '\n';

        const content = await FileSystem.readAsStringAsync(file.filePath);
        if (options.filter) {
          const filteredContent = this.filterLogContent(content, options.filter);
          textContent += filteredContent;
        } else {
          textContent += content;
        }
        
        textContent += '\n\n';
      } catch (error) {
        console.error(`Failed to read file ${file.fileName}:`, error);
        textContent += `Error reading file: ${error}\n\n`;
      }
    }

    return textContent;
  }

  /**
   * Parse a log line into structured data
   */
  private parseLogLine(line: string): any {
    // Basic log line parsing - can be enhanced based on your log format
    const timestampMatch = line.match(/^\[([^\]]+)\]/);
    const levelMatch = line.match(/\[(DEBUG|INFO|WARN|ERROR|FATAL)\]/);
    const sourceMatch = line.match(/\[([^\]]+)\].*?-\s*(.+)$/);

    return {
      timestamp: timestampMatch ? timestampMatch[1] : '',
      level: levelMatch ? levelMatch[1] : 'INFO',
      source: sourceMatch ? sourceMatch[1] : 'Unknown',
      message: line,
      raw: line
    };
  }

  /**
   * Check if log entry matches filter criteria
   */
  private matchesFilter(logEntry: any, filter?: LogFilter): boolean {
    if (!filter) return true;

    if (filter.levels && !filter.levels.includes(logEntry.level)) {
      return false;
    }

    if (filter.sources && !filter.sources.some(source => 
      logEntry.source.toLowerCase().includes(source.toLowerCase())
    )) {
      return false;
    }

    if (filter.searchTerm && !logEntry.message.toLowerCase().includes(
      filter.searchTerm.toLowerCase()
    )) {
      return false;
    }

    return true;
  }

  /**
   * Filter log content based on criteria
   */
  private filterLogContent(content: string, filter: LogFilter): string {
    const lines = content.split('\n');
    const filteredLines = lines.filter(line => {
      try {
        const logEntry = this.parseLogLine(line);
        return this.matchesFilter(logEntry, filter);
      } catch {
        return true; // Include unparseable lines
      }
    });

    return filteredLines.join('\n');
  }

  /**
   * Format duration to human readable string
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
}
