// src/lib/queue/processors/utils.ts
/**
 * Shared utility functions for job processors
 */

import { calculateStringSimilarity as fuzzyMatch } from '../../utils/string-similarity';
import {
  MusicBrainzApiError,
  isMusicBrainzApiError,
  toMusicBrainzApiError,
  type MusicBrainzErrorCode,
} from '../../musicbrainz/errors';

// Re-export for use in processors
export const calculateStringSimilarity = fuzzyMatch;
// Re-export structured error utilities for processors
export {
  MusicBrainzApiError,
  isMusicBrainzApiError,
  toMusicBrainzApiError,
  type MusicBrainzErrorCode,
};

/**
 * Structured error result for job processing
 * Provides consistent error format for UI interpretation
 */
export interface StructuredJobError {
  message: string;
  code: MusicBrainzErrorCode;
  retryable: boolean;
  retryAfterMs?: number;
}

/**
 * Convert any error to a structured job error
 * This ensures all job results have consistent error structure
 * that the UI can interpret for admin correction workflow
 */
export function toStructuredJobError(error: unknown): StructuredJobError {
  // Convert to MusicBrainzApiError to get structured properties
  const apiError = toMusicBrainzApiError(error);

  return {
    message: apiError.message,
    code: apiError.code,
    retryable: apiError.retryable,
    retryAfterMs: apiError.retryAfterMs,
  };
}

// ============================================================================
// Album Matching Utilities
// ============================================================================

export function buildAlbumSearchQuery(album: any): string {
  // Use releasegroup field for release group searches
  let query = `releasegroup:"${album.title}"`;

  if (album.artists && album.artists.length > 0) {
    // Add primary artist to search
    const primaryArtist =
      album.artists.find((a: any) => a.role === 'primary') || album.artists[0];
    if (primaryArtist?.artist?.name) {
      query += ` AND artist:"${primaryArtist.artist.name}"`;
    }
  }

  // Add type filter based on the actual release type
  const releaseType = album.releaseType?.toLowerCase() || 'album';
  query += ` AND type:${releaseType}`;

  // Add status filter to only include official releases
  query += ` AND status:official`;

  return query;
}

export function findBestAlbumMatch(
  album: any,
  searchResults: any[]
): {
  result: any;
  score: number;
  mbScore: number;
  jaccardScore: number;
} | null {
  let bestMatch = null;
  let bestScore = 0;

  for (const result of searchResults) {
    // Get MusicBrainz's confidence score (0-100)
    const mbScore = result.score || 0;

    // Calculate our Jaccard similarity score (0-1)
    let jaccardScore = 0;

    // Title similarity (most important)
    if (result.title && album.title) {
      jaccardScore +=
        calculateStringSimilarity(
          result.title.toLowerCase(),
          album.title.toLowerCase()
        ) * 0.6;
    }

    // Artist similarity
    if (result.artistCredit && album.artists && album.artists.length > 0) {
      const resultArtists = result.artistCredit.map(
        (ac: any) => ac.name?.toLowerCase() || ''
      );
      const albumArtists = album.artists.map(
        (a: any) => a.artist?.name?.toLowerCase() || ''
      );

      let artistScore = 0;
      for (const albumArtist of albumArtists) {
        for (const resultArtist of resultArtists) {
          artistScore = Math.max(
            artistScore,
            calculateStringSimilarity(albumArtist, resultArtist)
          );
        }
      }
      jaccardScore += artistScore * 0.4;
    }

    // Hybrid scoring: Combine MusicBrainz score with our Jaccard similarity
    // MB score (0-100) normalized to 0-1, weighted 70%
    // Jaccard score (0-1) weighted 30%
    const combinedScore = (mbScore / 100) * 0.7 + jaccardScore * 0.3;

    if (combinedScore > bestScore) {
      bestScore = combinedScore;
      bestMatch = {
        result,
        score: combinedScore,
        mbScore: mbScore,
        jaccardScore: jaccardScore,
      };
    }
  }

  return bestMatch;
}

// ============================================================================
// Artist Matching Utilities
// ============================================================================

export function findBestArtistMatch(
  artist: any,
  searchResults: any[]
): {
  result: any;
  score: number;
  mbScore: number;
  jaccardScore: number;
} | null {
  let bestMatch = null;
  let bestScore = 0;

  for (const result of searchResults) {
    // Get MusicBrainz's confidence score (0-100)
    const mbScore = result.score || 0;

    // Calculate our Jaccard similarity score (0-1)
    let jaccardScore = 0;

    // Name similarity
    if (result.name && artist.name) {
      jaccardScore = calculateStringSimilarity(
        result.name.toLowerCase(),
        artist.name.toLowerCase()
      );
    }

    // Hybrid scoring: Combine MusicBrainz score with our Jaccard similarity
    // MB score (0-100) normalized to 0-1, weighted 70%
    // Jaccard score (0-1) weighted 30%
    const combinedScore = (mbScore / 100) * 0.7 + jaccardScore * 0.3;

    if (combinedScore > bestScore) {
      bestScore = combinedScore;
      bestMatch = {
        result,
        score: combinedScore,
        mbScore: mbScore,
        jaccardScore: jaccardScore,
      };
    }
  }

  return bestMatch;
}

// ============================================================================
// Track Matching Utilities
// ============================================================================

export function findBestTrackMatch(track: any, recordings: any[]): any | null {
  let bestMatch = null;
  let bestScore = 0;

  for (const recording of recordings) {
    let score = recording.score || 0;

    // Boost score for duration match (within 5 seconds)
    if (track.durationMs && recording.length) {
      const trackDurationSec = Math.round(track.durationMs / 1000);
      const recordingDurationSec = Math.round(recording.length / 1000);
      const durationDiff = Math.abs(trackDurationSec - recordingDurationSec);

      if (durationDiff <= 5) {
        score += 10; // Boost for close duration match
      }
    }

    // Boost score for exact title match
    if (recording.title && track.title) {
      const titleSimilarity = calculateStringSimilarity(
        track.title.toLowerCase(),
        recording.title.toLowerCase()
      );
      score += titleSimilarity * 10;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = recording;
    }
  }

  // Only return matches with reasonable confidence
  return bestScore >= 70 ? bestMatch : null;
}

export function normalizeTrackTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s*\(feat\.?\s+[^)]+\)/gi, '') // Remove (feat. Artist)
    .replace(/\s*\(featuring\s+[^)]+\)/gi, '') // Remove (featuring Artist)
    .replace(/\s*feat\.?\s+[^,]+/gi, '') // Remove feat. Artist
    .replace(/\s*featuring\s+[^,]+/gi, '') // Remove featuring Artist
    .replace(/\s*with\s+[^,]+/gi, '') // Remove with Artist
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

export function findMatchingTrack(
  existingTracks: any[],
  mbTrackData: any
): any | null {
  // First try exact position match (most reliable)
  const match = existingTracks.find(
    track =>
      track.trackNumber === mbTrackData.trackNumber &&
      track.discNumber === mbTrackData.discNumber
  );

  if (match) {
    console.log(
      `🎯 Position match: Track ${match.trackNumber} "${match.title}" → "${mbTrackData.title}"`
    );
    return match;
  }

  // Fallback to normalized title similarity
  const normalizedMBTitle = normalizeTrackTitle(mbTrackData.title);
  let bestMatch = null;
  let bestScore = 0;

  for (const track of existingTracks) {
    const normalizedSpotifyTitle = normalizeTrackTitle(track.title);

    // Try exact normalized match first
    if (normalizedSpotifyTitle === normalizedMBTitle) {
      console.log(
        `🎯 Exact normalized match: "${track.title}" → "${mbTrackData.title}"`
      );
      return track;
    }

    // Calculate similarity with normalized titles
    const titleSimilarity = calculateStringSimilarity(
      normalizedSpotifyTitle,
      normalizedMBTitle
    );

    // Boost score for duration match (within 5 seconds)
    let score = titleSimilarity;
    if (track.durationMs && mbTrackData.durationMs) {
      const durationDiff =
        Math.abs(track.durationMs - mbTrackData.durationMs) / 1000;
      if (durationDiff <= 5) {
        score += 0.2; // Boost for close duration match
      }
    }

    if (score > bestScore && score > 0.7) {
      bestScore = score;
      bestMatch = track;
    }
  }

  return bestMatch;
}

// ============================================================================
// Discogs Matching Utilities
// ============================================================================

export function findBestDiscogsArtistMatch(
  searchName: string,
  results: any[]
): { result: any; score: number } | null {
  let bestMatch = null;
  let bestScore = 0;

  for (const result of results) {
    // Extract artist name from result title
    // Discogs format: "Artist Name" or "Artist Name (2)" for disambiguation
    const resultName = result.title.replace(/\s*\(\d+\)$/, '').trim();

    // Calculate similarity score
    const similarity = calculateStringSimilarity(
      searchName.toLowerCase(),
      resultName.toLowerCase()
    );

    // Require high confidence (85%+) for Discogs matches
    if (similarity > bestScore && similarity >= 0.85) {
      bestScore = similarity;
      bestMatch = { result, score: similarity };
    }
  }

  return bestMatch;
}

// ============================================================================
// Error Handling Utilities
// ============================================================================

export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();

  // Network errors - retryable
  if (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('econnreset') ||
    message.includes('enotfound')
  ) {
    return true;
  }

  // MusicBrainz specific errors
  if (message.includes('503') || message.includes('service unavailable')) {
    return true; // Service temporarily unavailable
  }

  if (message.includes('429') || message.includes('rate limit')) {
    return true; // Rate limited - will be retried with backoff
  }

  if (message.includes('500') || message.includes('internal server error')) {
    return true; // Server error - might be temporary
  }

  // Non-retryable errors
  if (message.includes('404') || message.includes('not found')) {
    return false; // Entity doesn't exist
  }

  if (message.includes('400') || message.includes('bad request')) {
    return false; // Invalid request data
  }

  // Default to retryable for unknown errors
  return true;
}

export function getErrorCode(error: unknown): string | undefined {
  if (!(error instanceof Error)) return undefined;

  const message = error.message;

  // HTTP status codes
  if (message.includes('404')) return 'NOT_FOUND';
  if (message.includes('429')) return 'RATE_LIMITED';
  if (message.includes('500')) return 'SERVER_ERROR';
  if (message.includes('503')) return 'SERVICE_UNAVAILABLE';
  if (message.includes('timeout')) return 'TIMEOUT';

  // Network errors
  if (message.includes('ECONNRESET')) return 'CONNECTION_RESET';
  if (message.includes('ENOTFOUND')) return 'DNS_ERROR';

  return 'UNKNOWN_ERROR';
}
