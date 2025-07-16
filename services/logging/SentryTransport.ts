import * as Sentry from '@sentry/react-native';
import { LogEntry, LogLevel } from './LoggerTypes';

export class SentryTransport {
  public static log(logEntry: LogEntry): void {
    const { level, message, metadata } = logEntry;

    if (level >= LogLevel.INFO) {
      Sentry.addBreadcrumb({
        level: this.toSentrySeverity(level),
        message,
        data: metadata,
      });
    }

    if (level >= LogLevel.ERROR) {
      const error = metadata?.error instanceof Error ? metadata.error : new Error(message);
      Sentry.captureException(error, {
        extra: metadata,
      });
    }
  }

  public static captureException(error: Error, metadata?: Record<string, any>): void {
    Sentry.captureException(error, {
      extra: metadata,
    });
  }

  public static setUser(user: Sentry.User | null): void {
    Sentry.setUser(user);
  }

  private static toSentrySeverity(level: LogLevel): Sentry.SeverityLevel {
    switch (level) {
      case LogLevel.DEBUG:
        return 'debug';
      case LogLevel.INFO:
        return 'info';
      case LogLevel.WARN:
        return 'warning';
      case LogLevel.ERROR:
        return 'error';
      case LogLevel.FATAL:
        return 'fatal';
      default:
        return 'log';
    }
  }
}