import { describe, it, expect } from 'vitest';

import {
  buildDualInputQuery,
  escapeLuceneSpecialChars,
  hasSearchableInput,
} from '@/lib/musicbrainz/query-builder';

describe('escapeLuceneSpecialChars', () => {
  it('should escape plus sign', () => {
    expect(escapeLuceneSpecialChars('C++')).toBe('C\\+\\+');
  });

  it('should escape minus sign', () => {
    expect(escapeLuceneSpecialChars('Half-Life')).toBe('Half\\-Life');
  });

  it('should escape ampersand', () => {
    expect(escapeLuceneSpecialChars('Tom & Jerry')).toBe('Tom \\& Jerry');
  });

  it('should escape parentheses', () => {
    expect(escapeLuceneSpecialChars('Album (Deluxe)')).toBe(
      'Album \\(Deluxe\\)'
    );
  });

  it('should escape quotes', () => {
    expect(escapeLuceneSpecialChars('The "Best" Album')).toBe(
      'The \\"Best\\" Album'
    );
  });

  it('should escape colon', () => {
    expect(escapeLuceneSpecialChars('Title: Subtitle')).toBe(
      'Title\\: Subtitle'
    );
  });

  it('should escape multiple special characters', () => {
    expect(escapeLuceneSpecialChars('AC/DC: Live!')).toBe('AC\\/DC\\: Live\\!');
  });

  it('should return unchanged string if no special chars', () => {
    expect(escapeLuceneSpecialChars('Normal Album Title')).toBe(
      'Normal Album Title'
    );
  });

  it('should handle empty string', () => {
    expect(escapeLuceneSpecialChars('')).toBe('');
  });
});

describe('buildDualInputQuery', () => {
  const FILTERS =
    'AND status:official AND NOT secondarytype:compilation AND NOT secondarytype:dj-mix';

  describe('both album and artist provided', () => {
    it('should build query with both fields', () => {
      const result = buildDualInputQuery('Random Access Memories', 'Daft Punk');
      expect(result).toBe(
        `releasegroup:"Random Access Memories" AND artist:"Daft Punk" ${FILTERS}`
      );
    });

    it('should trim whitespace from both inputs', () => {
      const result = buildDualInputQuery('  OK Computer  ', '  Radiohead  ');
      expect(result).toBe(
        `releasegroup:"OK Computer" AND artist:"Radiohead" ${FILTERS}`
      );
    });

    it('should escape special characters in both fields', () => {
      const result = buildDualInputQuery('Back in Black', 'AC/DC');
      expect(result).toBe(
        `releasegroup:"Back in Black" AND artist:"AC\\/DC" ${FILTERS}`
      );
    });
  });

  describe('album only provided', () => {
    it('should build query with album only', () => {
      const result = buildDualInputQuery('Discovery', undefined);
      expect(result).toBe(`releasegroup:"Discovery" ${FILTERS}`);
    });

    it('should work with empty string for artist', () => {
      const result = buildDualInputQuery('Discovery', '');
      expect(result).toBe(`releasegroup:"Discovery" ${FILTERS}`);
    });

    it('should work with whitespace-only artist', () => {
      const result = buildDualInputQuery('Discovery', '   ');
      expect(result).toBe(`releasegroup:"Discovery" ${FILTERS}`);
    });

    it('should trim album input', () => {
      const result = buildDualInputQuery('  The Dark Side of the Moon  ', '');
      expect(result).toBe(
        `releasegroup:"The Dark Side of the Moon" ${FILTERS}`
      );
    });

    it('should escape special characters in album', () => {
      const result = buildDualInputQuery('Abbey Road (Remaster)', '');
      expect(result).toBe(
        `releasegroup:"Abbey Road \\(Remaster\\)" ${FILTERS}`
      );
    });
  });

  describe('artist only provided', () => {
    it('should build query with artist only', () => {
      const result = buildDualInputQuery(undefined, 'Radiohead');
      expect(result).toBe(`artist:"Radiohead" ${FILTERS}`);
    });

    it('should work with empty string for album', () => {
      const result = buildDualInputQuery('', 'The Beatles');
      expect(result).toBe(`artist:"The Beatles" ${FILTERS}`);
    });

    it('should work with whitespace-only album', () => {
      const result = buildDualInputQuery('   ', 'Pink Floyd');
      expect(result).toBe(`artist:"Pink Floyd" ${FILTERS}`);
    });

    it('should trim artist input', () => {
      const result = buildDualInputQuery('', '  Led Zeppelin  ');
      expect(result).toBe(`artist:"Led Zeppelin" ${FILTERS}`);
    });

    it('should escape special characters in artist', () => {
      const result = buildDualInputQuery('', "Guns N' Roses");
      expect(result).toBe(`artist:"Guns N' Roses" ${FILTERS}`);
    });
  });

  describe('both empty', () => {
    it('should return empty string when both undefined', () => {
      const result = buildDualInputQuery(undefined, undefined);
      expect(result).toBe('');
    });

    it('should return empty string when both empty strings', () => {
      const result = buildDualInputQuery('', '');
      expect(result).toBe('');
    });

    it('should return empty string when both whitespace only', () => {
      const result = buildDualInputQuery('   ', '   ');
      expect(result).toBe('');
    });

    it('should return empty string when album is undefined and artist is empty', () => {
      const result = buildDualInputQuery(undefined, '');
      expect(result).toBe('');
    });

    it('should return empty string when album is empty and artist is undefined', () => {
      const result = buildDualInputQuery('', undefined);
      expect(result).toBe('');
    });
  });

  describe('edge cases', () => {
    it('should handle unicode characters', () => {
      const result = buildDualInputQuery('北京一夜', '信乐团');
      expect(result).toBe(
        `releasegroup:"北京一夜" AND artist:"信乐团" ${FILTERS}`
      );
    });

    it('should handle very long input strings', () => {
      const longAlbum = 'A'.repeat(200);
      const longArtist = 'B'.repeat(200);
      const result = buildDualInputQuery(longAlbum, longArtist);
      expect(result).toContain(`releasegroup:"${longAlbum}"`);
      expect(result).toContain(`artist:"${longArtist}"`);
    });

    it('should handle single character inputs', () => {
      const result = buildDualInputQuery('X', 'Y');
      expect(result).toBe(`releasegroup:"X" AND artist:"Y" ${FILTERS}`);
    });

    it('should include official status filter', () => {
      const result = buildDualInputQuery('Test Album', 'Test Artist');
      expect(result).toContain('status:official');
    });

    it('should exclude compilations', () => {
      const result = buildDualInputQuery('Test Album', 'Test Artist');
      expect(result).toContain('NOT secondarytype:compilation');
    });

    it('should exclude DJ mixes', () => {
      const result = buildDualInputQuery('Test Album', 'Test Artist');
      expect(result).toContain('NOT secondarytype:dj-mix');
    });
  });
});

describe('hasSearchableInput', () => {
  it('should return true when album has content', () => {
    expect(hasSearchableInput('Album Title', '')).toBe(true);
  });

  it('should return true when artist has content', () => {
    expect(hasSearchableInput('', 'Artist Name')).toBe(true);
  });

  it('should return true when both have content', () => {
    expect(hasSearchableInput('Album Title', 'Artist Name')).toBe(true);
  });

  it('should return false when both are empty', () => {
    expect(hasSearchableInput('', '')).toBe(false);
  });

  it('should return false when both are undefined', () => {
    expect(hasSearchableInput(undefined, undefined)).toBe(false);
  });

  it('should return false when both are whitespace only', () => {
    expect(hasSearchableInput('   ', '   ')).toBe(false);
  });

  it('should return true when album has content after trimming', () => {
    expect(hasSearchableInput('  Album  ', '   ')).toBe(true);
  });

  it('should return true when artist has content after trimming', () => {
    expect(hasSearchableInput('   ', '  Artist  ')).toBe(true);
  });
});
