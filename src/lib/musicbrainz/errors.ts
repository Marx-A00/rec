// src/lib/musicbrainz/errors.ts
/**
 * Custom error classes for MusicBrainz API failures
 * Provides specific error types for different failure scenarios
 */

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
  error: any,
  endpoint?: string
): MusicBrainzAPIError {
  // Check if it's already one of our custom errors
  if (error instanceof MusicBrainzAPIError) {
    return error;
  }

  const message = error.message || 'Unknown MusicBrainz API error';

  // Handle different error types based on status code or error type
  if (error.response) {
    const statusCode = error.response.status;
    const retryAfter = error.response.headers?.['retry-after'];

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
  if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
    return new MusicBrainzTimeoutError(`Request timeout: ${message}`, endpoint);
  }

  // Handle network errors (generally retryable)
  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
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
