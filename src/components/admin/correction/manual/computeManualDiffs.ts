import type {
  CorrectionPreview,
  TextDiff,
  DateDiff,
  FieldDiff,
  ChangeType,
  ArtistCreditDiff,
} from '@/lib/correction/preview/types';
import type { ManualEditFieldState } from './types';
import type { CurrentDataViewAlbum } from '../CurrentDataView';

/**
 * Compute CorrectionPreview from manual edits.
 * 
 * Compares current album data to manually edited values and generates
 * field diffs compatible with PreviewView components.
 * 
 * @param album - Current album data from database
 * @param editedState - Manually edited values from form
 * @returns CorrectionPreview structure for preview display
 */
export function computeManualPreview(
  album: CurrentDataViewAlbum,
  editedState: ManualEditFieldState
): CorrectionPreview {
  const fieldDiffs: FieldDiff[] = [];

  // 1. Title diff
  if (album.title !== editedState.title) {
    const titleDiff: TextDiff = {
      field: 'title',
      changeType: 'MODIFIED',
      currentValue: album.title,
      sourceValue: editedState.title,
    };
    fieldDiffs.push(titleDiff);
  }

  // 2. Release date diff
  if (album.releaseDate !== editedState.releaseDate) {
    const changeType: ChangeType = 
      !album.releaseDate && editedState.releaseDate ? 'ADDED' :
      album.releaseDate && !editedState.releaseDate ? 'REMOVED' :
      'MODIFIED';

    const dateDiff: DateDiff = {
      field: 'releaseDate',
      changeType,
      current: album.releaseDate ? parseDateComponents(album.releaseDate) : null,
      source: editedState.releaseDate ? parseDateComponents(editedState.releaseDate) : null,
      componentChanges: {
        year: changeType,
        month: changeType,
        day: changeType,
      },
    };
    fieldDiffs.push(dateDiff);
  }

  // 3. Release type diff
  if (album.releaseType !== editedState.releaseType) {
    const changeType: ChangeType = 
      !album.releaseType && editedState.releaseType ? 'ADDED' :
      album.releaseType && !editedState.releaseType ? 'REMOVED' :
      'MODIFIED';

    const releaseTypeDiff: TextDiff = {
      field: 'releaseType',
      changeType,
      currentValue: album.releaseType,
      sourceValue: editedState.releaseType,
    };
    fieldDiffs.push(releaseTypeDiff);
  }

  // 4. External ID diffs
  if (album.musicbrainzId !== editedState.musicbrainzId) {
    const changeType: ChangeType = 
      !album.musicbrainzId && editedState.musicbrainzId ? 'ADDED' :
      album.musicbrainzId && !editedState.musicbrainzId ? 'REMOVED' :
      'MODIFIED';

    const mbidDiff: TextDiff = {
      field: 'musicbrainzId',
      changeType,
      currentValue: album.musicbrainzId,
      sourceValue: editedState.musicbrainzId,
    };
    fieldDiffs.push(mbidDiff);
  }

  if (album.spotifyId !== editedState.spotifyId) {
    const changeType: ChangeType = 
      !album.spotifyId && editedState.spotifyId ? 'ADDED' :
      album.spotifyId && !editedState.spotifyId ? 'REMOVED' :
      'MODIFIED';

    const spotifyDiff: TextDiff = {
      field: 'spotifyId',
      changeType,
      currentValue: album.spotifyId,
      sourceValue: editedState.spotifyId,
    };
    fieldDiffs.push(spotifyDiff);
  }

  if (album.discogsId !== editedState.discogsId) {
    const changeType: ChangeType = 
      !album.discogsId && editedState.discogsId ? 'ADDED' :
      album.discogsId && !editedState.discogsId ? 'REMOVED' :
      'MODIFIED';

    const discogsDiff: TextDiff = {
      field: 'discogsId',
      changeType,
      currentValue: album.discogsId,
      sourceValue: editedState.discogsId,
    };
    fieldDiffs.push(discogsDiff);
  }

  // 5. Artist diff
  const currentArtists = album.artists
    .sort((a, b) => a.position - b.position)
    .map(aa => aa.artist.name);
  const artistsChanged = 
    currentArtists.length !== editedState.artists.length ||
    currentArtists.some((name, i) => name !== editedState.artists[i]);

  const artistDiff: ArtistCreditDiff = {
    changeType: artistsChanged ? 'MODIFIED' : 'UNCHANGED',
    current: currentArtists.map(name => ({ name, joinPhrase: ', ' })),
    source: editedState.artists.map(name => ({ name, joinPhrase: ', ' })),
  };

  // 6. Construct sourceResult (synthetic for manual edits)
  const sourceResult = {
    id: 'manual-edit',
    releaseGroupMbid: null,
    title: editedState.title,
    artistCredits: editedState.artists.map(name => ({ name, joinPhrase: ', ' })),
    firstReleaseDate: editedState.releaseDate,
    primaryType: editedState.releaseType,
    secondaryTypes: [],
    score: 100,
    rawScore: 100,
    tier: 'high' as const,
    coverArtUrl: album.coverArtUrl,
  };

  // 7. Calculate summary
  const changedFields = fieldDiffs.length + (artistsChanged ? 1 : 0);

  return {
    currentAlbum: {
      ...album,
      // Convert CurrentDataViewAlbum to Album type (add missing fields)
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: '',
      source: 'MANUAL',
      dataQuality: album.dataQuality ?? 'LOW',
      enrichmentStatus: 'PENDING',
      primaryType: album.releaseType,
      secondaryTypes: [],
      country: null,
      disambiguation: null,
      packaging: null,
      status: null,
      catalogNumber: null,
      tracks: album.tracks,
    },
    sourceResult,
    mbReleaseData: null, // Manual edits don't have MB data
    fieldDiffs,
    artistDiff,
    trackDiffs: [], // Manual edit doesn't change tracks in v1
    trackSummary: {
      currentCount: album.tracks.length,
      sourceCount: album.tracks.length,
      matchedCount: album.tracks.length,
      addedCount: 0,
      removedCount: 0,
      modifiedCount: 0,
    },
    coverArt: {
      currentUrl: album.coverArtUrl,
      sourceUrl: album.coverArtUrl,
      changeType: 'UNCHANGED',
    },
    summary: {
      totalFields: 7, // title, artists, releaseDate, releaseType, 3 external IDs
      changedFields,
      addedFields: fieldDiffs.filter(d => d.changeType === 'ADDED').length,
      modifiedFields: fieldDiffs.filter(d => d.changeType === 'MODIFIED').length,
      conflictFields: 0,
      hasTrackChanges: false,
    },
  };
}

/**
 * Parse date string into components.
 */
function parseDateComponents(dateStr: string) {
  const parts = dateStr.split('-').map(Number);
  return {
    year: parts[0],
    month: parts[1],
    day: parts[2],
  };
}
