/**
 * Performance Monitor for Logger
 * Tracks logging performance, memory usage, and provides optimization recommendations
 */

import { LoggerStats, PerformanceMetrics } from './LoggerTypes';

export class LoggerPerformanceMonitor {
  private stats: LoggerStats;
  private startTime: Date;
  private logBuffer: any[] = [];
  private performanceHistory: PerformanceMetrics[] = [];
  private maxHistorySize = 100;

  constructor() {
    this.startTime = new Date();
    this.stats = {
      totalLogEntries: 0,
      currentFileSize: 0,
      filesCreated: 0,
      errorsLogged: 0,
      warningsLogged: 0,
      sessionStartTime: this.startTime,
      memoryUsage: 0
    };
  }

  /**
   * Initialize performance monitoring
   */
  public async initialize(): Promise<void> {
    // Start periodic performance collection
    this.startPerformanceCollection();
  }

  /**
   * Record a log entry for performance tracking
   */
  public recordLogEntry(level: string, size: number): void {
    this.stats.totalLogEntries++;
    
    if (level === 'ERROR' || level === 'FATAL') {
      this.stats.errorsLogged++;
    } else if (level === 'WARN') {
      this.stats.warningsLogged++;
    }

    // Track memory usage of log buffer
    this.logBuffer.push({ level, size, timestamp: Date.now() });
    
    // Clean old entries from buffer
    this.cleanLogBuffer();
    
    // Update memory usage estimate
    this.updateMemoryUsage();
  }

  /**
   * Record file creation
   */
  public recordFileCreation(fileSize: number): void {
    this.stats.filesCreated++;
    this.stats.currentFileSize = fileSize;
  }

  /**
   * Update current file size
   */
  public updateCurrentFileSize(size: number): void {
    this.stats.currentFileSize = size;
  }

  /**
   * Get current performance statistics
   */
  public getStats(): LoggerStats {
    return { ...this.stats };
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics(): PerformanceMetrics {
    const now = Date.now();
    const sessionDuration = now - this.startTime.getTime();
    
    return {
      memoryUsage: this.stats.memoryUsage,
      appStartTime: sessionDuration,
      renderTime: this.calculateAverageLogTime(),
      networkLatency: 0, // Can be implemented based on network logging
      cpuUsage: this.estimateCpuUsage(),
      diskUsage: this.stats.currentFileSize
    };
  }

  /**
   * Get performance history
   */
  public getPerformanceHistory(): PerformanceMetrics[] {
    return [...this.performanceHistory];
  }

  /**
   * Analyze performance and provide recommendations
   */
  public analyzePerformance(): {
    score: number; // 0-100
    issues: string[];
    recommendations: string[];
    metrics: PerformanceMetrics;
  } {
    const metrics = this.getPerformanceMetrics();
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Memory usage analysis
    if (metrics.memoryUsage > 50 * 1024 * 1024) { // 50MB
      issues.push('High memory usage detected');
      recommendations.push('Consider reducing buffer size or implementing more aggressive cleanup');
      score -= 20;
    }

    // Log rate analysis
    const logRate = this.calculateLogRate();
    if (logRate > 100) { // More than 100 logs per second
      issues.push('Very high logging rate detected');
      recommendations.push('Consider increasing log level threshold or implementing log sampling');
      score -= 15;
    }

    // File size analysis
    if (this.stats.currentFileSize > 50 * 1024 * 1024) { // 50MB
      issues.push('Large log file detected');
      recommendations.push('Reduce maximum file size or increase rotation frequency');
      score -= 10;
    }

    // Error rate analysis
    const errorRate = this.stats.errorsLogged / Math.max(this.stats.totalLogEntries, 1);
    if (errorRate > 0.1) { // More than 10% errors
      issues.push('High error rate in logs');
      recommendations.push('Investigate and fix underlying issues causing errors');
      score -= 15;
    }

    // Buffer size analysis
    if (this.logBuffer.length > 1000) {
      issues.push('Large log buffer detected');
      recommendations.push('Reduce buffer size or increase flush frequency');
      score -= 10;
    }

    return {
      score: Math.max(0, score),
      issues,
      recommendations,
      metrics
    };
  }

  /**
   * Start periodic performance collection
   */
  private startPerformanceCollection(): void {
    setInterval(() => {
      const metrics = this.getPerformanceMetrics();
      this.performanceHistory.push(metrics);
      
      // Keep only recent history
      if (this.performanceHistory.length > this.maxHistorySize) {
        this.performanceHistory.shift();
      }
    }, 30000); // Collect every 30 seconds
  }

  /**
   * Clean old entries from log buffer
   */
  private cleanLogBuffer(): void {
    const now = Date.now();
    const maxAge = 60000; // Keep entries for 1 minute
    
    this.logBuffer = this.logBuffer.filter(entry => 
      now - entry.timestamp < maxAge
    );
  }

  /**
   * Update memory usage estimate
   */
  private updateMemoryUsage(): void {
    // Estimate memory usage based on buffer size and entry sizes
    const bufferMemory = this.logBuffer.reduce((total, entry) => 
      total + (entry.size || 100), 0
    );
    
    // Add some overhead for object structure
    this.stats.memoryUsage = bufferMemory * 1.5;
  }

  /**
   * Calculate average log processing time
   */
  private calculateAverageLogTime(): number {
    if (this.logBuffer.length < 2) return 0;
    
    const recent = this.logBuffer.slice(-10); // Last 10 entries
    if (recent.length < 2) return 0;
    
    const times = recent.map(entry => entry.timestamp);
    const intervals = [];
    
    for (let i = 1; i < times.length; i++) {
      intervals.push(times[i] - times[i - 1]);
    }
    
    return intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  }

  /**
   * Calculate current log rate (logs per second)
   */
  private calculateLogRate(): number {
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    
    const recentLogs = this.logBuffer.filter(entry => 
      entry.timestamp > oneSecondAgo
    );
    
    return recentLogs.length;
  }

  /**
   * Estimate CPU usage based on logging activity
   */
  private estimateCpuUsage(): number {
    const logRate = this.calculateLogRate();
    const bufferSize = this.logBuffer.length;
    
    // Simple heuristic based on activity
    // This is an estimate - for accurate CPU usage, you'd need a native module
    let cpuEstimate = 0;
    
    if (logRate > 50) cpuEstimate += 20;
    else if (logRate > 20) cpuEstimate += 10;
    else if (logRate > 5) cpuEstimate += 5;
    
    if (bufferSize > 500) cpuEstimate += 15;
    else if (bufferSize > 200) cpuEstimate += 10;
    else if (bufferSize > 100) cpuEstimate += 5;
    
    return Math.min(cpuEstimate, 100);
  }

  /**
   * Check if performance is degraded
   */
  public isPerformanceDegraded(): boolean {
    const analysis = this.analyzePerformance();
    return analysis.score < 70;
  }

  /**
   * Get optimization suggestions
   */
  public getOptimizationSuggestions(): string[] {
    const analysis = this.analyzePerformance();
    const suggestions: string[] = [...analysis.recommendations];
    
    // Add general optimization suggestions
    if (this.stats.totalLogEntries > 10000) {
      suggestions.push('Consider implementing log sampling for high-frequency events');
    }
    
    if (this.stats.filesCreated > 20) {
      suggestions.push('Consider increasing file size limit to reduce file creation overhead');
    }
    
    const sessionTime = Date.now() - this.startTime.getTime();
    if (sessionTime > 24 * 60 * 60 * 1000) { // More than 24 hours
      suggestions.push('Long session detected - consider implementing session-based cleanup');
    }
    
    return suggestions;
  }

  /**
   * Reset performance statistics
   */
  public resetStats(): void {
    this.stats = {
      totalLogEntries: 0,
      currentFileSize: 0,
      filesCreated: 0,
      errorsLogged: 0,
      warningsLogged: 0,
      sessionStartTime: new Date(),
      memoryUsage: 0
    };
    
    this.logBuffer = [];
    this.performanceHistory = [];
    this.startTime = new Date();
  }

  /**
   * Export performance data
   */
  public exportPerformanceData(): {
    stats: LoggerStats;
    metrics: PerformanceMetrics;
    history: PerformanceMetrics[];
    analysis: {
      score: number;
      issues: string[];
      recommendations: string[];
      metrics: PerformanceMetrics;
    };
  } {
    return {
      stats: this.getStats(),
      metrics: this.getPerformanceMetrics(),
      history: this.getPerformanceHistory(),
      analysis: this.analyzePerformance()
    };
  }

  /**
   * Generate performance report
   */
  public generatePerformanceReport(): string {
    const analysis = this.analyzePerformance();
    const stats = this.getStats();
    
    const report = [
      'LOGGER PERFORMANCE REPORT',
      '=' .repeat(40),
      `Generated: ${new Date().toISOString()}`,
      `Session Duration: ${this.formatDuration(Date.now() - this.startTime.getTime())}`,
      '',
      'STATISTICS:',
      `-----------`,
      `Total Log Entries: ${stats.totalLogEntries.toLocaleString()}`,
      `Files Created: ${stats.filesCreated}`,
      `Current File Size: ${this.formatBytes(stats.currentFileSize)}`,
      `Errors Logged: ${stats.errorsLogged}`,
      `Warnings Logged: ${stats.warningsLogged}`,
      `Memory Usage: ${this.formatBytes(stats.memoryUsage)}`,
      '',
      'PERFORMANCE METRICS:',
      '-------------------',
      `Performance Score: ${analysis.score}/100`,
      `Log Rate: ${this.calculateLogRate().toFixed(2)} logs/second`,
      `Average Processing Time: ${analysis.metrics.renderTime?.toFixed(2) || 0}ms`,
      `Estimated CPU Usage: ${analysis.metrics.cpuUsage?.toFixed(1) || 0}%`,
      '',
      'ISSUES DETECTED:',
      '---------------',
      ...analysis.issues.map(issue => `• ${issue}`),
      '',
      'RECOMMENDATIONS:',
      '---------------',
      ...analysis.recommendations.map(rec => `• ${rec}`)
    ].join('\n');
    
    return report;
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
