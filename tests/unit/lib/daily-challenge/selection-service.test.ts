import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// Mock setup
// ============================================================================

const mockCuratedChallengeFindFirst = vi.fn();
const mockCuratedChallengeCount = vi.fn();
const mockCuratedChallengeFindUnique = vi.fn();
const mockUncoverChallengeFindMany = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    curatedChallenge: {
      findFirst: (...args: unknown[]) => mockCuratedChallengeFindFirst(...args),
      count: (...args: unknown[]) => mockCuratedChallengeCount(...args),
      findUnique: (...args: unknown[]) =>
        mockCuratedChallengeFindUnique(...args),
    },
    uncoverChallenge: {
      findMany: (...args: unknown[]) => mockUncoverChallengeFindMany(...args),
    },
  },
}));

// Mock date-utils so we can control getDaysSinceEpoch without worrying about
// real epoch arithmetic.  toUTCMidnight is left as pass-through (identity).
const mockGetDaysSinceEpoch = vi.fn();

vi.mock('@/lib/daily-challenge/date-utils', () => ({
  GAME_EPOCH: new Date('2026-01-01T00:00:00Z'),
  toUTCMidnight: (d: Date) => d, // pass-through for tests
  getDaysSinceEpoch: (...args: unknown[]) => mockGetDaysSinceEpoch(...args),
}));

// Import after mocks
import {
  selectAlbumForDate,
  NoCuratedAlbumsError,
  AlbumNotFoundError,
} from '@/lib/daily-challenge/selection-service';

// ============================================================================
// Helpers
// ============================================================================

/** Fixed test date — the exact value doesn't matter since we mock getDaysSinceEpoch */
const TEST_DATE = new Date('2026-02-10T00:00:00Z');

/**
 * Set up mock for curatedChallenge.findUnique to return album IDs by sequence.
 * Pass a map of sequence → albumId.  Unmatched sequences return null.
 */
function setupCuratedAlbums(albums: Record<number, string>) {
  mockCuratedChallengeFindUnique.mockImplementation(
    (args: { where: { sequence: number } }) => {
      const albumId = albums[args.where.sequence];
      return Promise.resolve(albumId ? { albumId } : null);
    }
  );
}

// ============================================================================
// Tests
// ============================================================================

describe('selectAlbumForDate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Defaults: no pinned album, no recent challenges
    mockCuratedChallengeFindFirst.mockResolvedValue(null);
    mockUncoverChallengeFindMany.mockResolvedValue([]);
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
      // Should not query count or curated list at all
      expect(mockCuratedChallengeCount).not.toHaveBeenCalled();
      expect(mockCuratedChallengeFindUnique).not.toHaveBeenCalled();
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
  // 2. Basic modulo selection (no duplicates)
  // --------------------------------------------------------------------------

  describe('basic modulo selection', () => {
    it('picks correct album using daysSinceEpoch % totalCurated', async () => {
      // 5 curated albums, day 7 → sequence = 7 % 5 = 2
      mockCuratedChallengeCount.mockResolvedValue(5);
      mockGetDaysSinceEpoch.mockReturnValue(7);
      setupCuratedAlbums({
        0: 'album-a',
        1: 'album-b',
        2: 'album-c',
        3: 'album-d',
        4: 'album-e',
      });

      const result = await selectAlbumForDate(TEST_DATE);

      expect(result).toBe('album-c'); // sequence 2
    });

    it('selects sequence 0 when daysSinceEpoch is a multiple of totalCurated', async () => {
      // 3 curated albums, day 9 → sequence = 9 % 3 = 0
      mockCuratedChallengeCount.mockResolvedValue(3);
      mockGetDaysSinceEpoch.mockReturnValue(9);
      setupCuratedAlbums({
        0: 'album-x',
        1: 'album-y',
        2: 'album-z',
      });

      const result = await selectAlbumForDate(TEST_DATE);

      expect(result).toBe('album-x'); // sequence 0
    });
  });

  // --------------------------------------------------------------------------
  // 3. Skips recent duplicates
  // --------------------------------------------------------------------------

  describe('recent duplicate avoidance', () => {
    it('skips album already used in a recent challenge', async () => {
      // 3 curated albums, day 4 → start sequence = 4 % 3 = 1
      // album-b at sequence 1 was already used → should walk to sequence 2 (album-c)
      mockCuratedChallengeCount.mockResolvedValue(3);
      mockGetDaysSinceEpoch.mockReturnValue(4);
      setupCuratedAlbums({
        0: 'album-a',
        1: 'album-b',
        2: 'album-c',
      });
      mockUncoverChallengeFindMany.mockResolvedValue([
        { albumId: 'album-b' }, // recently used
      ]);

      const result = await selectAlbumForDate(TEST_DATE);

      expect(result).toBe('album-c'); // walked forward from seq 1 → seq 2
    });

    it('skips multiple recently used albums', async () => {
      // 5 albums, day 10 → start sequence = 10 % 5 = 0
      // album-a (seq 0) and album-b (seq 1) are both recently used
      // → should pick album-c at seq 2
      mockCuratedChallengeCount.mockResolvedValue(5);
      mockGetDaysSinceEpoch.mockReturnValue(10);
      setupCuratedAlbums({
        0: 'album-a',
        1: 'album-b',
        2: 'album-c',
        3: 'album-d',
        4: 'album-e',
      });
      mockUncoverChallengeFindMany.mockResolvedValue([
        { albumId: 'album-a' },
        { albumId: 'album-b' },
      ]);

      const result = await selectAlbumForDate(TEST_DATE);

      expect(result).toBe('album-c');
    });

    it('queries recent challenges with correct limit (totalCurated - 1)', async () => {
      mockCuratedChallengeCount.mockResolvedValue(10);
      mockGetDaysSinceEpoch.mockReturnValue(0);
      setupCuratedAlbums({ 0: 'album-a' });

      await selectAlbumForDate(TEST_DATE);

      expect(mockUncoverChallengeFindMany).toHaveBeenCalledWith({
        where: { date: { lt: TEST_DATE } },
        orderBy: { date: 'desc' },
        take: 9, // 10 - 1
        select: { albumId: true },
      });
    });
  });

  // --------------------------------------------------------------------------
  // 4. Wrap-around
  // --------------------------------------------------------------------------

  describe('walk-forward wrap-around', () => {
    it('wraps from end of list back to beginning', async () => {
      // 3 albums, day 5 → start sequence = 5 % 3 = 2
      // album-c (seq 2) recently used → wraps to seq 0 (album-a)
      mockCuratedChallengeCount.mockResolvedValue(3);
      mockGetDaysSinceEpoch.mockReturnValue(5);
      setupCuratedAlbums({
        0: 'album-a',
        1: 'album-b',
        2: 'album-c',
      });
      mockUncoverChallengeFindMany.mockResolvedValue([{ albumId: 'album-c' }]);

      const result = await selectAlbumForDate(TEST_DATE);

      expect(result).toBe('album-a'); // wrapped around to seq 0
    });

    it('wraps past multiple used albums at end of list', async () => {
      // 4 albums, day 6 → start sequence = 6 % 4 = 2
      // seq 2 (album-c) and seq 3 (album-d) used → wraps to seq 0 (album-a)
      mockCuratedChallengeCount.mockResolvedValue(4);
      mockGetDaysSinceEpoch.mockReturnValue(6);
      setupCuratedAlbums({
        0: 'album-a',
        1: 'album-b',
        2: 'album-c',
        3: 'album-d',
      });
      mockUncoverChallengeFindMany.mockResolvedValue([
        { albumId: 'album-c' },
        { albumId: 'album-d' },
      ]);

      const result = await selectAlbumForDate(TEST_DATE);

      expect(result).toBe('album-a'); // wrapped around past seq 3 → seq 0
    });
  });

  // --------------------------------------------------------------------------
  // 5. Throws NoCuratedAlbumsError
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
  // 6. Fallback when all albums used recently
  // --------------------------------------------------------------------------

  describe('fallback when all albums used', () => {
    it('returns deterministic pick when every album was recently used', async () => {
      // 3 albums, day 1 → start sequence = 1 % 3 = 1
      // All 3 are in recent challenges → but take is totalCurated-1 = 2
      // So at most 2 albums are in the "recent" set, meaning 1 is always free.
      // However, if all 3 are somehow in the set the fallback kicks in.
      //
      // To trigger the fallback, we need all candidates in the walk-through
      // to be in recentAlbumIds. Since take = totalCurated - 1 = 2,
      // we can only have 2 recent. With 3 albums and 2 recent, one WILL be free.
      //
      // The true fallback scenario: findUnique returns null for every sequence
      // (gaps in the curated list). Let's test that path.
      mockCuratedChallengeCount.mockResolvedValue(3);
      mockGetDaysSinceEpoch.mockReturnValue(1);

      // Sequences 0, 1, 2 all return null (gap) during the walk
      // but the fallback at startSequence=1 returns an album
      let callCount = 0;
      mockCuratedChallengeFindUnique.mockImplementation(() => {
        callCount++;
        // First 3 calls are the walk-through (all return null / gaps)
        if (callCount <= 3) return Promise.resolve(null);
        // 4th call is the fallback at startSequence
        return Promise.resolve({ albumId: 'fallback-album' });
      });

      const result = await selectAlbumForDate(TEST_DATE);

      expect(result).toBe('fallback-album');
    });

    it('throws AlbumNotFoundError when even fallback has no album', async () => {
      mockCuratedChallengeCount.mockResolvedValue(2);
      mockGetDaysSinceEpoch.mockReturnValue(3); // start seq = 3 % 2 = 1

      // All findUnique calls return null (complete gaps)
      mockCuratedChallengeFindUnique.mockResolvedValue(null);

      await expect(selectAlbumForDate(TEST_DATE)).rejects.toThrow(
        AlbumNotFoundError
      );
      await expect(selectAlbumForDate(TEST_DATE)).rejects.toThrow(
        'No album found at sequence 1'
      );
    });
  });

  // --------------------------------------------------------------------------
  // 7. Single curated album
  // --------------------------------------------------------------------------

  describe('single curated album', () => {
    it('always returns the only album available', async () => {
      mockCuratedChallengeCount.mockResolvedValue(1);
      mockGetDaysSinceEpoch.mockReturnValue(42); // 42 % 1 = 0
      setupCuratedAlbums({ 0: 'only-album' });
      // take = totalCurated - 1 = 0, so no recent challenges are loaded

      const result = await selectAlbumForDate(TEST_DATE);

      expect(result).toBe('only-album');
    });

    it('returns the only album even on different days', async () => {
      mockCuratedChallengeCount.mockResolvedValue(1);
      setupCuratedAlbums({ 0: 'only-album' });

      // Day 0
      mockGetDaysSinceEpoch.mockReturnValue(0);
      expect(await selectAlbumForDate(TEST_DATE)).toBe('only-album');

      // Day 100
      mockGetDaysSinceEpoch.mockReturnValue(100);
      expect(await selectAlbumForDate(TEST_DATE)).toBe('only-album');
    });
  });

  // --------------------------------------------------------------------------
  // 8. Sequence gap handling
  // --------------------------------------------------------------------------

  describe('sequence gaps', () => {
    it('skips null sequences and continues walking', async () => {
      // 4 albums but sequence 1 has a gap (null)
      // day 3 → start seq = 3 % 4 = 3
      // seq 3 (album-d) recently used → walk to seq 0
      // seq 0 has album-a → not recently used → pick it
      mockCuratedChallengeCount.mockResolvedValue(4);
      mockGetDaysSinceEpoch.mockReturnValue(3);
      mockUncoverChallengeFindMany.mockResolvedValue([{ albumId: 'album-d' }]);

      mockCuratedChallengeFindUnique.mockImplementation(
        (args: { where: { sequence: number } }) => {
          const map: Record<number, string | null> = {
            0: 'album-a',
            1: null, // gap
            2: 'album-c',
            3: 'album-d',
          };
          const albumId = map[args.where.sequence];
          return Promise.resolve(albumId ? { albumId } : null);
        }
      );

      const result = await selectAlbumForDate(TEST_DATE);

      expect(result).toBe('album-a');
    });
  });
});
