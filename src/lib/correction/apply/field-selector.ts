/**
 * Field selector functions for building conditional Prisma update objects.
 * Enables partial corrections where admins choose which fields to update.
 *
 * @example
 * ```typescript
 * const selections: FieldSelections = {
 *   metadata: { title: true, releaseDate: false, ... },
 *   coverArt: 'use_source',
 *   ...
 * };
 * const updateData = buildAlbumUpdateData(preview, selections);
 * // updateData only contains fields that were selected
 * ```
 */

import type { Prisma, Track } from '@prisma/client';

import type { CorrectionPreview, MBRecording } from '../preview/types';

import type { CoverArtChoice, FieldSelections } from './types';

// ============================================================================
// Date Parsing
// ============================================================================

/**
 * Parses a MusicBrainz date string into a JavaScript Date object.
 * Handles YYYY, YYYY-MM, and YYYY-MM-DD formats.
 *
 * @param dateStr - Date string from MusicBrainz (e.g., "2024", "2024-01", "2024-01-15")
 * @returns Date object in UTC, or null if invalid/missing
 *
 * @example
 * ```typescript
 * parseReleaseDate("2024")       // -> Date for 2024-01-01 UTC
 * parseReleaseDate("2024-03")    // -> Date for 2024-03-01 UTC
 * parseReleaseDate("2024-03-15") // -> Date for 2024-03-15 UTC
 * parseReleaseDate(undefined)    // -> null
 * parseReleaseDate("invalid")    // -> null
 * ```
 */
export function parseReleaseDate(
  dateStr: string | undefined | null
): Date | null {
  if (!dateStr) {
    return null;
  }

  // Match YYYY, YYYY-MM, or YYYY-MM-DD
  const yearOnly = /^(\d{4})$/;
  const yearMonth = /^(\d{4})-(\d{2})$/;
  const fullDate = /^(\d{4})-(\d{2})-(\d{2})$/;

  let year: number;
  let month = 1; // Default to January
  let day = 1; // Default to 1st

  if (fullDate.test(dateStr)) {
    const match = dateStr.match(fullDate);
    if (match) {
      year = parseInt(match[1], 10);
      month = parseInt(match[2], 10);
      day = parseInt(match[3], 10);
    } else {
      return null;
    }
  } else if (yearMonth.test(dateStr)) {
    const match = dateStr.match(yearMonth);
    if (match) {
      year = parseInt(match[1], 10);
      month = parseInt(match[2], 10);
    } else {
      return null;
    }
  } else if (yearOnly.test(dateStr)) {
    const match = dateStr.match(yearOnly);
    if (match) {
      year = parseInt(match[1], 10);
    } else {
      return null;
    }
  } else {
    // Invalid format
    return null;
  }

  // Validate ranges
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  // Create UTC date to avoid timezone issues
  return new Date(Date.UTC(year, month - 1, day));
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Checks if any metadata or external ID field is selected.
 * Used to determine if an album update is needed at all.
 *
 * @param selections - The field selections to check
 * @returns true if any album-level field is selected for update
 *
 * @example
 * ```typescript
 * const selections = createDefaultSelections();
 * hasAnyMetadataSelected(selections); // -> true
 *
 * const empty: FieldSelections = {
 *   metadata: { title: false, releaseDate: false, ... },
 *   externalIds: { musicbrainzId: false, ... },
 *   ...
 * };
 * hasAnyMetadataSelected(empty); // -> false
 * ```
 */
export function hasAnyMetadataSelected(selections: FieldSelections): boolean {
  // Check metadata fields
  const hasMetadata = Object.values(selections.metadata).some(Boolean);

  // Check external ID fields
  const hasExternalIds = Object.values(selections.externalIds).some(Boolean);

  return hasMetadata || hasExternalIds;
}

// ============================================================================
// Album Update Data Builder
// ============================================================================

/**
 * Builds a partial Prisma.AlbumUpdateInput based on selected fields.
 * Only includes fields that are explicitly selected - unselected fields
 * remain undefined (no change to database).
 *
 * @param preview - The correction preview containing source data
 * @param selections - Field selections determining what to update
 * @returns Prisma update object with only selected fields populated
 *
 * @example
 * ```typescript
 * const preview: CorrectionPreview = { ... };
 * const selections: FieldSelections = {
 *   metadata: { title: true, releaseDate: true, releaseType: false, ... },
 *   externalIds: { musicbrainzId: true, ... },
 *   coverArt: 'use_source',
 *   ...
 * };
 *
 * const data = buildAlbumUpdateData(preview, selections);
 * // data = {
 * //   title: "Correct Album Title",
 * //   releaseDate: Date(...),
 * //   musicbrainzId: "abc-123",
 * //   coverArtUrl: "https://coverartarchive.org/...",
 * //   lastEnriched: Date(...),
 * // }
 * // Note: releaseType is NOT in data because it wasn't selected
 * ```
 */
export function buildAlbumUpdateData(
  preview: CorrectionPreview,
  selections: FieldSelections
): Prisma.AlbumUpdateInput {
  const data: Prisma.AlbumUpdateInput = {};
  let hasChanges = false;

  // =========================================
  // Metadata Fields
  // =========================================

  if (selections.metadata.title) {
    data.title = preview.sourceResult.title;
    hasChanges = true;
  }

  if (selections.metadata.releaseDate) {
    data.releaseDate = parseReleaseDate(preview.sourceResult.firstReleaseDate);
    hasChanges = true;
  }

  if (selections.metadata.releaseType) {
    data.releaseType = preview.sourceResult.primaryType ?? null;
    hasChanges = true;
  }

  if (selections.metadata.releaseCountry) {
    data.releaseCountry = preview.mbReleaseData?.country ?? null;
    hasChanges = true;
  }

  if (selections.metadata.barcode) {
    data.barcode = preview.mbReleaseData?.barcode ?? null;
    hasChanges = true;
  }

  // Label field: MusicBrainz has complex label relationships, not a simple field
  // For v1, we leave label unchanged. Future: parse from release.label-info
  // if (selections.metadata.label) {
  //   // Not updated from MB - requires parsing label-info relationships
  // }

  // =========================================
  // External IDs
  // =========================================

  if (selections.externalIds.musicbrainzId) {
    // Use release GROUP MBID (not release MBID) for album identification
    data.musicbrainzId = preview.sourceResult.releaseGroupMbid;
    hasChanges = true;
  }

  // spotifyId and discogsId: Not updated from MusicBrainz
  // MB doesn't have Spotify/Discogs IDs. These would come from other sources.
  // if (selections.externalIds.spotifyId) { ... }
  // if (selections.externalIds.discogsId) { ... }

  // =========================================
  // Cover Art
  // =========================================

  handleCoverArtChoice(data, preview, selections.coverArt);
  if (selections.coverArt !== 'keep_current') {
    hasChanges = true;
  }

  // =========================================
  // Always Update lastEnriched if Any Changes
  // =========================================

  if (hasChanges) {
    data.lastEnriched = new Date();
  }

  return data;
}

/**
 * Handles cover art choice, mutating the data object as needed.
 */
function handleCoverArtChoice(
  data: Prisma.AlbumUpdateInput,
  preview: CorrectionPreview,
  choice: CoverArtChoice
): void {
  switch (choice) {
    case 'use_source':
      // Use the source cover art URL from the preview
      if (preview.sourceResult.coverArtUrl) {
        data.coverArtUrl = preview.sourceResult.coverArtUrl;
      }
      // Note: cloudflareImageId would need separate upload flow
      // For now, we clear it when changing cover art URL
      // (future: upload to Cloudflare and set ID)
      break;

    case 'clear':
      // Remove cover art entirely
      data.coverArtUrl = null;
      data.cloudflareImageId = null;
      break;

    case 'keep_current':
      // Do nothing - don't set coverArtUrl at all (undefined = no change)
      break;
  }
}

// ============================================================================
// Track Update Data Builder
// ============================================================================

/**
 * Builds a Prisma.TrackUpdateInput for a modified track.
 * Returns null if the track is not selected for update.
 *
 * @param mbRecording - MusicBrainz recording data (source of truth)
 * @param existingTrack - Current database track being updated
 * @param selections - Field selections including per-track toggles
 * @returns TrackUpdateInput if track is selected, null otherwise
 *
 * @example
 * ```typescript
 * const mbRecording: MBRecording = {
 *   id: "mb-recording-123",
 *   title: "Corrected Track Title",
 *   length: 240000,
 *   position: 3,
 * };
 * const existingTrack: Track = { id: "db-track-456", ... };
 * const selections: FieldSelections = {
 *   tracks: new Map([["db-track-456", true]]),
 *   ...
 * };
 *
 * const updateData = buildTrackUpdateData(mbRecording, existingTrack, selections);
 * // updateData = {
 * //   title: "Corrected Track Title",
 * //   trackNumber: 3,
 * //   durationMs: 240000,
 * //   musicbrainzId: "mb-recording-123",
 * // }
 * ```
 */
export function buildTrackUpdateData(
  mbRecording: MBRecording,
  existingTrack: Track,
  selections: FieldSelections
): Prisma.TrackUpdateInput | null {
  // Check if this specific track is selected for update
  const isSelected = selections.tracks.get(existingTrack.id);
  if (!isSelected) {
    return null;
  }

  // Build update data with all track fields from MB
  const data: Prisma.TrackUpdateInput = {
    title: mbRecording.title,
    trackNumber: mbRecording.position,
    // MusicBrainz uses 'length' for duration in milliseconds
    durationMs: mbRecording.length ?? null,
    musicbrainzId: mbRecording.id,
    // Mark as enriched
    lastEnriched: new Date(),
  };

  return data;
}

// ============================================================================
// Track Create Data Builder
// ============================================================================

/**
 * Builds a Prisma.TrackCreateInput for a new track from MusicBrainz.
 * Used when MB has tracks that don't exist in the database.
 *
 * @param mbRecording - MusicBrainz recording data for the new track
 * @param albumId - Database album ID to connect the track to
 * @param discNumber - Disc number (1-based)
 * @returns Complete TrackCreateInput ready for Prisma create
 *
 * @example
 * ```typescript
 * const mbRecording: MBRecording = {
 *   id: "mb-recording-789",
 *   title: "New Track",
 *   length: 180000,
 *   position: 12,
 * };
 *
 * const createData = buildTrackCreateData(mbRecording, "album-uuid", 1);
 * // createData = {
 * //   album: { connect: { id: "album-uuid" } },
 * //   title: "New Track",
 * //   trackNumber: 12,
 * //   discNumber: 1,
 * //   durationMs: 180000,
 * //   musicbrainzId: "mb-recording-789",
 * //   source: "MUSICBRAINZ",
 * //   dataQuality: "HIGH",
 * //   enrichmentStatus: "COMPLETED",
 * // }
 * ```
 */
export function buildTrackCreateData(
  mbRecording: MBRecording,
  albumId: string,
  discNumber: number
): Prisma.TrackCreateInput {
  return {
    // Connect to parent album
    album: { connect: { id: albumId } },

    // Track identification
    title: mbRecording.title,
    trackNumber: mbRecording.position,
    discNumber,

    // Duration (MB uses 'length' not 'durationMs')
    durationMs: mbRecording.length ?? null,

    // MusicBrainz ID
    musicbrainzId: mbRecording.id,

    // Source and quality markers
    source: 'MUSICBRAINZ',
    // HIGH quality because it's admin-verified from correction flow
    dataQuality: 'HIGH',
    enrichmentStatus: 'COMPLETED',
    lastEnriched: new Date(),
  };
}

// ============================================================================
// Track Deletion Helper
// ============================================================================

/**
 * Filters orphaned track IDs to only include those selected for deletion.
 * Tracks not selected for update should not be deleted either.
 *
 * @param orphanedTrackIds - Array of track IDs that exist in DB but not in MB
 * @param selections - Field selections with per-track toggles
 * @returns Array of track IDs that should be deleted (selected for update)
 *
 * @example
 * ```typescript
 * const orphanedIds = ["track-1", "track-2", "track-3"];
 * const selections: FieldSelections = {
 *   tracks: new Map([
 *     ["track-1", true],   // selected - will be deleted
 *     ["track-2", false],  // not selected - keep in DB
 *     // track-3 not in map - treat as not selected, keep
 *   ]),
 *   ...
 * };
 *
 * getTrackIdsToDelete(orphanedIds, selections);
 * // -> ["track-1"]
 * ```
 */
export function getTrackIdsToDelete(
  orphanedTrackIds: string[],
  selections: FieldSelections
): string[] {
  return orphanedTrackIds.filter(id => {
    // Only delete if explicitly selected for update
    return selections.tracks.get(id) === true;
  });
}
