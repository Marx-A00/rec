import { describe, it, expect } from 'vitest';

import { CACHE_KEYS, CACHE_TTLS } from '@/lib/cache/keys';

describe('CACHE_KEYS', () => {
  describe('key builders produce expected strings', () => {
    it('spotifyImage', () => {
      expect(CACHE_KEYS.spotifyImage('abc-123')).toBe(
        'cache:spotify:image:abc-123'
      );
    });

    it('similarArtists', () => {
      expect(CACHE_KEYS.similarArtists('mbid-1')).toBe(
        'cache:similar:mbid-1'
      );
    });

    it('discography with source', () => {
      expect(CACHE_KEYS.discography('art-1', 'musicbrainz')).toBe(
        'cache:discography:musicbrainz:art-1'
      );
    });

    it('searchResults with type', () => {
      expect(CACHE_KEYS.searchResults('radiohead', 'artist')).toBe(
        'cache:search:artist:radiohead'
      );
    });

    it('count keys', () => {
      expect(CACHE_KEYS.countArtistAlbums('a1')).toBe(
        'cache:count:artist-albums:a1'
      );
      expect(CACHE_KEYS.countAlbumCollections('b1')).toBe(
        'cache:count:album-collections:b1'
      );
    });

    it('user-scoped keys', () => {
      expect(CACHE_KEYS.userCollections('u1')).toBe(
        'cache:user:collections:u1'
      );
      expect(CACHE_KEYS.userRecs('u1')).toBe('cache:user:recs:u1');
    });
  });

  describe('query normalization', () => {
    it('should lowercase queries', () => {
      expect(CACHE_KEYS.spotifySearch('RADIOHEAD')).toBe(
        'cache:spotify:search:radiohead'
      );
    });

    it('should trim whitespace', () => {
      expect(CACHE_KEYS.spotifySearch('  radiohead  ')).toBe(
        'cache:spotify:search:radiohead'
      );
    });

    it('should collapse multiple spaces', () => {
      expect(CACHE_KEYS.spotifySearch('the   national')).toBe(
        'cache:spotify:search:the national'
      );
    });

    it('should normalize consistently across key types', () => {
      const query = '  The   NATIONAL  ';
      const spotifyKey = CACHE_KEYS.spotifySearch(query);
      const lastfmKey = CACHE_KEYS.lastfmSearch(query);
      const searchKey = CACHE_KEYS.searchResults(query, 'artist');

      // All should have the same normalized query portion
      expect(spotifyKey).toContain('the national');
      expect(lastfmKey).toContain('the national');
      expect(searchKey).toContain('the national');
    });

    it('should handle unicode', () => {
      expect(CACHE_KEYS.lastfmInfo('Björk')).toBe(
        'cache:lastfm:info:björk'
      );
      expect(CACHE_KEYS.lastfmInfo('Sigur Rós')).toBe(
        'cache:lastfm:info:sigur rós'
      );
    });
  });
});

describe('CACHE_TTLS', () => {
  it('long-lived caches should be 7 days', () => {
    const sevenDays = 7 * 24 * 60 * 60;
    expect(CACHE_TTLS.SPOTIFY_IMAGE).toBe(sevenDays);
    expect(CACHE_TTLS.SIMILAR_ARTISTS).toBe(sevenDays);
    expect(CACHE_TTLS.LASTFM).toBe(sevenDays);
    expect(CACHE_TTLS.LISTENBRAINZ).toBe(sevenDays);
    expect(CACHE_TTLS.DISCOGRAPHY).toBe(sevenDays);
  });

  it('medium-lived caches should be 1-24 hours', () => {
    expect(CACHE_TTLS.SPOTIFY_SEARCH).toBe(3600);
    expect(CACHE_TTLS.COUNT).toBe(3600);
    expect(CACHE_TTLS.ALBUM_DETAILS).toBe(86400);
  });

  it('short-lived caches should be 5-15 minutes', () => {
    expect(CACHE_TTLS.SEARCH_RESULTS).toBe(300);
    expect(CACHE_TTLS.USER_COLLECTIONS).toBe(900);
    expect(CACHE_TTLS.USER_RECS).toBe(600);
  });

  it('all TTLs should be positive numbers', () => {
    for (const [key, value] of Object.entries(CACHE_TTLS)) {
      expect(value, `${key} should be positive`).toBeGreaterThan(0);
    }
  });
});
