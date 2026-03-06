import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// Mock setup
// ============================================================================

const mockCuratedChallengeFindFirst = vi.fn();
const mockCuratedChallengeCount = vi.fn();
const mockCuratedChallengeFindMany = vi.fn();
const mockUncoverChallengeFindMany = vi.fn();
const mockAppConfigFindUnique = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    curatedChallenge: {
      findFirst: (...args: unknown[]) => mockCuratedChallengeFindFirst(...args),
      count: (...args: unknown[]) => mockCuratedChallengeCount(...args),
      findMany: (...args: unknown[]) => mockCuratedChallengeFindMany(...args),
    },
    uncoverChallenge: {
      findMany: (...args: unknown[]) => mockUncoverChallengeFindMany(...args),
    },
    appConfig: {
      findUnique: (...args: unknown[]) => mockAppConfigFindUnique(...args),
    },
  },
}));

vi.mock('@/lib/daily-challenge/date-utils', () => ({
  GAME_EPOCH: new Date('2026-01-01T00:00:00Z'),
  toUTCMidnight: (d: Date) => d,
}));

// Import after mocks
import {
  selectAlbumForDate,
  NoCuratedAlbumsError,
  PoolExhaustedError,
} from '@/lib/daily-challenge/selection-service';

// ============================================================================
// Helpers
// ============================================================================

const TEST_DATE = new Date('2026-02-10T00:00:00Z');

/** Set up default settings (RANDOM + AUTO_RESET) */
function setupSettings(
  selectionMode: 'RANDOM' | 'FIFO' = 'RANDOM',
  poolExhaustedMode: 'AUTO_RESET' | 'STOP' = 'AUTO_RESET'
) {
  mockAppConfigFindUnique.mockResolvedValue({
    uncoverSelectionMode: selectionMode,
    uncoverPoolExhaustedMode: poolExhaustedMode,
  });
}

/** Set up curated albums pool with given IDs */
function setupCuratedPool(albumIds: string[]) {
  mockCuratedChallengeCount.mockResolvedValue(albumIds.length);
  mockCuratedChallengeFindMany.mockResolvedValue(
    albumIds.map(albumId => ({ albumId }))
  );
}

/** Set up used albums (already in uncover_challenges) */
function setupUsedAlbums(albumIds: string[]) {
  mockUncoverChallengeFindMany.mockResolvedValue(
    albumIds.map(albumId => ({ albumId }))
  );
}

// ============================================================================
// Tests
// ============================================================================

describe('selectAlbumForDate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Defaults: no pinned album, no used albums, RANDOM + AUTO_RESET
    mockCuratedChallengeFindFirst.mockResolvedValue(null);
    mockUncoverChallengeFindMany.mockResolvedValue([]);
    setupSettings('RANDOM', 'AUTO_RESET');
  });

  // --------------------------------------------------------------------------
  // 1. Pinned album override
  // --------------------------------------------------------------------------

  describe('pinned album override', () => {
    it('returns pinned album when one exists for the date', async () => {
      mockCuratedChallengeFindFirst.mockResolvedValueOnce({
        albumId: 'pinned-album-id',
      });

      const result = await selectAlbumForDate(TEST_DATE);

      expect(result).toBe('pinned-album-id');
      // Should not query count or pool at all
      expect(mockCuratedChallengeCount).not.toHaveBeenCalled();
      expect(mockCuratedChallengeFindMany).not.toHaveBeenCalled();
    });

    it('queries pinnedDate with the normalized date', async () => {
      mockCuratedChallengeFindFirst.mockResolvedValueOnce({
        albumId: 'pinned-album-id',
      });

      await selectAlbumForDate(TEST_DATE);

      expect(mockCuratedChallengeFindFirst).toHaveBeenCalledWith({
        where: { pinnedDate: TEST_DATE },
        select: { albumId: true },
      });
    });
  });

  // --------------------------------------------------------------------------
  // 2. FIFO selection from unused pool
  // --------------------------------------------------------------------------

  describe('FIFO selection', () => {
    it('picks the oldest unused album (first in pool order)', async () => {
      setupSettings('FIFO');
      setupCuratedPool(['album-a', 'album-b', 'album-c']);
      // album-a already used, so unused = [album-b, album-c]
      setupUsedAlbums(['album-a']);

      // findMany for unused will filter and return ordered by createdAt
      // We need to mock the "unused" query specifically
      mockCuratedChallengeFindMany.mockResolvedValueOnce(
        // First call: unused albums query (notIn used)
        [{ albumId: 'album-b' }, { albumId: 'album-c' }]
      );
      mockUncoverChallengeFindMany.mockResolvedValue([{ albumId: 'album-a' }]);

      const result = await selectAlbumForDate(TEST_DATE);

      expect(result).toBe('album-b'); // oldest unused
    });
  });

  // --------------------------------------------------------------------------
  // 3. Random selection from unused pool
  // --------------------------------------------------------------------------

  describe('random selection', () => {
    it('picks an album from the unused pool', async () => {
      setupSettings('RANDOM');
      mockCuratedChallengeCount.mockResolvedValue(3);
      mockUncoverChallengeFindMany.mockResolvedValue([{ albumId: 'album-a' }]);
      // Unused albums query returns album-b, album-c
      mockCuratedChallengeFindMany.mockResolvedValueOnce([
        { albumId: 'album-b' },
        { albumId: 'album-c' },
      ]);

      const result = await selectAlbumForDate(TEST_DATE);

      expect(['album-b', 'album-c']).toContain(result);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Empty curated list
  // --------------------------------------------------------------------------

  describe('empty curated list', () => {
    it('throws NoCuratedAlbumsError when count is 0', async () => {
      mockCuratedChallengeCount.mockResolvedValue(0);

      await expect(selectAlbumForDate(TEST_DATE)).rejects.toThrow(
        NoCuratedAlbumsError
      );
    });

    it('throws with descriptive message', async () => {
      mockCuratedChallengeCount.mockResolvedValue(0);

      await expect(selectAlbumForDate(TEST_DATE)).rejects.toThrow(
        'No curated albums available'
      );
    });
  });

  // --------------------------------------------------------------------------
  // 5. Pool exhausted — AUTO_RESET mode
  // --------------------------------------------------------------------------

  describe('pool exhausted with AUTO_RESET', () => {
    it('picks from full pool when all albums have been used', async () => {
      setupSettings('FIFO', 'AUTO_RESET');
      mockCuratedChallengeCount.mockResolvedValue(2);
      // All albums used
      mockUncoverChallengeFindMany.mockResolvedValue([
        { albumId: 'album-a' },
        { albumId: 'album-b' },
      ]);
      // Unused query returns empty
      mockCuratedChallengeFindMany
        .mockResolvedValueOnce([]) // unused = empty
        .mockResolvedValueOnce([
          // full pool fallback
          { albumId: 'album-a' },
          { albumId: 'album-b' },
        ]);

      const result = await selectAlbumForDate(TEST_DATE);

      expect(result).toBe('album-a'); // FIFO picks first from full pool
    });

    it('uses random when mode is RANDOM even in reset', async () => {
      setupSettings('RANDOM', 'AUTO_RESET');
      mockCuratedChallengeCount.mockResolvedValue(2);
      mockUncoverChallengeFindMany.mockResolvedValue([
        { albumId: 'album-a' },
        { albumId: 'album-b' },
      ]);
      mockCuratedChallengeFindMany
        .mockResolvedValueOnce([]) // unused = empty
        .mockResolvedValueOnce([
          // full pool fallback
          { albumId: 'album-a' },
          { albumId: 'album-b' },
        ]);

      const result = await selectAlbumForDate(TEST_DATE);

      expect(['album-a', 'album-b']).toContain(result);
    });
  });

  // --------------------------------------------------------------------------
  // 6. Pool exhausted — STOP mode
  // --------------------------------------------------------------------------

  describe('pool exhausted with STOP', () => {
    it('throws PoolExhaustedError when all albums used', async () => {
      setupSettings('RANDOM', 'STOP');
      mockCuratedChallengeCount.mockResolvedValue(2);
      mockUncoverChallengeFindMany.mockResolvedValue([
        { albumId: 'album-a' },
        { albumId: 'album-b' },
      ]);
      // Unused query returns empty
      mockCuratedChallengeFindMany.mockResolvedValueOnce([]);

      await expect(selectAlbumForDate(TEST_DATE)).rejects.toThrow(
        PoolExhaustedError
      );
    });

    it('throws with descriptive message', async () => {
      setupSettings('FIFO', 'STOP');
      mockCuratedChallengeCount.mockResolvedValue(1);
      mockUncoverChallengeFindMany.mockResolvedValue([{ albumId: 'album-a' }]);
      mockCuratedChallengeFindMany.mockResolvedValueOnce([]);

      await expect(selectAlbumForDate(TEST_DATE)).rejects.toThrow(
        'pool exhausted mode is set to STOP'
      );
    });
  });

  // --------------------------------------------------------------------------
  // 7. Single curated album
  // --------------------------------------------------------------------------

  describe('single curated album', () => {
    it('returns the only album when unused', async () => {
      setupSettings('RANDOM');
      mockCuratedChallengeCount.mockResolvedValue(1);
      mockUncoverChallengeFindMany.mockResolvedValue([]);
      mockCuratedChallengeFindMany.mockResolvedValueOnce([
        { albumId: 'only-album' },
      ]);

      const result = await selectAlbumForDate(TEST_DATE);

      expect(result).toBe('only-album');
    });

    it('uses auto-reset to return album again after it was used', async () => {
      setupSettings('RANDOM', 'AUTO_RESET');
      mockCuratedChallengeCount.mockResolvedValue(1);
      mockUncoverChallengeFindMany.mockResolvedValue([
        { albumId: 'only-album' },
      ]);
      mockCuratedChallengeFindMany
        .mockResolvedValueOnce([]) // unused = empty
        .mockResolvedValueOnce([{ albumId: 'only-album' }]); // full pool

      const result = await selectAlbumForDate(TEST_DATE);

      expect(result).toBe('only-album');
    });
  });

  // --------------------------------------------------------------------------
  // 8. Default settings fallback
  // --------------------------------------------------------------------------

  describe('default settings', () => {
    it('uses RANDOM + AUTO_RESET when no AppConfig exists', async () => {
      mockAppConfigFindUnique.mockResolvedValue(null);
      mockCuratedChallengeCount.mockResolvedValue(2);
      mockUncoverChallengeFindMany.mockResolvedValue([
        { albumId: 'album-a' },
        { albumId: 'album-b' },
      ]);
      mockCuratedChallengeFindMany
        .mockResolvedValueOnce([]) // unused = empty
        .mockResolvedValueOnce([
          // full pool (auto-reset kicks in)
          { albumId: 'album-a' },
          { albumId: 'album-b' },
        ]);

      // Should not throw (AUTO_RESET default), should pick from full pool
      const result = await selectAlbumForDate(TEST_DATE);
      expect(['album-a', 'album-b']).toContain(result);
    });
  });
});
