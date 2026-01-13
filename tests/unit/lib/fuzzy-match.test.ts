import { describe, it, expect } from 'vitest';

import {
  normalizeArtistName,
  getMatchConfidence,
  findLastFmMatch,
  findMultipleMatches,
} from '@/lib/utils/fuzzy-match';
import type { LastFmSearchResult } from '@/lib/lastfm/search';

describe('normalizeArtistName', () => {
  it('should convert to lowercase', () => {
    expect(normalizeArtistName('RADIOHEAD')).toBe('radiohead');
    expect(normalizeArtistName('The Beatles')).toBe('the beatles');
  });

  it('should remove diacritics', () => {
    expect(normalizeArtistName('Björk')).toBe('bjork');
    expect(normalizeArtistName('Sigur Rós')).toBe('sigur ros');
    expect(normalizeArtistName('Motörhead')).toBe('motorhead');
  });

  it('should replace $ with s', () => {
    expect(normalizeArtistName('A$AP Rocky')).toBe('asap rocky');
    expect(normalizeArtistName('Ke$ha')).toBe('kesha');
    expect(normalizeArtistName('$uicideboy$')).toBe('suicideboys');
  });

  it('should replace & with and', () => {
    expect(normalizeArtistName('Simon & Garfunkel')).toBe(
      'simon and garfunkel'
    );
    expect(normalizeArtistName('Crosby, Stills & Nash')).toBe(
      'crosby stills and nash'
    );
  });

  it('should remove special characters', () => {
    expect(normalizeArtistName('P!nk')).toBe('pnk');
    expect(normalizeArtistName("Guns N' Roses")).toBe('guns n roses');
  });

  it('should normalize multiple spaces', () => {
    expect(normalizeArtistName('The   Rolling   Stones')).toBe(
      'the rolling stones'
    );
  });

  it('should trim whitespace', () => {
    expect(normalizeArtistName('  Nirvana  ')).toBe('nirvana');
  });

  it('should handle empty strings', () => {
    expect(normalizeArtistName('')).toBe('');
  });
});

describe('getMatchConfidence', () => {
  it('should return high for scores >= -1000', () => {
    expect(getMatchConfidence(0)).toBe('high');
    expect(getMatchConfidence(-500)).toBe('high');
    expect(getMatchConfidence(-1000)).toBe('high');
  });

  it('should return medium for scores between -1001 and -3000', () => {
    expect(getMatchConfidence(-1001)).toBe('medium');
    expect(getMatchConfidence(-2000)).toBe('medium');
    expect(getMatchConfidence(-3000)).toBe('medium');
  });

  it('should return low for scores between -3001 and -5000', () => {
    expect(getMatchConfidence(-3001)).toBe('low');
    expect(getMatchConfidence(-4000)).toBe('low');
    expect(getMatchConfidence(-5000)).toBe('low');
  });

  it('should return none for scores < -5000', () => {
    expect(getMatchConfidence(-5001)).toBe('none');
    expect(getMatchConfidence(-10000)).toBe('none');
  });
});

describe('findLastFmMatch', () => {
  // Mock Last.fm search results
  const mockLastFmResults: LastFmSearchResult[] = [
    {
      name: 'Radiohead',
      mbid: 'mbid-1',
      listeners: 3000000,
      imageUrl: 'https://last.fm/image/radiohead.jpg',
    },
    {
      name: 'Radio Head',
      mbid: 'mbid-2',
      listeners: 1000,
      imageUrl: 'https://last.fm/image/radio-head.jpg',
    },
    {
      name: 'The Beatles',
      mbid: 'mbid-3',
      listeners: 5000000,
      imageUrl: 'https://last.fm/image/beatles.jpg',
    },
    {
      name: 'Björk',
      mbid: 'mbid-4',
      listeners: 2000000,
      imageUrl: 'https://last.fm/image/bjork.jpg',
    },
  ];

  it('should find exact match', () => {
    const result = findLastFmMatch('Radiohead', mockLastFmResults);
    expect(result).not.toBeNull();
    expect(result!.match.name).toBe('Radiohead');
    expect(result!.confidence).toBe('high');
  });

  it('should match case-insensitively', () => {
    const result = findLastFmMatch('RADIOHEAD', mockLastFmResults);
    expect(result).not.toBeNull();
    expect(result!.match.name).toBe('Radiohead');
  });

  it('should match with diacritics normalized', () => {
    const result = findLastFmMatch('Bjork', mockLastFmResults);
    expect(result).not.toBeNull();
    expect(result!.match.name).toBe('Björk');
  });

  it('should return null for empty results array', () => {
    const result = findLastFmMatch('Radiohead', []);
    expect(result).toBeNull();
  });

  it('should return null for null/undefined results', () => {
    // @ts-expect-error - testing runtime behavior
    expect(findLastFmMatch('Radiohead', null)).toBeNull();
    // @ts-expect-error - testing runtime behavior
    expect(findLastFmMatch('Radiohead', undefined)).toBeNull();
  });

  it('should return null when no acceptable match found', () => {
    const result = findLastFmMatch(
      'Completely Different Artist',
      mockLastFmResults
    );
    expect(result).toBeNull();
  });

  it('should include score in result', () => {
    const result = findLastFmMatch('Radiohead', mockLastFmResults);
    expect(result).not.toBeNull();
    expect(typeof result!.score).toBe('number');
  });

  it('should prefer exact matches over partial matches', () => {
    const result = findLastFmMatch('Radiohead', mockLastFmResults);
    expect(result).not.toBeNull();
    // Should match "Radiohead" not "Radio Head"
    expect(result!.match.name).toBe('Radiohead');
  });
});

describe('findMultipleMatches', () => {
  const mockLastFmResults: LastFmSearchResult[] = [
    {
      name: 'Radiohead',
      mbid: 'mbid-1',
      listeners: 3000000,
      imageUrl: 'https://last.fm/image/radiohead.jpg',
    },
    {
      name: 'The Beatles',
      mbid: 'mbid-2',
      listeners: 5000000,
      imageUrl: 'https://last.fm/image/beatles.jpg',
    },
    {
      name: 'Nirvana',
      mbid: 'mbid-3',
      listeners: 4000000,
      imageUrl: 'https://last.fm/image/nirvana.jpg',
    },
  ];

  it('should return a Map with matches for each artist', () => {
    const artistNames = ['Radiohead', 'The Beatles'];
    const matches = findMultipleMatches(artistNames, mockLastFmResults);

    expect(matches).toBeInstanceOf(Map);
    expect(matches.size).toBe(2);
    expect(matches.get('Radiohead')).not.toBeNull();
    expect(matches.get('The Beatles')).not.toBeNull();
  });

  it('should return null for unmatched artists', () => {
    const artistNames = ['Radiohead', 'Unknown Artist XYZ'];
    const matches = findMultipleMatches(artistNames, mockLastFmResults);

    expect(matches.get('Radiohead')).not.toBeNull();
    expect(matches.get('Unknown Artist XYZ')).toBeNull();
  });

  it('should handle empty artist names array', () => {
    const matches = findMultipleMatches([], mockLastFmResults);
    expect(matches.size).toBe(0);
  });

  it('should handle empty lastFmResults array', () => {
    const artistNames = ['Radiohead', 'The Beatles'];
    const matches = findMultipleMatches(artistNames, []);

    expect(matches.size).toBe(2);
    expect(matches.get('Radiohead')).toBeNull();
    expect(matches.get('The Beatles')).toBeNull();
  });

  it('should preserve original artist name as key', () => {
    const artistNames = ['RADIOHEAD']; // uppercase
    const matches = findMultipleMatches(artistNames, mockLastFmResults);

    expect(matches.has('RADIOHEAD')).toBe(true);
    expect(matches.has('radiohead')).toBe(false);
  });
});
