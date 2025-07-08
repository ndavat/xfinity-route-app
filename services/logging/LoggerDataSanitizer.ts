/**
 * Data Sanitizer for Logger
 * Handles sensitive data filtering and sanitization of log entries
 */

import { LoggerConfig } from './LoggerTypes';

export class LoggerDataSanitizer {
  private sensitivePatterns: RegExp[] = [];
  private customFilters: ((data: any) => any)[] = [];
  private redactionText: string = '[REDACTED]';

  constructor(private config: LoggerConfig) {
    this.initializeSensitivePatterns();
  }

  /**
   * Initialize built-in sensitive data patterns
   */
  private initializeSensitivePatterns(): void {
    const patterns = [
      // Credit card numbers
      /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
      
      // Social Security Numbers (US format)
      /\b\d{3}-\d{2}-\d{4}\b/g,
      
      // Email addresses (partial redaction)
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      
      // Phone numbers (various formats)
      /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
      
      // IP addresses (internal networks)
      /\b(?:192\.168|10\.|172\.(?:1[6-9]|2\d|3[01]))\.[0-9]{1,3}\.[0-9]{1,3}\b/g,
      
      // API keys and tokens (common patterns)
      /\b[A-Za-z0-9]{32,}\b/g,
      
      // JWT tokens
      /\beyJ[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]*\b/g,
      
      // UUIDs
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
      
      // Base64 encoded data (longer than 20 chars)
      /\b[A-Za-z0-9+/]{20,}={0,2}\b/g
    ];

    this.sensitivePatterns = patterns;
  }

  /**
   * Sanitize a log message
   */
  public sanitizeMessage(message: string): string {
    if (!message || typeof message !== 'string') {
      return message;
    }

    let sanitized = message;

    // Apply built-in patterns
    for (const pattern of this.sensitivePatterns) {
      sanitized = sanitized.replace(pattern, this.redactionText);
    }

    // Apply user-defined filters
    for (const filter of this.config.sensitiveDataFilters) {
      const filterRegex = new RegExp(filter, 'gi');
      sanitized = sanitized.replace(filterRegex, this.redactionText);
    }

    return sanitized;
  }

  /**
   * Sanitize an object (deep sanitization)
   */
  public sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.sanitizeMessage(obj);
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = this.sanitizeKey(key);
        
        if (this.shouldRedactProperty(key)) {
          sanitized[sanitizedKey] = this.redactionText;
        } else {
          sanitized[sanitizedKey] = this.sanitizeObject(value);
        }
      }
      
      return sanitized;
    }

    return obj;
  }

  /**
   * Sanitize object property keys
   */
  private sanitizeKey(key: string): string {
    // Don't sanitize keys themselves, just check if they should be redacted
    return key;
  }

  /**
   * Check if a property should be completely redacted based on its key
   */
  private shouldRedactProperty(key: string): boolean {
    const lowerKey = key.toLowerCase();
    
    const sensitiveKeys = [
      'password', 'pwd', 'pass', 'secret', 'token', 'auth', 'authorization',
      'key', 'apikey', 'api_key', 'private', 'credential', 'credentials',
      'session', 'cookie', 'csrf', 'oauth', 'bearer', 'signature',
      'ssn', 'social_security', 'credit_card', 'card_number', 'cvv', 'cvc',
      'pin', 'security_code', 'account_number', 'routing_number'
    ];

    return sensitiveKeys.some(sensitiveKey => lowerKey.includes(sensitiveKey));
  }

  /**
   * Sanitize HTTP request/response data
   */
  public sanitizeHttpData(data: {
    url?: string;
    headers?: Record<string, string>;
    body?: any;
    params?: Record<string, any>;
  }): any {
    const sanitized: any = {};

    // Sanitize URL (keep structure, redact sensitive query params)
    if (data.url) {
      sanitized.url = this.sanitizeUrl(data.url);
    }

    // Sanitize headers
    if (data.headers) {
      sanitized.headers = {};
      for (const [key, value] of Object.entries(data.headers)) {
        if (this.shouldRedactProperty(key)) {
          sanitized.headers[key] = this.redactionText;
        } else {
          sanitized.headers[key] = this.sanitizeMessage(value);
        }
      }
    }

    // Sanitize body
    if (data.body) {
      sanitized.body = this.sanitizeObject(data.body);
    }

    // Sanitize parameters
    if (data.params) {
      sanitized.params = this.sanitizeObject(data.params);
    }

    return sanitized;
  }

  /**
   * Sanitize URL while preserving structure
   */
  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      
      // Keep protocol, host, and path
      let sanitizedUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
      
      // Sanitize query parameters
      if (urlObj.search) {
        const params = new URLSearchParams(urlObj.search);
        const sanitizedParams = new URLSearchParams();
        
        for (const [key, value] of params.entries()) {
          if (this.shouldRedactProperty(key)) {
            sanitizedParams.set(key, this.redactionText);
          } else {
            sanitizedParams.set(key, this.sanitizeMessage(value));
          }
        }
        
        if (sanitizedParams.toString()) {
          sanitizedUrl += `?${sanitizedParams.toString()}`;
        }
      }
      
      return sanitizedUrl;
    } catch (error) {
      // If URL parsing fails, apply basic sanitization
      return this.sanitizeMessage(url);
    }
  }

  /**
   * Sanitize error objects
   */
  public sanitizeError(error: Error | any): any {
    if (!error) return error;

    const sanitized: any = {
      name: error.name || 'Error',
      message: this.sanitizeMessage(error.message || 'Unknown error')
    };

    // Include stack trace but sanitize it
    if (error.stack) {
      sanitized.stack = this.sanitizeMessage(error.stack);
    }

    // Include other error properties but sanitize them
    for (const [key, value] of Object.entries(error)) {
      if (key !== 'name' && key !== 'message' && key !== 'stack') {
        sanitized[key] = this.sanitizeObject(value);
      }
    }

    return sanitized;
  }

  /**
   * Add custom sanitization filter
   */
  public addCustomFilter(filter: (data: any) => any): void {
    this.customFilters.push(filter);
  }

  /**
   * Remove custom sanitization filter
   */
  public removeCustomFilter(filter: (data: any) => any): void {
    const index = this.customFilters.indexOf(filter);
    if (index > -1) {
      this.customFilters.splice(index, 1);
    }
  }

  /**
   * Apply custom filters to data
   */
  private applyCustomFilters(data: any): any {
    let result = data;
    for (const filter of this.customFilters) {
      try {
        result = filter(result);
      } catch (error) {
        console.warn('Custom sanitization filter failed:', error);
      }
    }
    return result;
  }

  /**
   * Set custom redaction text
   */
  public setRedactionText(text: string): void {
    this.redactionText = text;
  }

  /**
   * Get current redaction text
   */
  public getRedactionText(): string {
    return this.redactionText;
  }

  /**
   * Add sensitive pattern
   */
  public addSensitivePattern(pattern: RegExp): void {
    this.sensitivePatterns.push(pattern);
  }

  /**
   * Remove sensitive pattern
   */
  public removeSensitivePattern(pattern: RegExp): void {
    const index = this.sensitivePatterns.indexOf(pattern);
    if (index > -1) {
      this.sensitivePatterns.splice(index, 1);
    }
  }

  /**
   * Validate that sanitization is working correctly
   */
  public validateSanitization(): {
    isWorking: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    
    // Test basic patterns
    const testData = {
      creditCard: '4532-1234-5678-9012',
      ssn: '123-45-6789',
      email: 'test@example.com',
      password: 'secretpassword123',
      token: 'abc123def456ghi789'
    };

    const sanitized = this.sanitizeObject(testData);

    // Check if sensitive data was properly redacted
    if (sanitized.creditCard !== this.redactionText) {
      issues.push('Credit card number not properly redacted');
    }

    if (sanitized.ssn !== this.redactionText) {
      issues.push('SSN not properly redacted');
    }

    if (sanitized.password !== this.redactionText) {
      issues.push('Password not properly redacted');
    }

    return {
      isWorking: issues.length === 0,
      issues
    };
  }

  /**
   * Get sanitization statistics
   */
  public getSanitizationStats(): {
    totalPatterns: number;
    customFilters: number;
    sensitiveKeywords: number;
  } {
    return {
      totalPatterns: this.sensitivePatterns.length,
      customFilters: this.customFilters.length,
      sensitiveKeywords: this.config.sensitiveDataFilters.length
    };
  }
}
