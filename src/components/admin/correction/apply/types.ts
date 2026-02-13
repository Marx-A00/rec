/**
 * Type definitions and utilities for field selection UI state.
 *
 * Manages the UI-friendly state for selecting which fields to apply in a correction.
 * Converts between UI state and GraphQL input format.
 */

import type { CorrectionPreview } from '@/lib/correction/preview/types';
import type {
  FieldSelectionsInput,
  MetadataSelectionsInput,
  ExternalIdSelectionsInput,
  SelectionEntry,
  CoverArtChoice,
} from '@/generated/graphql';

// ============================================================================
// UI Selection State
// ============================================================================

/**
 * UI-friendly field selection state.
 *
 * Matches apply service FieldSelections but uses simpler structures:
 * - Direct boolean properties instead of Maps
 * - Set for excluded tracks instead of Map
 * - Enum for cover art choice
 */
export interface UIFieldSelections {
  /** Metadata field selections */
  metadata: {
    title: boolean;
    releaseDate: boolean;
    releaseType: boolean;
    releaseCountry: boolean;
    barcode: boolean;
    label: boolean;
  };
  /** Track selection with hybrid "apply all with exclusions" pattern */
  tracks: {
    /** Whether to apply all tracks by default */
    applyAll: boolean;
    /** Track positions to exclude (e.g., "1-3" for disc 1, track 3) */
    excludedPositions: Set<string>;
  };
  /** External ID field selections */
  externalIds: {
    musicbrainzId: boolean;
    spotifyId: boolean;
    discogsId: boolean;
  };
  /** Cover art handling choice */
  coverArt: 'use_source' | 'keep_current' | 'clear';
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates default UI selections with all fields selected.
 *
 * - All metadata fields: true
 * - Tracks: applyAll=true, no exclusions
 * - All external IDs: true
 * - Cover art: 'use_source' if changed, else 'keep_current'
 */
export function createDefaultUISelections(
  preview: CorrectionPreview
): UIFieldSelections {
  return {
    metadata: {
      title: true,
      releaseDate: true,
      releaseType: true,
      releaseCountry: true,
      barcode: true,
      label: true,
    },
    tracks: {
      applyAll: true,
      excludedPositions: new Set(),
    },
    externalIds: {
      musicbrainzId: true,
      spotifyId: true,
      discogsId: true,
    },
    coverArt:
      preview.coverArt.changeType !== 'UNCHANGED'
        ? 'use_source'
        : 'keep_current',
  };
}

// ============================================================================
// Conversion Functions
// ============================================================================

/**
 * Converts UI field selections to GraphQL input format.
 *
 * - Metadata: direct object mapping
 * - Artists: all artists from preview applied as unit (no per-artist selection in UI)
 * - Tracks: converts hybrid state to SelectionEntry array
 * - External IDs: direct object mapping
 * - Cover art: maps string to enum
 */
export function toGraphQLSelections(
  ui: UIFieldSelections,
  preview: CorrectionPreview
): FieldSelectionsInput {
  // Convert metadata (direct mapping)
  const metadata: MetadataSelectionsInput = {
    title: ui.metadata.title,
    releaseDate: ui.metadata.releaseDate,
    releaseType: ui.metadata.releaseType,
    releaseCountry: ui.metadata.releaseCountry,
    barcode: ui.metadata.barcode,
    label: ui.metadata.label,
  };

  // Convert artists - apply all as unit (no per-artist UI selection)
  // Note: Artist credits are typically applied together from MusicBrainz
  const artists: SelectionEntry[] = preview.artistDiff.source.map(artist => ({
    key: artist.mbid,
    selected: true,
  }));

  // Convert tracks - hybrid approach to SelectionEntry array
  // Position key format: "disc-track" (e.g., "1-3" for disc 1, track 3)
  const tracks: SelectionEntry[] = preview.trackDiffs.map(trackDiff => {
    const positionKey = `${trackDiff.discNumber}-${trackDiff.position}`;
    const isExcluded = ui.tracks.excludedPositions.has(positionKey);

    return {
      key: positionKey,
      selected: ui.tracks.applyAll && !isExcluded,
    };
  });

  // Convert external IDs (direct mapping)
  const externalIds: ExternalIdSelectionsInput = {
    musicbrainzId: ui.externalIds.musicbrainzId,
    spotifyId: ui.externalIds.spotifyId,
    discogsId: ui.externalIds.discogsId,
  };

  // Convert cover art choice to enum
  const coverArt: CoverArtChoice = {
    use_source: 'USE_SOURCE' as CoverArtChoice,
    keep_current: 'KEEP_CURRENT' as CoverArtChoice,
    clear: 'CLEAR' as CoverArtChoice,
  }[ui.coverArt];

  const result = {
    metadata,
    artists,
    tracks,
    externalIds,
    coverArt,
  };

  // Debug logging for correction workflow tracing
  console.log('[toGraphQLSelections] Payload:', {
    input: {
      uiSelections: ui,
      previewSummary: preview.summary,
      artistDiff: {
        changeType: preview.artistDiff.changeType,
        current: preview.artistDiff.currentDisplay,
        source: preview.artistDiff.sourceDisplay,
      },
    },
    output: result,
  });

  return result;
}
