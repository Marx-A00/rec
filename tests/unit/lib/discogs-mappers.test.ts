import { describe, it, expect } from 'vitest';

import {
  mapDiscogsMasterToAlbum,
  mapDiscogsReleaseToAlbum,
} from '@/lib/discogs/mappers';
import type { DiscogsMaster } from '@/types/discogs/master';
import type { DiscogsRelease } from '@/types/discogs/release';

describe('mapDiscogsMasterToAlbum', () => {
  const baseMaster: DiscogsMaster = {
    id: 123456,
    title: 'OK Computer',
    year: 1997,
    artists: [
      {
        id: 3840,
        name: 'Radiohead',
        anv: '',
        join: '',
        role: '',
        tracks: '',
        resource_url: 'https://api.discogs.com/artists/3840',
        thumbnail_url: '',
      },
    ],
    genres: ['Electronic', 'Rock'],
    styles: ['Alternative Rock', 'Art Rock'],
    tracklist: [
      { position: '1', type_: 'track', title: 'Airbag', duration: '4:44' },
      {
        position: '2',
        type_: 'track',
        title: 'Paranoid Android',
        duration: '6:23',
      },
      {
        position: '3',
        type_: 'track',
        title: 'Subterranean Homesick Alien',
        duration: '4:27',
      },
    ],
    images: [
      {
        type: 'primary',
        uri: 'https://example.com/cover.jpg',
        resource_url: 'https://example.com/cover.jpg',
        uri150: 'https://example.com/cover150.jpg',
        width: 600,
        height: 600,
      },
    ],
    uri: '/masters/123456',
    resource_url: 'https://api.discogs.com/masters/123456',
    main_release: 0,
    most_recent_release: 0,
    versions_url: '',
    main_release_url: '',
    most_recent_release_url: '',
    num_for_sale: 0,
    lowest_price: null,
    data_quality: 'Correct',
    videos: [],
  };

  it('should map basic album properties', () => {
    const result = mapDiscogsMasterToAlbum(baseMaster);

    expect(result.id).toBe('123456');
    expect(result.title).toBe('OK Computer');
    expect(result.source).toBe('discogs');
    expect(result.year).toBe(1997);
    expect(result.releaseDate).toBe('1997');
  });

  it('should map artists correctly', () => {
    const result = mapDiscogsMasterToAlbum(baseMaster);

    expect(result.artists).toHaveLength(1);
    expect(result.artists[0].id).toBe('3840');
    expect(result.artists[0].name).toBe('Radiohead');
    expect(result.artists[0].resourceUrl).toBe(
      'https://api.discogs.com/artists/3840'
    );
  });

  it('should map genres', () => {
    const result = mapDiscogsMasterToAlbum(baseMaster);

    expect(result.genre).toEqual(['Electronic', 'Rock']);
  });

  it('should map tracks with duration conversion', () => {
    const result = mapDiscogsMasterToAlbum(baseMaster);

    expect(result.tracks).toHaveLength(3);

    // Track 1: 4:44 = 4*60 + 44 = 284 seconds
    expect(result.tracks![0].title).toBe('Airbag');
    expect(result.tracks![0].duration).toBe(284);
    expect(result.tracks![0].trackNumber).toBe(1);

    // Track 2: 6:23 = 6*60 + 23 = 383 seconds
    expect(result.tracks![1].title).toBe('Paranoid Android');
    expect(result.tracks![1].duration).toBe(383);
    expect(result.tracks![1].trackNumber).toBe(2);
  });

  it('should calculate total duration in metadata', () => {
    const result = mapDiscogsMasterToAlbum(baseMaster);

    // 284 + 383 + 267 = 934 seconds
    expect(result.metadata!.totalDuration).toBe(934);
    expect(result.metadata!.numberOfTracks).toBe(3);
  });

  it('should map image', () => {
    const result = mapDiscogsMasterToAlbum(baseMaster);

    expect(result.image.url).toBe('https://example.com/cover.jpg');
    expect(result.image.width).toBe(600);
    expect(result.image.height).toBe(600);
    expect(result.image.alt).toBe('OK Computer cover');
  });

  it('should use placeholder when no image', () => {
    const masterNoImage: DiscogsMaster = {
      ...baseMaster,
      images: [],
    };

    const result = mapDiscogsMasterToAlbum(masterNoImage);

    expect(result.image.url).toContain('placeholder');
  });

  it('should preserve Discogs metadata', () => {
    const result = mapDiscogsMasterToAlbum(baseMaster) as {
      _discogs?: { type: string; uri: string };
      master_id?: number;
    };

    expect(result._discogs?.type).toBe('master');
    expect(result._discogs?.uri).toBe('/masters/123456');
    expect(result.master_id).toBe(123456);
  });

  it('should handle missing year', () => {
    const masterNoYear: DiscogsMaster = {
      ...baseMaster,
      year: undefined as unknown as number,
    };

    const result = mapDiscogsMasterToAlbum(masterNoYear);

    expect(result.releaseDate).toBe('');
    expect(result.year).toBeUndefined();
  });

  it('should handle empty tracklist', () => {
    const masterNoTracks: DiscogsMaster = {
      ...baseMaster,
      tracklist: [],
    };

    const result = mapDiscogsMasterToAlbum(masterNoTracks);

    expect(result.tracks).toEqual([]);
    expect(result.metadata!.totalDuration).toBe(0);
    expect(result.metadata!.numberOfTracks).toBe(0);
  });

  it('should set format to Digital for masters', () => {
    const result = mapDiscogsMasterToAlbum(baseMaster);

    expect(result.metadata!.format).toBe('Digital');
  });

  it('should set empty label for masters', () => {
    const result = mapDiscogsMasterToAlbum(baseMaster);

    // Masters don't have labels, only releases do
    expect(result.label).toBe('');
  });

  it('should handle track with no duration', () => {
    const masterEmptyDuration: DiscogsMaster = {
      ...baseMaster,
      tracklist: [
        {
          position: '1',
          type_: 'track',
          title: 'Unknown Duration',
          duration: '',
        },
      ],
    };

    const result = mapDiscogsMasterToAlbum(masterEmptyDuration);

    expect(result.tracks![0].duration).toBe(0);
  });

  it('should handle multiple artists', () => {
    const masterMultiArtist: DiscogsMaster = {
      ...baseMaster,
      artists: [
        {
          id: 1,
          name: 'Artist One',
          anv: '',
          join: '',
          role: '',
          tracks: '',
          resource_url: 'url1',
          thumbnail_url: '',
        },
        {
          id: 2,
          name: 'Artist Two',
          anv: 'A2',
          join: '',
          role: 'featuring',
          tracks: '',
          resource_url: 'url2',
          thumbnail_url: '',
        },
      ],
    };

    const result = mapDiscogsMasterToAlbum(masterMultiArtist);

    expect(result.artists).toHaveLength(2);
    expect(result.artists[1].anv).toBe('A2');
    expect(result.artists[1].role).toBe('featuring');
  });
});

describe('mapDiscogsReleaseToAlbum', () => {
  const baseRelease: DiscogsRelease = {
    id: 789012,
    title: 'Kid A',
    year: 2000,
    released: '2000-10-02',
    released_formatted: 'Oct 2, 2000',
    artists: [
      {
        id: 3840,
        name: 'Radiohead',
        anv: '',
        join: '',
        role: '',
        tracks: '',
        resource_url: 'https://api.discogs.com/artists/3840',
        thumbnail_url: '',
      },
    ],
    genres: ['Electronic', 'Rock'],
    styles: ['Experimental', 'IDM'],
    tracklist: [
      {
        position: '1',
        type_: 'track',
        title: 'Everything In Its Right Place',
        duration: '4:11',
      },
      { position: '2', type_: 'track', title: 'Kid A', duration: '4:44' },
    ],
    images: [
      {
        type: 'primary',
        uri: 'https://example.com/small.jpg',
        resource_url: 'https://example.com/small.jpg',
        uri150: 'https://example.com/small150.jpg',
        width: 150,
        height: 150,
      },
      {
        type: 'secondary',
        uri: 'https://example.com/large.jpg',
        resource_url: 'https://example.com/large.jpg',
        uri150: 'https://example.com/large150.jpg',
        width: 600,
        height: 600,
      },
    ],
    labels: [
      {
        id: 1,
        name: 'Parlophone',
        catno: '7243 5 29590 2 1',
        entity_type: '',
        entity_type_name: '',
        resource_url: '',
      },
      {
        id: 2,
        name: 'Capitol Records',
        catno: 'CDP 7243 5 29590 2 1',
        entity_type: '',
        entity_type_name: '',
        resource_url: '',
      },
    ],
    formats: [{ name: 'CD', qty: '1', descriptions: ['Album', 'Enhanced'] }],
    uri: '/releases/789012',
    resource_url: 'https://api.discogs.com/releases/789012',
    master_id: 123456,
    master_url: null,
    series: [],
    companies: [],
    data_quality: 'Correct',
    community: {
      want: 0,
      have: 0,
      rating: { count: 0, average: 0 },
      submitter: { username: '', resource_url: '' },
      contributors: [],
      data_quality: 'Correct',
      status: 'Accepted',
    },
    date_added: '',
    date_changed: '',
    estimated_weight: 0,
    extraartists: [],
    lowest_price: null,
    notes: '',
    num_for_sale: 0,
    status: 'Accepted',
    videos: [],
  };

  it('should map basic release properties', () => {
    const result = mapDiscogsReleaseToAlbum(baseRelease);

    expect(result.id).toBe('789012');
    expect(result.title).toBe('Kid A');
    expect(result.source).toBe('discogs');
    expect(result.year).toBe(2000);
    expect(result.releaseDate).toBe('2000-10-02');
  });

  it('should prefer larger images', () => {
    const result = mapDiscogsReleaseToAlbum(baseRelease);

    // Should pick the 600x600 image, not the 150x150
    expect(result.image.url).toBe('https://example.com/large.jpg');
    expect(result.image.width).toBe(600);
    expect(result.image.height).toBe(600);
  });

  it('should map labels', () => {
    const result = mapDiscogsReleaseToAlbum(baseRelease);

    expect(result.label).toBe('Parlophone, Capitol Records');
  });

  it('should map format with descriptions', () => {
    const result = mapDiscogsReleaseToAlbum(baseRelease);

    expect(result.metadata!.format).toBe('CD (Album, Enhanced)');
  });

  it('should preserve master_id', () => {
    const result = mapDiscogsReleaseToAlbum(baseRelease) as {
      master_id?: number;
    };

    expect(result.master_id).toBe(123456);
  });

  it('should preserve Discogs metadata as release type', () => {
    const result = mapDiscogsReleaseToAlbum(baseRelease) as {
      _discogs?: { type: string };
    };

    expect(result._discogs?.type).toBe('release');
  });

  it('should handle release without master_id', () => {
    const releaseNoMaster: DiscogsRelease = {
      ...baseRelease,
      master_id: null,
    };

    const result = mapDiscogsReleaseToAlbum(releaseNoMaster) as {
      master_id?: number | null;
    };

    expect(result.master_id).toBeNull();
  });

  it('should handle missing labels', () => {
    const releaseNoLabels: DiscogsRelease = {
      ...baseRelease,
      labels: [],
    };

    const result = mapDiscogsReleaseToAlbum(releaseNoLabels);

    expect(result.label).toBe('');
  });

  it('should handle missing formats', () => {
    const releaseNoFormats: DiscogsRelease = {
      ...baseRelease,
      formats: [],
    };

    const result = mapDiscogsReleaseToAlbum(releaseNoFormats);

    expect(result.metadata!.format).toBe('Unknown');
  });

  it('should use year as fallback for releaseDate', () => {
    const releaseNoDate: DiscogsRelease = {
      ...baseRelease,
      released: '',
    };

    const result = mapDiscogsReleaseToAlbum(releaseNoDate);

    expect(result.releaseDate).toBe('2000');
  });

  it('should map multiple formats', () => {
    const releaseMultiFormat: DiscogsRelease = {
      ...baseRelease,
      formats: [
        { name: 'Vinyl', qty: '2', descriptions: ['LP', '180g'] },
        { name: 'CD', qty: '1', descriptions: ['Album'] },
      ],
    };

    const result = mapDiscogsReleaseToAlbum(releaseMultiFormat);

    expect(result.metadata!.format).toBe('Vinyl (LP, 180g), CD (Album)');
  });

  it('should handle format without descriptions', () => {
    const releaseSimpleFormat: DiscogsRelease = {
      ...baseRelease,
      formats: [{ name: 'CD', qty: '1' }],
    };

    const result = mapDiscogsReleaseToAlbum(releaseSimpleFormat);

    expect(result.metadata!.format).toBe('CD');
  });
});

describe('duration conversion', () => {
  it('should correctly convert various duration formats', () => {
    // Test via mapDiscogsMasterToAlbum since convertDurationToSeconds is private
    const testCases: DiscogsMaster = {
      id: 1,
      title: 'Test',
      year: 2020,
      artists: [
        {
          id: 1,
          name: 'Artist',
          anv: '',
          join: '',
          role: '',
          tracks: '',
          resource_url: '',
          thumbnail_url: '',
        },
      ],
      tracklist: [
        { position: '1', type_: 'track', title: '1 minute', duration: '1:00' },
        { position: '2', type_: 'track', title: '2:30', duration: '2:30' },
        { position: '3', type_: 'track', title: '10 min', duration: '10:00' },
        {
          position: '4',
          type_: 'track',
          title: 'Long track',
          duration: '59:59',
        },
      ],
      main_release: 0,
      most_recent_release: 0,
      resource_url: '',
      uri: '',
      versions_url: '',
      main_release_url: '',
      most_recent_release_url: '',
      num_for_sale: 0,
      lowest_price: null,
      images: [],
      data_quality: 'Correct',
      videos: [],
    };

    const result = mapDiscogsMasterToAlbum(testCases);

    expect(result.tracks![0].duration).toBe(60); // 1:00
    expect(result.tracks![1].duration).toBe(150); // 2:30
    expect(result.tracks![2].duration).toBe(600); // 10:00
    expect(result.tracks![3].duration).toBe(3599); // 59:59
  });
});
