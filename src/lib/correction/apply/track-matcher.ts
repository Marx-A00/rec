/**
 * Track matching algorithm for correction application.
 * Pairs database tracks with MusicBrainz tracks using position-first,
 * similarity-fallback strategy.
 *
 * @example
 * ```typescript
 * const matches = matchTracks(dbTracks, mbTracks);
 * // Result:
 * // [
 * //   { dbTrack: Track, mbTrack: MBRecording, matchType: 'POSITION', confidence: 1.0 },
 * //   { dbTrack: Track, mbTrack: MBRecording, matchType: 'TITLE_SIMILARITY', confidence: 0.85 },
 * //   { dbTrack: null, mbTrack: MBRecording, matchType: 'NEW', confidence: 1.0 },
 * //   { dbTrack: Track, mbTrack: null, matchType: 'ORPHANED', confidence: 1.0 },
 * // ]
 * ```
 */

import type { Track } from '@prisma/client';
import { distance } from 'fastest-levenshtein';

import type { MBRecording } from '../preview/types';

// ============================================================================
// Types
// ============================================================================

/**
 * Classification of how a track match was determined.
 * - POSITION: Exact disc + track number match
 * - TITLE_SIMILARITY: Matched by similar title (no position match)
 * - NEW: MusicBrainz track with no corresponding DB track (to be added)
 * - ORPHANED: DB track with no corresponding MB track (to be removed)
 */
export type TrackMatchType = 'POSITION' | 'TITLE_SIMILARITY' | 'NEW' | 'ORPHANED';

/**
 * Result of matching a database track with a MusicBrainz track.
 */
export interface TrackMatch {
  /** Database track (null for NEW tracks) */
  dbTrack: Track | null;
  /** MusicBrainz track (null for ORPHANED tracks) */
  mbTrack: MBRecording | null;
  /** How the match was determined */
  matchType: TrackMatchType;
  /** Match confidence (0-1). Position matches have 1.0, similarity varies */
  confidence: number;
  /** Disc number for sorting */
  discNumber: number;
  /** Track position for sorting */
  position: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Minimum similarity threshold for title matching.
 * Titles with similarity below this are not considered matches.
 * Exportable for testing/tuning.
 */
export const SIMILARITY_THRESHOLD = 0.8;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Normalizes a title for comparison.
 * - Converts to lowercase
 * - Trims whitespace
 * - Normalizes unicode (NFD)
 */
function normalizeTitle(title: string): string {
  return title.toLowerCase().trim().normalize('NFD');
}

/**
 * Calculates similarity between two titles using Levenshtein distance.
 * Returns a value between 0 (completely different) and 1 (identical).
 *
 * @param title1 - First title to compare
 * @param title2 - Second title to compare
 * @returns Similarity score between 0 and 1
 */
export function calculateTitleSimilarity(title1: string, title2: string): number {
  const normalized1 = normalizeTitle(title1);
  const normalized2 = normalizeTitle(title2);

  // Identical strings have perfect similarity
  if (normalized1 === normalized2) {
    return 1.0;
  }

  const maxLength = Math.max(normalized1.length, normalized2.length);

  // Edge case: both empty strings
  if (maxLength === 0) {
    return 1.0;
  }

  const levenshteinDistance = distance(normalized1, normalized2);

  // Similarity = 1 - (distance / maxLength)
  return 1 - levenshteinDistance / maxLength;
}

/**
 * Creates a position key for track lookup.
 * Format: "discNumber-trackNumber"
 */
function positionKey(discNumber: number, trackNumber: number): string {
  return `${discNumber}-${trackNumber}`;
}

// ============================================================================
// Main Matching Function
// ============================================================================

/**
 * Matches database tracks with MusicBrainz tracks using a multi-pass strategy.
 *
 * Algorithm:
 * 1. First pass: Match by exact position (disc + track number)
 * 2. Second pass: Match remaining by title similarity (threshold 0.8)
 * 3. Third pass: Mark remaining MB tracks as NEW (no dbTrack)
 * 4. Fourth pass: Mark remaining DB tracks as ORPHANED (no mbTrack)
 *
 * @param dbTracks - Array of database tracks
 * @param mbTracks - Array of MusicBrainz recordings
 * @returns Array of TrackMatch objects sorted by disc and position
 */
export function matchTracks(
  dbTracks: Track[],
  mbTracks: MBRecording[]
): TrackMatch[] {
  const matches: TrackMatch[] = [];

  // Track which items have been matched
  const matchedDbTrackIds = new Set<string>();
  const matchedMbTrackPositions = new Set<string>();

  // Create position-based lookup maps
  const dbByPosition = new Map<string, Track>();
  for (const track of dbTracks) {
    const key = positionKey(track.discNumber, track.trackNumber);
    dbByPosition.set(key, track);
  }

  const mbByPosition = new Map<string, MBRecording>();
  for (const mbTrack of mbTracks) {
    // MBRecording uses discNumber from the medium context (passed during preview generation)
    // Default to disc 1 if not provided
    const discNumber = (mbTrack as MBRecording & { discNumber?: number }).discNumber ?? 1;
    const key = positionKey(discNumber, mbTrack.position);
    mbByPosition.set(key, mbTrack);
  }

  // ============================================================
  // Pass 1: Position-based matching (exact disc + track number)
  // ============================================================
  for (const mbTrack of mbTracks) {
    const discNumber = (mbTrack as MBRecording & { discNumber?: number }).discNumber ?? 1;
    const key = positionKey(discNumber, mbTrack.position);
    const dbTrack = dbByPosition.get(key);

    if (dbTrack) {
      matches.push({
        dbTrack,
        mbTrack,
        matchType: 'POSITION',
        confidence: 1.0,
        discNumber,
        position: mbTrack.position,
      });

      matchedDbTrackIds.add(dbTrack.id);
      matchedMbTrackPositions.add(key);
    }
  }

  // ============================================================
  // Pass 2: Title similarity matching for unmatched tracks
  // ============================================================
  const unmatchedMbTracks = mbTracks.filter(mb => {
    const discNumber = (mb as MBRecording & { discNumber?: number }).discNumber ?? 1;
    const key = positionKey(discNumber, mb.position);
    return !matchedMbTrackPositions.has(key);
  });

  const unmatchedDbTracks = dbTracks.filter(db => !matchedDbTrackIds.has(db.id));

  for (const mbTrack of unmatchedMbTracks) {
    let bestMatch: { dbTrack: Track; similarity: number } | null = null;

    for (const dbTrack of unmatchedDbTracks) {
      if (matchedDbTrackIds.has(dbTrack.id)) {
        continue; // Already matched in this pass
      }

      const similarity = calculateTitleSimilarity(dbTrack.title, mbTrack.title);

      if (similarity >= SIMILARITY_THRESHOLD) {
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { dbTrack, similarity };
        }
      }
    }

    if (bestMatch) {
      const discNumber = (mbTrack as MBRecording & { discNumber?: number }).discNumber ?? 1;

      matches.push({
        dbTrack: bestMatch.dbTrack,
        mbTrack,
        matchType: 'TITLE_SIMILARITY',
        confidence: bestMatch.similarity,
        discNumber,
        position: mbTrack.position,
      });

      matchedDbTrackIds.add(bestMatch.dbTrack.id);
      const key = positionKey(discNumber, mbTrack.position);
      matchedMbTrackPositions.add(key);
    }
  }

  // ============================================================
  // Pass 3: Mark remaining MB tracks as NEW
  // ============================================================
  for (const mbTrack of mbTracks) {
    const discNumber = (mbTrack as MBRecording & { discNumber?: number }).discNumber ?? 1;
    const key = positionKey(discNumber, mbTrack.position);

    if (!matchedMbTrackPositions.has(key)) {
      matches.push({
        dbTrack: null,
        mbTrack,
        matchType: 'NEW',
        confidence: 1.0,
        discNumber,
        position: mbTrack.position,
      });
    }
  }

  // ============================================================
  // Pass 4: Mark remaining DB tracks as ORPHANED
  // ============================================================
  for (const dbTrack of dbTracks) {
    if (!matchedDbTrackIds.has(dbTrack.id)) {
      matches.push({
        dbTrack,
        mbTrack: null,
        matchType: 'ORPHANED',
        confidence: 1.0,
        discNumber: dbTrack.discNumber,
        position: dbTrack.trackNumber,
      });
    }
  }

  // ============================================================
  // Sort by disc number, then position
  // ============================================================
  matches.sort((a, b) => {
    if (a.discNumber !== b.discNumber) {
      return a.discNumber - b.discNumber;
    }
    return a.position - b.position;
  });

  return matches;
}
