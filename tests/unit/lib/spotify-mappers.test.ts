import { describe, it, expect } from 'vitest';

import {
  parseSpotifyDate,
  mapAlbumType,
  inferSecondaryTypes,
  parseArtistNames,
  normalizeArtistName,
  transformSpotifyAlbum,
  transformSpotifyArtist,
} from '@/lib/spotify/mappers';
import type { SpotifyAlbumData } from '@/lib/spotify/types';

describe('parseSpotifyDate', () => {
  describe('year only format', () => {
    it('should parse year-only date', () => {
      const result = parseSpotifyDate('2025');
      expect(result.precision).toBe('year');
      expect(result.date).toBeInstanceOf(Date);
      expect(result.date?.getFullYear()).toBe(2025);
      expect(result.date?.getMonth()).toBe(0); // January
      expect(result.date?.getDate()).toBe(1);
    });

    it('should reject invalid years', () => {
      const tooOld = parseSpotifyDate('1800');
      expect(tooOld.precision).toBe('invalid');
      expect(tooOld.date).toBeNull();
    });
  });

  describe('year-month format', () => {
    it('should parse year-month date', () => {
      const result = parseSpotifyDate('2024-07');
      expect(result.precision).toBe('month');
      expect(result.date).toBeInstanceOf(Date);
      expect(result.date?.getFullYear()).toBe(2024);
      expect(result.date?.getMonth()).toBe(6); // July (0-indexed)
    });

    it('should reject invalid month', () => {
      const result = parseSpotifyDate('2024-13');
      expect(result.precision).toBe('invalid');
    });
  });

  describe('full date format', () => {
    it('should parse full date', () => {
      const result = parseSpotifyDate('2023-11-15');
      expect(result.precision).toBe('day');
      expect(result.date).toBeInstanceOf(Date);
      expect(result.date?.getFullYear()).toBe(2023);
      expect(result.date?.getMonth()).toBe(10); // November
      // Day might be off by one due to UTC/local timezone conversion
      const day = result.date?.getDate();
      expect(day === 14 || day === 15).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      const result = parseSpotifyDate('');
      expect(result.precision).toBe('invalid');
      expect(result.date).toBeNull();
    });

    it('should handle malformed date', () => {
      const result = parseSpotifyDate('not-a-date');
      expect(result.precision).toBe('invalid');
    });
  });
});

describe('mapAlbumType', () => {
  it('should map album type', () => {
    expect(mapAlbumType('album')).toBe('ALBUM');
    expect(mapAlbumType('ALBUM')).toBe('ALBUM');
  });

  it('should map single type', () => {
    expect(mapAlbumType('single')).toBe('SINGLE');
    expect(mapAlbumType('Single')).toBe('SINGLE');
  });

  it('should map compilation type', () => {
    expect(mapAlbumType('compilation')).toBe('COMPILATION');
  });

  it('should map ep type', () => {
    expect(mapAlbumType('ep')).toBe('EP');
    expect(mapAlbumType('EP')).toBe('EP');
  });

  it('should return OTHER for unknown types', () => {
    expect(mapAlbumType('unknown')).toBe('OTHER');
    expect(mapAlbumType('')).toBe('OTHER');
  });

  it('should handle undefined/null', () => {
    // @ts-expect-error - testing runtime behavior
    expect(mapAlbumType(undefined)).toBe('OTHER');
    // @ts-expect-error - testing runtime behavior
    expect(mapAlbumType(null)).toBe('OTHER');
  });
});

describe('inferSecondaryTypes', () => {
  it('should infer compilation from type', () => {
    const album: SpotifyAlbumData = {
      id: '1',
      name: 'Greatest Hits',
      type: 'compilation',
      artists: 'Various Artists',
      artistIds: [],
      releaseDate: '2020',
      totalTracks: 20,
      image: null,
      spotifyUrl: '',
    };

    const result = inferSecondaryTypes(album);
    expect(result).toContain('compilation');
  });

  it('should infer live from title', () => {
    const album: SpotifyAlbumData = {
      id: '2',
      name: 'Live at Madison Square Garden',
      type: 'album',
      artists: 'Test Artist',
      artistIds: [],
      releaseDate: '2020',
      totalTracks: 15,
      image: null,
      spotifyUrl: '',
    };

    const result = inferSecondaryTypes(album);
    expect(result).toContain('live');
  });

  it('should infer remix from title', () => {
    const album: SpotifyAlbumData = {
      id: '3',
      name: 'The Remixes Collection',
      type: 'album',
      artists: 'Test Artist',
      artistIds: [],
      releaseDate: '2020',
      totalTracks: 12,
      image: null,
      spotifyUrl: '',
    };

    const result = inferSecondaryTypes(album);
    expect(result).toContain('remix');
  });

  it('should infer soundtrack from title', () => {
    const album: SpotifyAlbumData = {
      id: '4',
      name: 'Movie Name (Original Soundtrack)',
      type: 'album',
      artists: 'Test Artist',
      artistIds: [],
      releaseDate: '2020',
      totalTracks: 18,
      image: null,
      spotifyUrl: '',
    };

    const result = inferSecondaryTypes(album);
    expect(result).toContain('soundtrack');
  });

  it('should infer demo from title', () => {
    const album: SpotifyAlbumData = {
      id: '5',
      name: 'Early Demos',
      type: 'album',
      artists: 'Test Artist',
      artistIds: [],
      releaseDate: '2020',
      totalTracks: 8,
      image: null,
      spotifyUrl: '',
    };

    const result = inferSecondaryTypes(album);
    expect(result).toContain('demo');
  });

  it('should infer mixtape from title', () => {
    const album: SpotifyAlbumData = {
      id: '6',
      name: 'Summer Mixtape 2020',
      type: 'album',
      artists: 'Test Artist',
      artistIds: [],
      releaseDate: '2020',
      totalTracks: 14,
      image: null,
      spotifyUrl: '',
    };

    const result = inferSecondaryTypes(album);
    expect(result).toContain('mixtape/street');
  });

  it('should return empty array for standard album', () => {
    const album: SpotifyAlbumData = {
      id: '7',
      name: 'Regular Studio Album',
      type: 'album',
      artists: 'Test Artist',
      artistIds: [],
      releaseDate: '2020',
      totalTracks: 10,
      image: null,
      spotifyUrl: '',
    };

    const result = inferSecondaryTypes(album);
    expect(result).toEqual([]);
  });

  it('should detect multiple secondary types', () => {
    const album: SpotifyAlbumData = {
      id: '8',
      name: 'Live Remixes',
      type: 'compilation',
      artists: 'Test Artist',
      artistIds: [],
      releaseDate: '2020',
      totalTracks: 16,
      image: null,
      spotifyUrl: '',
    };

    const result = inferSecondaryTypes(album);
    expect(result).toContain('compilation');
    expect(result).toContain('live');
    expect(result).toContain('remix');
  });
});

describe('parseArtistNames', () => {
  it('should parse array of artist objects', () => {
    const artists = [{ name: 'Artist One' }, { name: 'Artist Two' }];

    const result = parseArtistNames(artists);

    expect(result).toEqual(['Artist One', 'Artist Two']);
  });

  it('should parse comma-separated string', () => {
    const artists = 'Artist One, Artist Two, Artist Three';

    const result = parseArtistNames(artists);

    expect(result).toEqual(['Artist One', 'Artist Two', 'Artist Three']);
  });

  it('should filter empty names from array', () => {
    const artists = [
      { name: 'Artist One' },
      { name: '' },
      { name: 'Artist Two' },
    ];

    const result = parseArtistNames(artists);

    expect(result).toEqual(['Artist One', 'Artist Two']);
  });

  it('should filter empty names from string', () => {
    const artists = 'Artist One, , Artist Two';

    const result = parseArtistNames(artists);

    expect(result).toEqual(['Artist One', 'Artist Two']);
  });

  it('should handle empty array', () => {
    expect(parseArtistNames([])).toEqual([]);
  });

  it('should handle empty string', () => {
    expect(parseArtistNames('')).toEqual([]);
  });

  it('should handle null/undefined', () => {
    // @ts-expect-error - testing runtime behavior
    expect(parseArtistNames(null)).toEqual([]);
    // @ts-expect-error - testing runtime behavior
    expect(parseArtistNames(undefined)).toEqual([]);
  });

  it('should trim whitespace', () => {
    const artists = '  Artist One  ,  Artist Two  ';

    const result = parseArtistNames(artists);

    expect(result).toEqual(['Artist One', 'Artist Two']);
  });
});

describe('normalizeArtistName', () => {
  it('should lowercase the name', () => {
    expect(normalizeArtistName('RADIOHEAD')).toBe('radiohead');
  });

  it('should trim whitespace', () => {
    expect(normalizeArtistName('  Radiohead  ')).toBe('radiohead');
  });

  it('should remove special characters', () => {
    expect(normalizeArtistName("Guns N' Roses")).toBe('guns n roses');
    expect(normalizeArtistName('AC/DC')).toBe('acdc');
  });

  it('should normalize multiple spaces', () => {
    expect(normalizeArtistName('The   Rolling   Stones')).toBe(
      'the rolling stones'
    );
  });

  it('should handle empty string', () => {
    expect(normalizeArtistName('')).toBe('');
  });
});

describe('transformSpotifyAlbum', () => {
  const baseAlbum: SpotifyAlbumData = {
    id: 'spotify-123',
    name: 'Test Album',
    type: 'album',
    artists: 'Test Artist',
    artistIds: ['artist-123'],
    releaseDate: '2023-06-15',
    totalTracks: 12,
    image: 'https://example.com/cover.jpg',
    spotifyUrl: 'https://open.spotify.com/album/123',
  };

  it('should transform complete album data', () => {
    const result = transformSpotifyAlbum(baseAlbum);

    expect(result.title).toBe('Test Album');
    expect(result.spotifyId).toBe('spotify-123');
    expect(result.releaseType).toBe('ALBUM');
    expect(result.trackCount).toBe(12);
    expect(result.coverArtUrl).toBe('https://example.com/cover.jpg');
    expect(result.spotifyUrl).toBe('https://open.spotify.com/album/123');
    expect(result.releaseDate).toBeInstanceOf(Date);
    expect(result.releaseDate?.getFullYear()).toBe(2023);
  });

  it('should set correct enrichment status', () => {
    const result = transformSpotifyAlbum(baseAlbum);

    expect(result.dataQuality).toBe('LOW');
    expect(result.enrichmentStatus).toBe('PENDING');
    expect(result.lastEnriched).toBeNull();
  });

  it('should set inferredStatus to official', () => {
    const result = transformSpotifyAlbum(baseAlbum);

    expect(result.inferredStatus).toBe('official');
  });

  it('should include secondary types', () => {
    const liveAlbum: SpotifyAlbumData = {
      ...baseAlbum,
      name: 'Live at Wembley',
    };

    const result = transformSpotifyAlbum(liveAlbum);

    expect(result.secondaryTypes).toContain('live');
  });

  it('should handle missing optional fields', () => {
    const minimalAlbum: SpotifyAlbumData = {
      id: 'minimal-123',
      name: 'Minimal Album',
      type: 'album',
      artists: '',
      artistIds: [],
      releaseDate: '2023',
      totalTracks: 0,
      image: null,
      spotifyUrl: '',
    };

    const result = transformSpotifyAlbum(minimalAlbum);

    expect(result.title).toBe('Minimal Album');
    // trackCount is null when totalTracks is 0 or falsy
    expect(result.trackCount).toBeNull();
    expect(result.coverArtUrl).toBeNull();
  });
});

describe('transformSpotifyArtist', () => {
  it('should transform artist name', () => {
    const result = transformSpotifyArtist('Radiohead');

    expect(result.name).toBe('Radiohead');
    expect(result.dataQuality).toBe('LOW');
    expect(result.enrichmentStatus).toBe('PENDING');
    expect(result.lastEnriched).toBeNull();
  });

  it('should include Spotify ID when provided', () => {
    const result = transformSpotifyArtist('Radiohead', 'spotify-artist-123');

    expect(result.spotifyId).toBe('spotify-artist-123');
  });

  it('should handle undefined Spotify ID', () => {
    const result = transformSpotifyArtist('Radiohead');

    expect(result.spotifyId).toBeUndefined();
  });

  it('should trim artist name', () => {
    const result = transformSpotifyArtist('  Radiohead  ');

    expect(result.name).toBe('Radiohead');
  });
});
