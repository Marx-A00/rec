// src/lib/musicbrainz/service.ts
import { MusicBrainzApi } from 'musicbrainz-api';

// Configure MusicBrainz API client
const mbApi = new MusicBrainzApi({
  appName: 'RecApp',
  appVersion: '1.0.0',
  appContactInfo: 'contact@rec-app.com', // Replace with your actual contact
});

export interface ArtistSearchResult {
  id: string;
  name: string;
  sortName: string;
  disambiguation?: string;
  type?: string;
  country?: string;
  lifeSpan?: {
    begin?: string;
    end?: string;
    ended?: boolean;
  };
  score: number;
}

export interface ReleaseGroupSearchResult {
  id: string;
  title: string;
  disambiguation?: string;
  primaryType?: string;
  secondaryTypes?: string[];
  firstReleaseDate?: string;
  artistCredit?: Array<{
    name: string;
    artist: {
      id: string;
      name: string;
    };
  }>;
  score: number;
}

export interface RecordingSearchResult {
  id: string;
  title: string;
  disambiguation?: string;
  length?: number;
  artistCredit?: Array<{
    name: string;
    artist: {
      id: string;
      name: string;
    };
  }>;
  releases?: Array<{
    id: string;
    title: string;
  }>;
  score: number;
}

export class MusicBrainzService {
  private api: MusicBrainzApi;

  constructor() {
    this.api = mbApi;
  }

  /**
   * Search for artists by name
   */
  async searchArtists(
    query: string,
    limit = 25,
    offset = 0
  ): Promise<ArtistSearchResult[]> {
    try {
      const response = await this.api.search('artist', {
        query,
        limit,
        offset,
        inc: ['aliases'], // Include artist aliases for better matching
      });

      return (
        response.artists?.map(artist => ({
          id: artist.id,
          name: artist.name,
          sortName: artist['sort-name'],
          disambiguation: artist.disambiguation,
          type: artist.type,
          country: artist.country,
          lifeSpan: artist['life-span']
            ? {
                begin: artist['life-span'].begin,
                end: artist['life-span'].end,
                ended: artist['life-span'].ended,
              }
            : undefined,
          score: artist.score || 0,
        })) || []
      );
    } catch (error) {
      console.error('MusicBrainz artist search error:', error);
      throw new Error(
        `Failed to search artists: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Search for release groups (albums) by title
   * Filters out bootlegs, unofficial compilations, and DJ mixes
   */
  async searchReleaseGroups(
    query: string,
    limit = 25,
    offset = 0
  ): Promise<ReleaseGroupSearchResult[]> {
    try {
      // TODO: Improve search quality by filtering out unwanted results
      // Current filters exclude bootlegs, compilations, and DJ mixes
      // Consider adding: score threshold, date range, better ranking algorithm

      // Enhanced query with filters to exclude junk:
      // - status:official (exclude bootlegs and promotional)
      // - NOT secondarytype:compilation (exclude unofficial compilations)
      // - NOT secondarytype:dj-mix (exclude DJ mixes)
      const enhancedQuery = `(artist:"${query}" OR releasegroup:"${query}") AND status:official AND NOT secondarytype:compilation AND NOT secondarytype:dj-mix`;

      const response = await this.api.search('release-group', {
        query: enhancedQuery,
        limit,
        offset,
        inc: ['artist-credits'], // Include artist credit information
      });

      return (
        response['release-groups']?.map(rg => ({
          id: rg.id,
          title: rg.title,
          disambiguation: rg.disambiguation,
          primaryType: rg['primary-type'],
          secondaryTypes: rg['secondary-types'],
          firstReleaseDate: rg['first-release-date'],
          artistCredit: rg['artist-credit']?.map(ac => ({
            name: ac.name,
            artist: {
              id: ac.artist.id,
              name: ac.artist.name,
            },
          })),
          score: rg.score || 0,
        })) || []
      );
    } catch (error) {
      console.error('MusicBrainz release group search error:', error);
      throw new Error(
        `Failed to search release groups: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Search for albums only (no compilations)
   */
  async searchAlbums(
    query: string,
    limit = 10,
    offset = 0
  ): Promise<ReleaseGroupSearchResult[]> {
    try {
      const albumQuery = `artist:"${query}" AND status:official AND primarytype:album AND NOT secondarytype:compilation`;

      const response = await this.api.search('release-group', {
        query: albumQuery,
        limit,
        offset,
        inc: ['artist-credits'],
      });

      return (
        response['release-groups']?.map(rg => ({
          id: rg.id,
          title: rg.title,
          disambiguation: rg.disambiguation,
          primaryType: rg['primary-type'],
          secondaryTypes: rg['secondary-types'],
          firstReleaseDate: rg['first-release-date'],
          artistCredit: rg['artist-credit']?.map(ac => ({
            name: ac.name,
            artist: {
              id: ac.artist.id,
              name: ac.artist.name,
            },
          })),
          score: rg.score || 0,
        })) || []
      );
    } catch (error) {
      console.error('MusicBrainz album search error:', error);
      throw new Error(
        `Failed to search albums: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Search for singles only
   */
  async searchSingles(
    query: string,
    limit = 10,
    offset = 0
  ): Promise<ReleaseGroupSearchResult[]> {
    try {
      const singleQuery = `artist:"${query}" AND status:official AND primarytype:single`;

      const response = await this.api.search('release-group', {
        query: singleQuery,
        limit,
        offset,
        inc: ['artist-credits'],
      });

      return (
        response['release-groups']?.map(rg => ({
          id: rg.id,
          title: rg.title,
          disambiguation: rg.disambiguation,
          primaryType: rg['primary-type'],
          secondaryTypes: rg['secondary-types'],
          firstReleaseDate: rg['first-release-date'],
          artistCredit: rg['artist-credit']?.map(ac => ({
            name: ac.name,
            artist: {
              id: ac.artist.id,
              name: ac.artist.name,
            },
          })),
          score: rg.score || 0,
        })) || []
      );
    } catch (error) {
      console.error('MusicBrainz single search error:', error);
      throw new Error(
        `Failed to search singles: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Search for EPs only
   */
  async searchEPs(
    query: string,
    limit = 10,
    offset = 0
  ): Promise<ReleaseGroupSearchResult[]> {
    try {
      const epQuery = `artist:"${query}" AND status:official AND primarytype:ep`;

      const response = await this.api.search('release-group', {
        query: epQuery,
        limit,
        offset,
        inc: ['artist-credits'],
      });

      return (
        response['release-groups']?.map(rg => ({
          id: rg.id,
          title: rg.title,
          disambiguation: rg.disambiguation,
          primaryType: rg['primary-type'],
          secondaryTypes: rg['secondary-types'],
          firstReleaseDate: rg['first-release-date'],
          artistCredit: rg['artist-credit']?.map(ac => ({
            name: ac.name,
            artist: {
              id: ac.artist.id,
              name: ac.artist.name,
            },
          })),
          score: rg.score || 0,
        })) || []
      );
    } catch (error) {
      console.error('MusicBrainz EP search error:', error);
      throw new Error(
        `Failed to search EPs: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Search for recordings (tracks) by title
   */
  async searchRecordings(
    query: string,
    limit = 25,
    offset = 0
  ): Promise<RecordingSearchResult[]> {
    try {
      const response = await this.api.search('recording', {
        query,
        limit,
        offset,
        inc: ['artist-credits', 'releases'], // Include artist and release info
      });

      return (
        response.recordings?.map(recording => ({
          id: recording.id,
          title: recording.title,
          disambiguation: recording.disambiguation,
          length: recording.length,
          artistCredit: recording['artist-credit']?.map(ac => ({
            name: ac.name,
            artist: {
              id: ac.artist.id,
              name: ac.artist.name,
            },
          })),
          releases: recording.releases?.map(release => ({
            id: release.id,
            title: release.title,
          })),
          score: recording.score || 0,
        })) || []
      );
    } catch (error) {
      console.error('MusicBrainz recording search error:', error);
      throw new Error(
        `Failed to search recordings: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get artist by MBID with optional includes
   */
  async getArtist(mbid: string, includes: string[] = []) {
    try {
      return await this.api.lookup('artist', mbid, includes as any);
    } catch (error) {
      console.error('MusicBrainz artist lookup error:', error);
      throw new Error(
        `Failed to lookup artist: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get release group by MBID with optional includes
   */
  async getReleaseGroup(mbid: string, includes: string[] = []) {
    try {
      return await this.api.lookup('release-group', mbid, includes as any);
    } catch (error) {
      console.error('MusicBrainz release group lookup error:', error);
      throw new Error(
        `Failed to lookup release group: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get recording by MBID with optional includes
   */
  async getRecording(mbid: string, includes: string[] = []) {
    try {
      return await this.api.lookup('recording', mbid, includes as any);
    } catch (error) {
      console.error('MusicBrainz recording lookup error:', error);
      throw new Error(
        `Failed to lookup recording: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get release by MBID with optional includes
   */
  async getRelease(mbid: string, includes: string[] = []) {
    try {
      return await this.api.lookup('release', mbid, includes as any);
    } catch (error) {
      console.error('MusicBrainz release lookup error:', error);
      throw new Error(
        `Failed to lookup release: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Browse releases by artist MBID
   */
  async getArtistReleaseGroups(artistMbid: string, limit = 50, offset = 0) {
    try {
      return await this.api.browse('release-group', {
        artist: artistMbid,
        limit,
        offset,
      });
    } catch (error) {
      console.error('MusicBrainz browse artist release groups error:', error);
      throw new Error(
        `Failed to browse artist release groups: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Browse recordings by release MBID
   */
  async getReleaseRecordings(releaseMbid: string, limit = 50, offset = 0) {
    try {
      return await this.api.browse('recording', {
        release: releaseMbid,
        limit,
        offset,
      });
    } catch (error) {
      console.error('MusicBrainz browse release recordings error:', error);
      throw new Error(
        `Failed to browse release recordings: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

// Export singleton instance
export const musicbrainzService = new MusicBrainzService();
