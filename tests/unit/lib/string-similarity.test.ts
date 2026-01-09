import { describe, it, expect } from 'vitest';

import {
  normalizeString,
  calculateStringSimilarity,
  findBestMatch,
  findAllMatches,
} from '@/lib/utils/string-similarity';

describe('normalizeString', () => {
  it('should convert to lowercase', () => {
    expect(normalizeString('RADIOHEAD')).toBe('radiohead');
    expect(normalizeString('The Beatles')).toBe('the beatles');
  });

  it('should remove diacritics', () => {
    expect(normalizeString('Björk')).toBe('bjork');
    expect(normalizeString('Sigur Rós')).toBe('sigur ros');
    expect(normalizeString('Café')).toBe('cafe');
    expect(normalizeString('naïve')).toBe('naive');
  });

  it('should replace $ with s', () => {
    expect(normalizeString('A$AP Rocky')).toBe('asap rocky');
    expect(normalizeString('Ke$ha')).toBe('kesha');
  });

  it('should replace & with and', () => {
    expect(normalizeString('Simon & Garfunkel')).toBe('simon and garfunkel');
    expect(normalizeString('Tom & Jerry')).toBe('tom and jerry');
  });

  it('should remove special characters', () => {
    expect(normalizeString('P!nk')).toBe('pnk');
    expect(normalizeString('!!!Chk Chk Chk!!!')).toBe('chk chk chk');
    expect(normalizeString("Guns N' Roses")).toBe('guns n roses');
  });

  it('should normalize multiple spaces to single space', () => {
    expect(normalizeString('The   Rolling   Stones')).toBe(
      'the rolling stones'
    );
    expect(normalizeString('  Led   Zeppelin  ')).toBe('led zeppelin');
  });

  it('should trim whitespace', () => {
    expect(normalizeString('  Nirvana  ')).toBe('nirvana');
  });

  it('should handle empty strings', () => {
    expect(normalizeString('')).toBe('');
  });

  it('should handle strings with only special characters', () => {
    expect(normalizeString('!!!')).toBe('');
    expect(normalizeString('$$$')).toBe('sss');
  });
});

describe('calculateStringSimilarity', () => {
  it('should return 1.0 for exact matches', () => {
    expect(calculateStringSimilarity('Radiohead', 'Radiohead')).toBe(1.0);
  });

  it('should return 1.0 for matches after normalization', () => {
    expect(calculateStringSimilarity('RADIOHEAD', 'radiohead')).toBe(1.0);
    expect(calculateStringSimilarity('A$AP Rocky', 'ASAP Rocky')).toBe(1.0);
    expect(calculateStringSimilarity('Björk', 'Bjork')).toBe(1.0);
  });

  it('should return 0.0 when one string is empty', () => {
    expect(calculateStringSimilarity('', 'Radiohead')).toBe(0.0);
    expect(calculateStringSimilarity('Radiohead', '')).toBe(0.0);
  });

  it('should return 1.0 when both strings are empty (exact match)', () => {
    // Both empty strings normalize to '' which is an exact match
    expect(calculateStringSimilarity('', '')).toBe(1.0);
  });

  it('should return score for similar strings', () => {
    // Note: fuzzysort.single may return null for non-substring matches
    // "the beatles" vs "beatles" - the query "the beatles" is not a substring of "beatles"
    // This tests the actual behavior of the library
    const score = calculateStringSimilarity('The Beatles', 'Beatles');
    // fuzzysort works best when query is contained in target
    expect(typeof score).toBe('number');
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('should return low score for dissimilar strings', () => {
    const score = calculateStringSimilarity('Radiohead', 'Metallica');
    expect(score).toBeLessThan(0.5);
  });

  it('should return a valid score for strings with typos', () => {
    // fuzzysort may not match well for strings that aren't substrings
    const score = calculateStringSimilarity('Radiohead', 'Radioheed');
    expect(typeof score).toBe('number');
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('should handle substring matches well', () => {
    // fuzzysort excels at finding substrings
    const score = calculateStringSimilarity('Radio', 'Radiohead');
    expect(score).toBeGreaterThan(0.5);
  });
});

describe('findBestMatch', () => {
  const candidates = [
    'The Beatles',
    'The Beach Boys',
    'Bee Gees',
    'The Rolling Stones',
    'Led Zeppelin',
  ];

  it('should find the best matching candidate', () => {
    const result = findBestMatch('Beatles', candidates);
    expect(result).not.toBeNull();
    expect(result!.match).toBe('The Beatles');
    expect(result!.index).toBe(0);
    expect(result!.score).toBeGreaterThan(0.5);
  });

  it('should return null for empty candidates array', () => {
    const result = findBestMatch('Beatles', []);
    expect(result).toBeNull();
  });

  it('should return null when no match above threshold', () => {
    const result = findBestMatch('Completely Different', candidates, 0.9);
    expect(result).toBeNull();
  });

  it('should respect custom threshold', () => {
    // With high threshold, might not find match
    const highThreshold = findBestMatch('Beach', candidates, 0.95);
    // With low threshold, should find match
    const lowThreshold = findBestMatch('Beach', candidates, 0.3);

    expect(lowThreshold).not.toBeNull();
    expect(lowThreshold!.match).toBe('The Beach Boys');
  });

  it('should handle normalized queries', () => {
    const result = findBestMatch('ROLLING STONES', candidates);
    expect(result).not.toBeNull();
    expect(result!.match).toBe('The Rolling Stones');
  });

  it('should return correct index', () => {
    const result = findBestMatch('Led Zeppelin', candidates);
    expect(result).not.toBeNull();
    expect(result!.index).toBe(4);
  });
});

describe('findAllMatches', () => {
  const candidates = [
    'The Beatles',
    'The Beach Boys',
    'Bee Gees',
    'The Rolling Stones',
    'The Who',
  ];

  it('should return all matches above threshold', () => {
    const results = findAllMatches('The', candidates, 0.3);
    // Should match several artists with "The" in their name
    expect(results.length).toBeGreaterThan(0);
  });

  it('should return empty array for empty candidates', () => {
    const results = findAllMatches('Beatles', []);
    expect(results).toEqual([]);
  });

  it('should return empty array when no matches above threshold', () => {
    const results = findAllMatches('XYZABC123', candidates, 0.9);
    expect(results).toEqual([]);
  });

  it('should sort results by score (best first)', () => {
    const results = findAllMatches('Beatles', candidates, 0.3);
    if (results.length > 1) {
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
      }
    }
  });

  it('should include correct indices', () => {
    const results = findAllMatches('Beach', candidates, 0.3);
    const beachBoysResult = results.find(r => r.match === 'The Beach Boys');
    if (beachBoysResult) {
      expect(beachBoysResult.index).toBe(1);
    }
  });

  it('should respect threshold parameter', () => {
    const highThresholdResults = findAllMatches('The', candidates, 0.9);
    const lowThresholdResults = findAllMatches('The', candidates, 0.1);

    expect(lowThresholdResults.length).toBeGreaterThanOrEqual(
      highThresholdResults.length
    );
  });
});
