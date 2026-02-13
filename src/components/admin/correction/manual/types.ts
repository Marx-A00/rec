import type { CurrentDataViewAlbum } from '../CurrentDataView';

/**
 * Manual edit field state interface.
 * Represents the editable fields for manual album correction.
 */
export interface ManualEditFieldState {
  /** Album title */
  title: string;
  /** Array of artist names */
  artists: string[];
  /** Partial date string (YYYY, YYYY-MM, or YYYY-MM-DD) */
  releaseDate: string | null;
  /** Release type (Album, EP, Single, etc.) */
  releaseType: string | null;
  /** MusicBrainz release ID (UUID) */
  musicbrainzId: string | null;
  /** Spotify album ID (22-char base62) */
  spotifyId: string | null;
  /** Discogs release ID (numeric string) */
  discogsId: string | null;
}

/**
 * Validation errors for manual edit form.
 * Each field can have an error message or undefined.
 */
export interface ManualEditValidationErrors {
  title?: string;
  artists?: string;
  releaseDate?: string;
  releaseType?: string;
  musicbrainzId?: string;
  spotifyId?: string;
  discogsId?: string;
}

/**
 * Dirty state tracking for unsaved changes warning.
 */
export interface ManualEditDirtyState {
  /** True if any field has been modified */
  isDirty: boolean;
  /** Set of field keys that have been modified */
  dirtyFields: Set<keyof ManualEditFieldState>;
}

/**
 * Factory function to create initial edit state from current album data.
 *
 * Pre-populates form with existing album values.
 *
 * @param album - Current album data
 * @returns Initial manual edit state
 */
export function createInitialEditState(
  album: CurrentDataViewAlbum
): ManualEditFieldState {
  return {
    title: album.title,
    artists: album.artists.map(a => a.artist.name),
    releaseDate: album.releaseDate,
    releaseType: album.releaseType,
    musicbrainzId: album.musicbrainzId,
    spotifyId: album.spotifyId,
    discogsId: album.discogsId,
  };
}

/**
 * Compares initial and current state to detect unsaved changes.
 *
 * Used for unsaved changes warning when user tries to navigate away.
 *
 * @param initial - Initial state from album
 * @param current - Current form state
 * @returns True if any field has been modified
 */
export function hasUnsavedChanges(
  initial: ManualEditFieldState,
  current: ManualEditFieldState
): boolean {
  // Compare primitive fields
  if (initial.title !== current.title) return true;
  if (initial.releaseDate !== current.releaseDate) return true;
  if (initial.releaseType !== current.releaseType) return true;
  if (initial.musicbrainzId !== current.musicbrainzId) return true;
  if (initial.spotifyId !== current.spotifyId) return true;
  if (initial.discogsId !== current.discogsId) return true;

  // Compare artists array (order matters)
  if (initial.artists.length !== current.artists.length) return true;
  for (let i = 0; i < initial.artists.length; i++) {
    if (initial.artists[i] !== current.artists[i]) return true;
  }

  return false;
}

/**
 * Calculate dirty state from initial and current values.
 *
 * @param initial - Initial state from album
 * @param current - Current form state
 * @returns Dirty state with isDirty flag and dirtyFields set
 */
export function calculateDirtyState(
  initial: ManualEditFieldState,
  current: ManualEditFieldState
): ManualEditDirtyState {
  const dirtyFields = new Set<keyof ManualEditFieldState>();

  // Check each field
  if (initial.title !== current.title) dirtyFields.add('title');
  if (initial.releaseDate !== current.releaseDate)
    dirtyFields.add('releaseDate');
  if (initial.releaseType !== current.releaseType)
    dirtyFields.add('releaseType');
  if (initial.musicbrainzId !== current.musicbrainzId)
    dirtyFields.add('musicbrainzId');
  if (initial.spotifyId !== current.spotifyId) dirtyFields.add('spotifyId');
  if (initial.discogsId !== current.discogsId) dirtyFields.add('discogsId');

  // Check artists array
  if (
    initial.artists.length !== current.artists.length ||
    initial.artists.some((a, i) => a !== current.artists[i])
  ) {
    dirtyFields.add('artists');
  }

  return {
    isDirty: dirtyFields.size > 0,
    dirtyFields,
  };
}
