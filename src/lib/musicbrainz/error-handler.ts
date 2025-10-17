// src/lib/musicbrainz/error-handler.ts
/**
 * Enhanced error handling and monitoring wrapper for MusicBrainz API operations
 * Provides logging, metrics, and graceful degradation capabilities
 */

import chalk from 'chalk';

import {
  MusicBrainzAPIError,
  MusicBrainzRateLimitError,
  MusicBrainzNotFoundError,
  MusicBrainzServiceUnavailableError,
  MusicBrainzTimeoutError,
  categorizeMusicBrainzError,
} from './errors';

// Enhanced logging interface
interface ApiMetrics {
  requests: number;
  successes: number;
  failures: number;
  rateLimits: number;
  timeouts: number;
  notFound: number;
  serviceUnavailable: number;
  lastFailure?: Date;
  consecutiveFailures: number;
}

class MusicBrainzErrorHandler {
  private metrics: ApiMetrics = {
    requests: 0,
    successes: 0,
    failures: 0,
    rateLimits: 0,
    timeouts: 0,
    notFound: 0,
    serviceUnavailable: 0,
    consecutiveFailures: 0,
  };

  private isServiceDegraded = false;
  private readonly maxConsecutiveFailures = 5;
  private readonly degradationTimeout = 5 * 60 * 1000; // 5 minutes

  /**
   * Wraps MusicBrainz API operations with enhanced error handling
   */
  async withErrorHandling<T>(
    operation: () => Promise<T>,
    operationName: string,
    context?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();
    this.metrics.requests++;

    try {
      // Check if service is degraded
      if (this.isServiceDegraded) {
        console.warn(
          `🚨 MusicBrainz service degraded - proceeding with ${operationName} cautiously`
        );
      }

      const result = await operation();

      // Success - reset consecutive failures and log success
      this.metrics.successes++;
      this.metrics.consecutiveFailures = 0;
      this.isServiceDegraded = false;

      const duration = Date.now() - startTime;
      const metrics = this.getBasicMetrics();

      const border = chalk.magenta('─'.repeat(60));
      console.log(border);
      console.log(
        `${chalk.green('✅')} ${chalk.magenta('[API LAYER]')} MusicBrainz ${chalk.white(operationName)} ${chalk.cyan(`in ${duration}ms`)} ${chalk.gray(`• Success: ${metrics.successRate}% • Failures: ${metrics.failures}`)}`
      );
      console.log(border);

      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const categorizedError = categorizeMusicBrainzError(error, operationName);

      // Update metrics
      this.metrics.failures++;
      this.metrics.consecutiveFailures++;
      this.metrics.lastFailure = new Date();

      // Update specific error type metrics
      if (categorizedError instanceof MusicBrainzRateLimitError) {
        this.metrics.rateLimits++;
      } else if (categorizedError instanceof MusicBrainzNotFoundError) {
        this.metrics.notFound++;
      } else if (
        categorizedError instanceof MusicBrainzServiceUnavailableError
      ) {
        this.metrics.serviceUnavailable++;
      } else if (categorizedError instanceof MusicBrainzTimeoutError) {
        this.metrics.timeouts++;
      }

      // Check if we should mark service as degraded
      if (this.metrics.consecutiveFailures >= this.maxConsecutiveFailures) {
        this.markServiceDegraded();
      }

      // Enhanced error logging
      this.logError(categorizedError, operationName, duration, context);

      // Apply error recovery strategies
      this.applyErrorRecoveryStrategy(categorizedError, operationName);

      throw categorizedError;
    }
  }

  /**
   * Logs detailed error information for monitoring and debugging
   */
  private logError(
    error: MusicBrainzAPIError,
    operationName: string,
    duration: number,
    context?: Record<string, any>
  ) {
    const errorInfo = {
      operation: operationName,
      errorType: error.name,
      statusCode: error.statusCode,
      retryable: error.retryable,
      duration: `${duration}ms`,
      context,
      metrics: this.getBasicMetrics(),
      message: error.message,
    };

    // Different log levels based on error severity
    if (error instanceof MusicBrainzNotFoundError) {
      // 404s are often expected, log as info
      console.info(`ℹ️ MusicBrainz resource not found:`, errorInfo);
    } else if (error instanceof MusicBrainzRateLimitError) {
      // Rate limits are important but handled by library
      console.warn(`⏱️ MusicBrainz rate limit hit:`, {
        ...errorInfo,
        retryAfter: error.retryAfter,
      });
    } else if (error instanceof MusicBrainzServiceUnavailableError) {
      // Service issues are concerning
      console.error(`🚨 MusicBrainz service unavailable:`, {
        ...errorInfo,
        retryAfter: error.retryAfter,
        consecutiveFailures: this.metrics.consecutiveFailures,
      });
    } else if (error instanceof MusicBrainzTimeoutError) {
      // Timeouts indicate network/performance issues
      console.warn(`⏰ MusicBrainz request timeout:`, errorInfo);
    } else {
      // Generic API errors
      console.error(`❌ MusicBrainz API error:`, errorInfo);
    }
  }

  /**
   * Apply error recovery strategies based on error type
   */
  private applyErrorRecoveryStrategy(
    error: MusicBrainzAPIError,
    operationName: string
  ) {
    if (error instanceof MusicBrainzRateLimitError) {
      console.log(
        `🔄 Rate limit recovery: Library will handle retry after ${error.retryAfter}s`
      );
    } else if (error instanceof MusicBrainzServiceUnavailableError) {
      console.log(
        `🔄 Service unavailable recovery: Library will retry with backoff`
      );
      if (this.metrics.consecutiveFailures >= this.maxConsecutiveFailures) {
        console.warn(
          `🚨 Consider switching to degraded mode or fallback data source`
        );
      }
    } else if (error instanceof MusicBrainzTimeoutError) {
      console.log(
        `🔄 Timeout recovery: Library will retry with timeout handling`
      );
    } else if (error instanceof MusicBrainzNotFoundError) {
      console.log(
        `🔍 Not found recovery: No retry needed, resource doesn't exist`
      );
    }
  }

  /**
   * Mark service as degraded and set recovery timer
   */
  private markServiceDegraded() {
    if (!this.isServiceDegraded) {
      this.isServiceDegraded = true;
      console.error(
        `🚨 MusicBrainz service marked as DEGRADED after ${this.metrics.consecutiveFailures} consecutive failures`
      );

      // Set timer to check for recovery
      setTimeout(() => {
        console.log(`🔄 Checking MusicBrainz service recovery...`);
        // Service will be marked as recovered on next successful request
      }, this.degradationTimeout);
    }
  }

  /**
   * Get basic metrics for logging
   */
  private getBasicMetrics() {
    const total = this.metrics.requests;
    return {
      total,
      successRate:
        total > 0 ? Math.round((this.metrics.successes / total) * 100) : 0,
      failures: this.metrics.failures,
      consecutive: this.metrics.consecutiveFailures,
      degraded: this.isServiceDegraded,
    };
  }

  /**
   * Get detailed metrics for monitoring dashboards
   */
  getMetrics(): ApiMetrics & {
    successRate: number;
    isServiceDegraded: boolean;
    uptime: number;
  } {
    const total = this.metrics.requests;
    const successRate = total > 0 ? (this.metrics.successes / total) * 100 : 0;

    return {
      ...this.metrics,
      successRate: Math.round(successRate * 100) / 100,
      isServiceDegraded: this.isServiceDegraded,
      uptime: total > 0 ? successRate : 100, // Uptime percentage
    };
  }

  /**
   * Reset metrics (useful for testing or periodic resets)
   */
  resetMetrics() {
    this.metrics = {
      requests: 0,
      successes: 0,
      failures: 0,
      rateLimits: 0,
      timeouts: 0,
      notFound: 0,
      serviceUnavailable: 0,
      consecutiveFailures: 0,
    };
    this.isServiceDegraded = false;
  }

  /**
   * Check if the service is healthy
   */
  isHealthy(): boolean {
    return (
      !this.isServiceDegraded &&
      this.metrics.consecutiveFailures < this.maxConsecutiveFailures
    );
  }

  /**
   * Get health status for health checks
   */
  getHealthStatus() {
    const metrics = this.getMetrics();
    return {
      healthy: this.isHealthy(),
      degraded: this.isServiceDegraded,
      metrics: {
        requests: metrics.requests,
        successRate: metrics.successRate,
        consecutiveFailures: metrics.consecutiveFailures,
        lastFailure: metrics.lastFailure,
      },
    };
  }
}

// Export singleton instance
export const musicbrainzErrorHandler = new MusicBrainzErrorHandler();
