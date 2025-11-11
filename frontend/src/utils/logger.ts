/**
 * Client-side logger wrapper
 * Respects NODE_ENV for log levels
 */

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private shouldLog(level: LogLevel): boolean {
    if (isProduction && level === 'debug') {
      return false;
    }
    return true;
  }

  debug(...args: unknown[]) {
    if (this.shouldLog('debug')) {
      console.log('[DEBUG]', ...args);
    }
  }

  
  
  info(...args: unknown[]) {
    if (this.shouldLog('info')) {
      console.info('[INFO]', ...args);
    }
  }

  warn(...args: unknown[]) {
    if (this.shouldLog('warn')) {
      console.warn('[WARN]', ...args);
    }
  }

  error(...args: unknown[]) {
    if (this.shouldLog('error')) {
      console.error('[ERROR]', ...args);
    }
  }

  group(label: string) {
    if (isDevelopment) {
      console.group(label);
    }
  }

  groupEnd() {
    if (isDevelopment) {
      console.groupEnd();
    }
  }
}

export const logger = new Logger();
export default logger;
