// src/lib/lastfm/lastfm-base.ts
/**
 * Shared base module for all Last.fm API interactions.
 * Consolidates URL, API key, timeout, and error handling.
 */

const LASTFM_API_URL = 'https://ws.audioscrobbler.com/2.0/';
const TIMEOUT_MS = 5000;

// ============================================================================
// Error Types
// ============================================================================

export type LastfmErrorCode =
  | 'missing_api_key'
  | 'timeout'
  | 'network_error'
  | 'api_error'
  | 'invalid_response'
  | 'user_not_found'
  | 'private_profile'
  | 'rate_limited';

export interface LastfmError {
  code: LastfmErrorCode;
  message: string;
  httpStatus?: number;
}

export type LastfmResult<T> =
  | { success: true; data: T }
  | { success: false; error: LastfmError };

// ============================================================================
// Last.fm API Error Response Shape
// ============================================================================

interface LastfmApiErrorResponse {
  error: number;
  message: string;
}

/**
 * Map Last.fm API error codes to our typed error codes.
 * See: https://www.last.fm/api/errorcodes
 */
function mapApiErrorCode(errorCode: number): LastfmErrorCode {
  switch (errorCode) {
    case 6:
      return 'user_not_found'; // Invalid parameter (e.g., user not found)
    case 17:
      return 'private_profile'; // Login required / private profile
    case 29:
      return 'rate_limited'; // Rate limit exceeded
    default:
      return 'api_error';
  }
}

// ============================================================================
// Core Fetch Helper
// ============================================================================

function getApiKey(): string | null {
  return process.env.LASTFM_API_KEY || null;
}

/**
 * Generic Last.fm API fetch helper.
 * Handles API key, timeout, and typed error responses.
 *
 * @param method - Last.fm API method (e.g., 'user.getInfo', 'artist.search')
 * @param params - Additional query parameters (excluding method, api_key, format)
 * @returns Typed result with success/error status
 */
export async function lastfmFetch<T>(
  method: string,
  params: Record<string, string>
): Promise<LastfmResult<T>> {
  const apiKey = getApiKey();

  if (!apiKey) {
    return {
      success: false,
      error: {
        code: 'missing_api_key',
        message: 'LASTFM_API_KEY environment variable is not configured',
      },
    };
  }

  const queryParams = new URLSearchParams({
    method,
    api_key: apiKey,
    format: 'json',
    ...params,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${LASTFM_API_URL}?${queryParams}`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: {
          code: 'api_error',
          message: `Last.fm API returned ${response.status} ${response.statusText}`,
          httpStatus: response.status,
        },
      };
    }

    const data: T | LastfmApiErrorResponse = await response.json();

    // Last.fm returns 200 with error body for some errors
    if (
      data &&
      typeof data === 'object' &&
      'error' in data &&
      typeof (data as LastfmApiErrorResponse).error === 'number'
    ) {
      const apiError = data as LastfmApiErrorResponse;
      return {
        success: false,
        error: {
          code: mapApiErrorCode(apiError.error),
          message: apiError.message,
        },
      };
    }

    return { success: true, data: data as T };
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    if (err instanceof Error && err.name === 'AbortError') {
      return {
        success: false,
        error: {
          code: 'timeout',
          message: `Last.fm API request timed out after ${TIMEOUT_MS}ms`,
        },
      };
    }

    return {
      success: false,
      error: {
        code: 'network_error',
        message: err instanceof Error ? err.message : 'Unknown network error',
      },
    };
  }
}
