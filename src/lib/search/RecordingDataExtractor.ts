// src/lib/search/RecordingDataExtractor.ts

// ============================================================================
// MusicBrainz API Response Types
// ============================================================================

interface MusicBrainzAlias {
  name: string;
  'sort-name': string;
  type?: string;
  'type-id'?: string;
  locale?: string | null;
  primary?: boolean | null;
  'begin-date'?: string | null;
  'end-date'?: string | null;
}

interface MusicBrainzArtist {
  id: string;
  name: string;
  'sort-name': string;
  disambiguation?: string;
  aliases?: MusicBrainzAlias[];
}

interface MusicBrainzArtistCredit {
  name: string;
  artist: MusicBrainzArtist;
}

interface MusicBrainzReleaseGroup {
  id: string;
  title: string;
  'primary-type'?: string;
  'primary-type-id'?: string;
  'secondary-types'?: string[];
  'secondary-type-ids'?: string[];
  'type-id'?: string;
}

interface MusicBrainzRelease {
  id: string;
  title: string;
  status?: string;
  'status-id'?: string;
  disambiguation?: string;
  date?: string;
  country?: string;
  'track-count'?: number;
  'artist-credit'?: MusicBrainzArtistCredit[];
  'artist-credit-id'?: string;
  'release-group': MusicBrainzReleaseGroup;
  count?: number;
  media?: Array<{
    id?: string;
    position?: number;
    format?: string;
    'track-count'?: number;
    'track-offset'?: number;
    track?: Array<{
      id: string;
      number: string;
      title: string;
      length?: number;
    }>;
  }>;
  'release-events'?: Array<{
    date?: string;
    area?: {
      id: string;
      name: string;
      'sort-name': string;
      'iso-3166-1-codes'?: string[];
    };
  }>;
}

export interface MusicBrainzRecording {
  id: string;
  title: string;
  score?: number;
  length?: number;
  video?: boolean | null;
  disambiguation?: string;
  'artist-credit': MusicBrainzArtistCredit[];
  'artist-credit-id'?: string;
  'first-release-date'?: string;
  releases?: MusicBrainzRelease[];
  isrcs?: string[];
}

// ============================================================================
// Extracted Data Types
// ============================================================================

export interface ExtractedArtist {
  id: string;
  name: string;
  sortName: string;
  disambiguation?: string;
  aliases: string[];
}

export interface ExtractedAlbum {
  releaseGroupId: string;
  title: string;
  primaryType: string;
  secondaryTypes: string[];
  firstReleaseDate?: string;
  isCompilation: boolean;
}

export interface ExtractedTrack {
  recordingId: string;
  title: string;
  length?: number;
  isrc?: string;
  mbScore: number;
}

// ============================================================================
// Recording Data Extractor Class
// ============================================================================

export class RecordingDataExtractor {
  /**
   * Extract artist information from recording
   */
  extractArtist(recording: MusicBrainzRecording): ExtractedArtist | null {
    const artistCredit = recording['artist-credit']?.[0];
    if (!artistCredit?.artist) return null;

    const artist = artistCredit.artist;

    return {
      id: artist.id,
      name: artist.name,
      sortName: artist['sort-name'] || artist.name,
      disambiguation: artist.disambiguation,
      aliases: (artist.aliases || []).map(a => a.name),
    };
  }

  /**
   * Extract all unique albums from recording releases
   * Deduplicates by release-group ID
   */
  extractAlbums(recording: MusicBrainzRecording): ExtractedAlbum[] {
    const releases = recording.releases || [];
    const releaseGroupMap = new Map<string, ExtractedAlbum>();

    releases.forEach(release => {
      const rg = release['release-group'];
      if (!rg?.id) return;

      // Skip if we already have this release group
      if (releaseGroupMap.has(rg.id)) return;

      const isCompilation = (rg['secondary-types'] || []).some(
        t => t.toLowerCase() === 'compilation'
      );

      releaseGroupMap.set(rg.id, {
        releaseGroupId: rg.id,
        title: rg.title,
        primaryType: rg['primary-type'] || 'Release',
        secondaryTypes: rg['secondary-types'] || [],
        firstReleaseDate: release.date || recording['first-release-date'],
        isCompilation,
      });
    });

    // Sort: Non-compilations first, then by date
    return Array.from(releaseGroupMap.values()).sort((a, b) => {
      if (a.isCompilation !== b.isCompilation) {
        return a.isCompilation ? 1 : -1;
      }
      return (b.firstReleaseDate || '').localeCompare(a.firstReleaseDate || '');
    });
  }

  /**
   * Extract track information
   */
  extractTrack(recording: MusicBrainzRecording): ExtractedTrack {
    return {
      recordingId: recording.id,
      title: recording.title,
      length: recording.length,
      isrc: recording.isrcs?.[0],
      mbScore: recording.score || 0,
    };
  }

  /**
   * Get the "canonical" album (non-compilation, earliest official release)
   */
  getCanonicalAlbum(recording: MusicBrainzRecording): ExtractedAlbum | null {
    const albums = this.extractAlbums(recording);

    // Filter to non-compilations
    const nonCompilations = albums.filter(a => !a.isCompilation);

    // Return first non-compilation, or first overall if only compilations exist
    return nonCompilations[0] || albums[0] || null;
  }
}
