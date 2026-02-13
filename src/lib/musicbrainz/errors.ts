// src/lib/musicbrainz/errors.ts
/**
 * Custom error classes for MusicBrainz API failures
 * Provides specific error types for different failure scenarios
 */

// ============================================================================
// Legacy Error Classes (kept for backward compatibility)
// ============================================================================

export class MusicBrainzAPIError extends Error {
  public readonly statusCode?: number;
  public readonly endpoint?: string;
  public readonly retryable: boolean;

  constructor(
    message: string,
    statusCode?: number,
    endpoint?: string,
    retryable = false
  ) {
    super(message);
    this.name = 'MusicBrainzAPIError';
    this.statusCode = statusCode;
    this.endpoint = endpoint;
    this.retryable = retryable;

    // Maintain proper stack trace for where our error was thrown
    Error.captureStackTrace(this, MusicBrainzAPIError);
  }
}

export class MusicBrainzRateLimitError extends MusicBrainzAPIError {
  public readonly retryAfter?: number; // seconds to wait before retry

  constructor(message: string, retryAfter?: number, endpoint?: string) {
    super(message, 429, endpoint, true);
    this.name = 'MusicBrainzRateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class MusicBrainzNotFoundError extends MusicBrainzAPIError {
  constructor(message: string, endpoint?: string) {
    super(message, 404, endpoint, false);
    this.name = 'MusicBrainzNotFoundError';
  }
}

export class MusicBrainzServiceUnavailableError extends MusicBrainzAPIError {
  public readonly retryAfter?: number; // seconds to wait before retry

  constructor(message: string, retryAfter?: number, endpoint?: string) {
    super(message, 503, endpoint, true);
    this.name = 'MusicBrainzServiceUnavailableError';
    this.retryAfter = retryAfter;
  }
}

export class MusicBrainzTimeoutError extends MusicBrainzAPIError {
  constructor(message: string, endpoint?: string) {
    super(message, undefined, endpoint, true);
    this.name = 'MusicBrainzTimeoutError';
  }
}

export class MusicBrainzCircuitBreakerError extends MusicBrainzAPIError {
  constructor(message: string, endpoint?: string) {
    super(message, undefined, endpoint, false);
    this.name = 'MusicBrainzCircuitBreakerError';
  }
}

/**
 * Helper function to categorize errors from the musicbrainz-api library
 */
export function categorizeMusicBrainzError(
  error: unknown,
  endpoint?: string
): MusicBrainzAPIError {
  // Check if it's already one of our custom errors
  if (error instanceof MusicBrainzAPIError) {
    return error;
  }

  const errorObj = error as {
    message?: string;
    response?: { status: number; headers?: Record<string, string> };
    code?: string;
  };
  const message = errorObj.message || 'Unknown MusicBrainz API error';

  // Handle different error types based on status code or error type
  if (errorObj.response) {
    const statusCode = errorObj.response.status;
    const retryAfter = errorObj.response.headers?.['retry-after'];

    switch (statusCode) {
      case 429:
        return new MusicBrainzRateLimitError(
          `Rate limit exceeded: ${message}`,
          retryAfter ? parseInt(retryAfter, 10) : undefined,
          endpoint
        );

      case 503:
        return new MusicBrainzServiceUnavailableError(
          `Service unavailable: ${message}`,
          retryAfter ? parseInt(retryAfter, 10) : undefined,
          endpoint
        );

      case 404:
        return new MusicBrainzNotFoundError(
          `Resource not found: ${message}`,
          endpoint
        );

      default:
        return new MusicBrainzAPIError(
          `HTTP ${statusCode}: ${message}`,
          statusCode,
          endpoint,
          statusCode >= 500 // 5xx errors are generally retryable
        );
    }
  }

  // Handle timeout errors
  if (errorObj.code === 'ECONNABORTED' || message.includes('timeout')) {
    return new MusicBrainzTimeoutError(`Request timeout: ${message}`, endpoint);
  }

  // Handle network errors (generally retryable)
  if (errorObj.code === 'ENOTFOUND' || errorObj.code === 'ECONNREFUSED') {
    return new MusicBrainzAPIError(
      `Network error: ${message}`,
      undefined,
      endpoint,
      true
    );
  }

  // Default to non-retryable API error
  return new MusicBrainzAPIError(message, undefined, endpoint, false);
}

// ============================================================================
// New Structured Error Types (Plan 01-03)
// ============================================================================

/**
 * Error categories for MusicBrainz API failures
 * Used for UI interpretation and retry logic
 */
export type MusicBrainzErrorCode =
  | 'RATE_LIMITED' // 503 or 429 - too many requests
  | 'NOT_FOUND' // 404 - MBID doesn't exist
  | 'INVALID_MBID' // 400 - malformed MBID
  | 'NETWORK_ERROR' // Connection failed
  | 'TIMEOUT' // Request timed out
  | 'SERVICE_ERROR' // 5xx server error (not rate limit)
  | 'UNKNOWN'; // Unclassified error

/**
 * Structured MusicBrainz API error with categorization
 * Designed for admin correction workflow - provides clear error feedback
 * including why a search failed and when to retry
 */
export class MusicBrainzApiError extends Error {
  constructor(
    message: string,
    public readonly code: MusicBrainzErrorCode,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false,
    public readonly retryAfterMs?: number
  ) {
    super(message);
    this.name = 'MusicBrainzApiError';
  }

  /**
   * Create error from HTTP response status
   */
  static fromStatus(status: number, message?: string): MusicBrainzApiError {
    switch (status) {
      case 400:
        return new MusicBrainzApiError(
          message || 'Invalid request (possibly malformed MBID)',
          'INVALID_MBID',
          status,
          false
        );
      case 404:
        return new MusicBrainzApiError(
          message || 'Entity not found',
          'NOT_FOUND',
          status,
          false
        );
      case 429:
      case 503:
        return new MusicBrainzApiError(
          message || 'Rate limited - too many requests',
          'RATE_LIMITED',
          status,
          true,
          5000 // Suggest 5 second wait
        );
      case 500:
      case 502:
      case 504:
        return new MusicBrainzApiError(
          message || 'MusicBrainz service error',
          'SERVICE_ERROR',
          status,
          true,
          10000 // Suggest 10 second wait
        );
      default:
        return new MusicBrainzApiError(
          message || `HTTP error ${status}`,
          'UNKNOWN',
          status,
          status >= 500
        );
    }
  }

  /**
   * Create error from network/connection issues
   */
  static networkError(message: string): MusicBrainzApiError {
    return new MusicBrainzApiError(
      message,
      'NETWORK_ERROR',
      undefined,
      true,
      3000
    );
  }

  /**
   * Create error from request timeout
   */
  static timeout(message: string = 'Request timed out'): MusicBrainzApiError {
    return new MusicBrainzApiError(message, 'TIMEOUT', undefined, true, 5000);
  }

  /**
   * Convert from legacy MusicBrainzAPIError to new structured format
   */
  static fromLegacyError(error: MusicBrainzAPIError): MusicBrainzApiError {
    let code: MusicBrainzErrorCode = 'UNKNOWN';
    let retryAfterMs: number | undefined;

    if (error instanceof MusicBrainzRateLimitError) {
      code = 'RATE_LIMITED';
      retryAfterMs = error.retryAfter ? error.retryAfter * 1000 : 5000;
    } else if (error instanceof MusicBrainzNotFoundError) {
      code = 'NOT_FOUND';
    } else if (error instanceof MusicBrainzServiceUnavailableError) {
      code = 'RATE_LIMITED'; // 503 is often rate limiting
      retryAfterMs = error.retryAfter ? error.retryAfter * 1000 : 5000;
    } else if (error instanceof MusicBrainzTimeoutError) {
      code = 'TIMEOUT';
      retryAfterMs = 5000;
    } else if (error.statusCode) {
      if (error.statusCode === 400) code = 'INVALID_MBID';
      else if (error.statusCode >= 500) code = 'SERVICE_ERROR';
    }

    return new MusicBrainzApiError(
      error.message,
      code,
      error.statusCode,
      error.retryable,
      retryAfterMs
    );
  }
}

/**
 * Type guard to check if error is MusicBrainzApiError
 */
export function isMusicBrainzApiError(
  error: unknown
): error is MusicBrainzApiError {
  return error instanceof MusicBrainzApiError;
}

/**
 * Convert any error to structured MusicBrainzApiError
 * Useful in catch blocks to ensure consistent error format
 */
export function toMusicBrainzApiError(error: unknown): MusicBrainzApiError {
  // Already structured
  if (isMusicBrainzApiError(error)) {
    return error;
  }

  // Convert legacy error
  if (error instanceof MusicBrainzAPIError) {
    return MusicBrainzApiError.fromLegacyError(error);
  }

  // Handle Error instances
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('timeout') || message.includes('timed out')) {
      return MusicBrainzApiError.timeout(error.message);
    }
    if (
      message.includes('network') ||
      message.includes('econnrefused') ||
      message.includes('fetch failed') ||
      message.includes('enotfound')
    ) {
      return MusicBrainzApiError.networkError(error.message);
    }
    return new MusicBrainzApiError(error.message, 'UNKNOWN', undefined, false);
  }

  // Fallback for non-Error types
  return new MusicBrainzApiError(String(error), 'UNKNOWN', undefined, false);
}
