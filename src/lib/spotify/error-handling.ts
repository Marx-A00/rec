// src/lib/spotify/error-handling.ts
/**
 * Error handling utilities for Spotify API integration
 * Handles rate limiting, network issues, and API failures with proper retry logic
 */

export interface SpotifyErrorInfo {
  type: 'rate_limit' | 'network' | 'auth' | 'api_error' | 'unknown';
  message: string;
  retryable: boolean;
  retryAfter?: number; // seconds to wait before retry
  statusCode?: number;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2
};

/**
 * Analyze Spotify API error and determine retry strategy
 */
export function analyzeSpotifyError(error: unknown): SpotifyErrorInfo {
  if (!(error instanceof Error)) {
    return {
      type: 'unknown',
      message: 'Unknown error occurred',
      retryable: false
    };
  }

  const message = error.message.toLowerCase();

  // Rate limiting (429)
  if (message.includes('429') || message.includes('rate limit')) {
    // Extract retry-after header if available
    const retryAfterMatch = message.match(/retry[- ]?after[:\s]*(\d+)/i);
    const retryAfter = retryAfterMatch ? parseInt(retryAfterMatch[1]) : 60;

    return {
      type: 'rate_limit',
      message: 'Spotify API rate limit exceeded',
      retryable: true,
      retryAfter: retryAfter,
      statusCode: 429
    };
  }

  // Authentication errors (401, 403)
  if (message.includes('401') || message.includes('403') || 
      message.includes('unauthorized') || message.includes('forbidden')) {
    return {
      type: 'auth',
      message: 'Spotify API authentication failed',
      retryable: false, // Don't retry auth errors
      statusCode: message.includes('401') ? 401 : 403
    };
  }

  // Network errors
  if (message.includes('econnreset') || message.includes('enotfound') || 
      message.includes('timeout') || message.includes('network')) {
    return {
      type: 'network',
      message: 'Network error connecting to Spotify API',
      retryable: true
    };
  }

  // Server errors (5xx)
  if (message.includes('500') || message.includes('502') || 
      message.includes('503') || message.includes('504')) {
    return {
      type: 'api_error',
      message: 'Spotify API server error',
      retryable: true,
      statusCode: 500
    };
  }

  // Client errors (4xx) - generally not retryable
  if (message.includes('400') || message.includes('404')) {
    return {
      type: 'api_error',
      message: 'Spotify API client error',
      retryable: false,
      statusCode: 400
    };
  }

  // Default to unknown error
  return {
    type: 'unknown',
    message: error.message || 'Unknown Spotify API error',
    retryable: true // Be optimistic for unknown errors
  };
}

/**
 * Calculate delay for exponential backoff with jitter
 */
export function calculateRetryDelay(
  attempt: number, 
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  retryAfter?: number
): number {
  // If we have a specific retry-after value, use it
  if (retryAfter) {
    return Math.min(retryAfter * 1000, config.maxDelay);
  }

  // Exponential backoff: baseDelay * (backoffMultiplier ^ attempt)
  const exponentialDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
  
  // Add jitter (±25% randomization) to prevent thundering herd
  const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
  const delayWithJitter = exponentialDelay + jitter;
  
  // Cap at maxDelay
  return Math.min(delayWithJitter, config.maxDelay);
}

/**
 * Retry wrapper for Spotify API calls with exponential backoff
 */
export async function withSpotifyRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      console.log(`🔄 ${operationName} (attempt ${attempt}/${config.maxAttempts})`);
      
      const result = await operation();
      
      if (attempt > 1) {
        console.log(`✅ ${operationName} succeeded after ${attempt} attempts`);
      }
      
      return result;
      
    } catch (error) {
      lastError = error;
      const errorInfo = analyzeSpotifyError(error);
      
      console.log(`❌ ${operationName} failed (attempt ${attempt}/${config.maxAttempts}):`, {
        type: errorInfo.type,
        message: errorInfo.message,
        retryable: errorInfo.retryable,
        statusCode: errorInfo.statusCode
      });

      // Don't retry if error is not retryable
      if (!errorInfo.retryable) {
        console.log(`🚫 ${operationName} - Error not retryable, giving up`);
        throw error;
      }

      // Don't retry if this was the last attempt
      if (attempt >= config.maxAttempts) {
        console.log(`🚫 ${operationName} - Max attempts reached, giving up`);
        break;
      }

      // Calculate delay and wait
      const delay = calculateRetryDelay(attempt, config, errorInfo.retryAfter);
      console.log(`⏳ ${operationName} - Waiting ${Math.round(delay)}ms before retry...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // All attempts failed
  throw lastError;
}

/**
 * Spotify API metrics tracking
 */
export interface SpotifyMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitHits: number;
  networkErrors: number;
  authErrors: number;
  averageResponseTime: number;
  lastSuccessfulSync: Date | null;
  lastFailedSync: Date | null;
}

class SpotifyMetricsTracker {
  private metrics: SpotifyMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    rateLimitHits: 0,
    networkErrors: 0,
    authErrors: 0,
    averageResponseTime: 0,
    lastSuccessfulSync: null,
    lastFailedSync: null
  };

  private responseTimes: number[] = [];

  recordRequest(success: boolean, responseTime: number, errorInfo?: SpotifyErrorInfo) {
    this.metrics.totalRequests++;
    this.responseTimes.push(responseTime);

    // Keep only last 100 response times for rolling average
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift();
    }

    // Update average response time
    this.metrics.averageResponseTime = 
      this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;

    if (success) {
      this.metrics.successfulRequests++;
      this.metrics.lastSuccessfulSync = new Date();
    } else {
      this.metrics.failedRequests++;
      this.metrics.lastFailedSync = new Date();

      if (errorInfo) {
        switch (errorInfo.type) {
          case 'rate_limit':
            this.metrics.rateLimitHits++;
            break;
          case 'network':
            this.metrics.networkErrors++;
            break;
          case 'auth':
            this.metrics.authErrors++;
            break;
        }
      }
    }
  }

  getMetrics(): SpotifyMetrics {
    return { ...this.metrics };
  }

  getSuccessRate(): number {
    if (this.metrics.totalRequests === 0) return 0;
    return (this.metrics.successfulRequests / this.metrics.totalRequests) * 100;
  }

  reset() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rateLimitHits: 0,
      networkErrors: 0,
      authErrors: 0,
      averageResponseTime: 0,
      lastSuccessfulSync: null,
      lastFailedSync: null
    };
    this.responseTimes = [];
  }
}

// Global metrics tracker instance
export const spotifyMetrics = new SpotifyMetricsTracker();

/**
 * Wrapper for Spotify operations that includes metrics tracking
 */
export async function withSpotifyMetrics<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const result = await operation();
    const responseTime = Date.now() - startTime;
    
    spotifyMetrics.recordRequest(true, responseTime);
    console.log(`📊 ${operationName} completed in ${responseTime}ms`);
    
    return result;
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorInfo = analyzeSpotifyError(error);
    
    spotifyMetrics.recordRequest(false, responseTime, errorInfo);
    console.log(`📊 ${operationName} failed after ${responseTime}ms:`, errorInfo.type);
    
    throw error;
  }
}
