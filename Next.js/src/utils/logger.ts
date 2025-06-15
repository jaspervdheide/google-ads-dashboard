/**
 * Centralized Logging Utility
 * Eliminates duplicate console.log patterns across API routes
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

export interface LogContext {
  route?: string;
  customerId?: string;
  operation?: string;
  duration?: number;
  count?: number;
  [key: string]: any;
}

class Logger {
  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = this.formatTimestamp();
    const contextStr = context ? ` | ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level}] ${message}${contextStr}`;
  }

  /**
   * API Route startup logging
   */
  apiStart(route: string, params?: Record<string, any>): void {
    const context: LogContext = { route, ...params };
    console.log(this.formatMessage(LogLevel.INFO, `🚀 Starting ${route} API`, context));
  }

  /**
   * API Route completion logging
   */
  apiComplete(route: string, count: number, duration?: number): void {
    const context: LogContext = { route, count, duration };
    console.log(this.formatMessage(LogLevel.INFO, `✅ Completed ${route} API`, context));
  }

  /**
   * Query execution logging
   */
  queryStart(queryType: string, customerId?: string): void {
    const context: LogContext = { customerId, operation: queryType };
    console.log(this.formatMessage(LogLevel.INFO, `🔍 Executing ${queryType} query`, context));
  }

  queryComplete(queryType: string, resultCount: number, customerId?: string): void {
    const context: LogContext = { customerId, operation: queryType, count: resultCount };
    console.log(this.formatMessage(LogLevel.INFO, `📊 ${queryType} query returned ${resultCount} results`, context));
  }

  /**
   * Data processing logging
   */
  dataProcessing(operation: string, count: number, details?: any): void {
    const context: LogContext = { operation, count, ...details };
    console.log(this.formatMessage(LogLevel.INFO, `⚙️ Processing ${operation}`, context));
  }

  /**
   * Google Ads specific logging
   */
  googleAdsConnection(customerId: string, accountName?: string): void {
    const context: LogContext = { customerId, accountName };
    console.log(this.formatMessage(LogLevel.INFO, `🔗 Created Google Ads connection`, context));
  }

  googleAdsQuery(query: string, customerId?: string): void {
    const context: LogContext = { customerId, query: query.substring(0, 100) + '...' };
    console.log(this.formatMessage(LogLevel.DEBUG, `📝 Executing GAQL query`, context));
  }

  /**
   * Cache operations logging
   */
  cacheHit(key: string, route?: string): void {
    const context: LogContext = { route, cacheKey: key };
    console.log(this.formatMessage(LogLevel.DEBUG, `💾 Cache hit`, context));
  }

  cacheMiss(key: string, route?: string): void {
    const context: LogContext = { route, cacheKey: key };
    console.log(this.formatMessage(LogLevel.DEBUG, `🔄 Cache miss`, context));
  }

  /**
   * Performance logging
   */
  performance(operation: string, duration: number, context?: LogContext): void {
    const perfContext: LogContext = { operation, duration, ...context };
    const level = duration > 5000 ? LogLevel.WARN : LogLevel.INFO;
    console.log(this.formatMessage(level, `⏱️ Performance: ${operation} took ${duration}ms`, perfContext));
  }

  /**
   * Error logging (non-throwing)
   */
  error(message: string, error?: any, context?: LogContext): void {
    const errorContext: LogContext = { 
      ...context, 
      errorType: error?.constructor?.name,
      errorMessage: error?.message 
    };
    console.error(this.formatMessage(LogLevel.ERROR, `❌ ${message}`, errorContext));
    if (error?.stack) {
      console.error('Stack trace:', error.stack);
    }
  }

  /**
   * Warning logging
   */
  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage(LogLevel.WARN, `⚠️ ${message}`, context));
  }

  /**
   * Debug logging (only in development)
   */
  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(this.formatMessage(LogLevel.DEBUG, `🐛 ${message}`, context));
    }
  }

  /**
   * Sample data logging for debugging
   */
  sampleData(dataType: string, samples: any[], maxSamples: number = 5): void {
    if (samples.length > 0) {
      console.log(this.formatMessage(LogLevel.DEBUG, `📋 Sample ${dataType}:`));
      samples.slice(0, maxSamples).forEach((sample, index) => {
        console.log(`  ${index + 1}. ${JSON.stringify(sample, null, 2)}`);
      });
    }
  }

  /**
   * Metrics summary logging
   */
  metricsSummary(metrics: Record<string, number>, context?: LogContext): void {
    const metricsStr = Object.entries(metrics)
      .map(([key, value]) => `${key}: ${typeof value === 'number' ? value.toLocaleString() : value}`)
      .join(', ');
    console.log(this.formatMessage(LogLevel.INFO, `📈 Metrics: ${metricsStr}`, context));
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions for common patterns
export const logApiStart = (route: string, params?: Record<string, any>) => logger.apiStart(route, params);
export const logApiComplete = (route: string, count: number, duration?: number) => logger.apiComplete(route, count, duration);
export const logQueryStart = (queryType: string, customerId?: string) => logger.queryStart(queryType, customerId);
export const logQueryComplete = (queryType: string, resultCount: number, customerId?: string) => logger.queryComplete(queryType, resultCount, customerId);
export const logError = (message: string, error?: any, context?: LogContext) => logger.error(message, error, context);
export const logPerformance = (operation: string, duration: number, context?: LogContext) => logger.performance(operation, duration, context); 