import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { Artist } from '@prisma/client';

import type { FindOrCreateArtistOptions } from '@/lib/artists/types';

// ============================================================================
// Mock setup
// ============================================================================

// Mock queue module
const mockAddJob = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/queue', () => ({
  getMusicBrainzQueue: () => ({ addJob: mockAddJob }),
}));

// Mock Spotify artist image helper
const mockTryFetchSpotifyArtistImage = vi.fn();
vi.mock('@/lib/spotify/artist-image-helper', () => ({
  tryFetchSpotifyArtistImage: (...args: unknown[]) =>
    mockTryFetchSpotifyArtistImage(...args),
}));

// Mock llama logger
const mockLogEnrichment = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/logging/llama-logger', () => ({
  createLlamaLogger: () => ({ logEnrichment: mockLogEnrichment }),
}));

// Mock global prisma (used by runPostCreateSideEffects for inline-fetch updates)
const mockGlobalPrismaArtistUpdate = vi.fn();
vi.mock('@/lib/prisma', () => ({
  prisma: {
    artist: {
      update: (...args: unknown[]) => mockGlobalPrismaArtistUpdate(...args),
    },
  },
}));

// Import after mocks are set up
import {
  findOrCreateArtist,
  runPostCreateSideEffects,
} from '@/lib/artists/find-or-create';

// ============================================================================
// Helpers
// ============================================================================

/** Build a fake Artist record */
function makeArtist(overrides: Partial<Artist> = {}): Artist {
  return {
    id: 'artist-1',
    name: 'Test Artist',
    musicbrainzId: null,
    spotifyId: null,
    discogsId: null,
    imageUrl: null,
    cloudflareImageId: null,
    source: 'USER_SUBMITTED',
    dataQuality: 'LOW',
    enrichmentStatus: 'PENDING',
    lastEnriched: null,
    biography: null,
    genres: [],
    formedYear: null,
    countryCode: null,
    area: null,
    artistType: null,
    submittedBy: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  } as Artist;
}

/** Build a mock Prisma client with chainable artist methods */
function makeMockDb() {
  return {
    artist: {
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi
        .fn()
        .mockImplementation(({ data }) =>
          Promise.resolve(makeArtist({ ...data, id: 'new-artist-id' }))
        ),
      update: vi
        .fn()
        .mockImplementation(({ data, where }) =>
          Promise.resolve(makeArtist({ id: where.id, ...data }))
        ),
    },
  };
}

/** Build default options for findOrCreateArtist */
function makeOptions(
  db: ReturnType<typeof makeMockDb>,
  overrides: Partial<FindOrCreateArtistOptions> = {}
): FindOrCreateArtistOptions {
  return {
    db: db as unknown as FindOrCreateArtistOptions['db'],
    identity: { name: 'Test Artist' },
    enrichment: 'none', // default to none so side effects don't run in dedup tests
    caller: 'test',
    ...overrides,
  };
}

// ============================================================================
// Tests: findOrCreateArtist — dedup logic
// ============================================================================

describe('findOrCreateArtist', () => {
  let db: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    db = makeMockDb();
    vi.clearAllMocks();
  });

  describe('dedup lookup order', () => {
    it('should find by musicbrainzId first (highest priority)', async () => {
      const existing = makeArtist({ id: 'mb-match', musicbrainzId: 'mb-123' });
      db.artist.findUnique.mockResolvedValueOnce(existing);

      const result = await findOrCreateArtist(
        makeOptions(db, {
          identity: {
            name: 'Different Name',
            musicbrainzId: 'mb-123',
            spotifyId: 'sp-456',
          },
        })
      );

      expect(result.artist.id).toBe('mb-match');
      expect(result.created).toBe(false);
      expect(result.dedupMethod).toBe('musicbrainzId');
      // Should not have checked spotifyId or name
      expect(db.artist.findUnique).toHaveBeenCalledTimes(1);
      expect(db.artist.findFirst).not.toHaveBeenCalled();
    });

    it('should find by spotifyId when musicbrainzId misses', async () => {
      const existing = makeArtist({ id: 'sp-match', spotifyId: 'sp-456' });
      // First findUnique (musicbrainzId) returns null
      db.artist.findUnique.mockResolvedValueOnce(null);
      // Second findUnique (spotifyId) returns match
      db.artist.findUnique.mockResolvedValueOnce(existing);

      const result = await findOrCreateArtist(
        makeOptions(db, {
          identity: {
            name: 'Test Artist',
            musicbrainzId: 'mb-999',
            spotifyId: 'sp-456',
          },
        })
      );

      expect(result.artist.id).toBe('sp-match');
      expect(result.created).toBe(false);
      expect(result.dedupMethod).toBe('spotifyId');
      expect(db.artist.findUnique).toHaveBeenCalledTimes(2);
    });

    it('should find by discogsId when musicbrainzId and spotifyId miss', async () => {
      const existing = makeArtist({ id: 'dc-match', discogsId: 'dc-789' });
      db.artist.findFirst.mockResolvedValueOnce(existing);

      const result = await findOrCreateArtist(
        makeOptions(db, {
          identity: {
            name: 'Test Artist',
            discogsId: 'dc-789',
          },
        })
      );

      expect(result.artist.id).toBe('dc-match');
      expect(result.created).toBe(false);
      expect(result.dedupMethod).toBe('discogsId');
    });

    it('should find by name (case-insensitive) as last resort', async () => {
      const existing = makeArtist({ id: 'name-match', name: 'test artist' });
      db.artist.findFirst.mockResolvedValueOnce(existing);

      const result = await findOrCreateArtist(
        makeOptions(db, {
          identity: { name: 'Test Artist' },
        })
      );

      expect(result.artist.id).toBe('name-match');
      expect(result.created).toBe(false);
      expect(result.dedupMethod).toBe('name');
      // Should have called findFirst with case-insensitive mode
      expect(db.artist.findFirst).toHaveBeenCalledWith({
        where: { name: { equals: 'Test Artist', mode: 'insensitive' } },
      });
    });

    it('should create new artist when no dedup match found', async () => {
      const result = await findOrCreateArtist(
        makeOptions(db, {
          identity: { name: 'Brand New Artist' },
          fields: {
            source: 'USER_SUBMITTED',
            dataQuality: 'LOW',
          },
        })
      );

      expect(result.created).toBe(true);
      expect(result.dedupMethod).toBeNull();
      expect(db.artist.create).toHaveBeenCalledTimes(1);
      expect(db.artist.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Brand New Artist',
          source: 'USER_SUBMITTED',
          dataQuality: 'LOW',
        }),
      });
    });

    it('should skip musicbrainzId lookup when not provided', async () => {
      const existing = makeArtist({ id: 'name-match' });
      db.artist.findFirst.mockResolvedValueOnce(existing);

      await findOrCreateArtist(
        makeOptions(db, {
          identity: { name: 'Test Artist' }, // no external IDs
        })
      );

      // findUnique should not have been called at all (no musicbrainzId, no spotifyId)
      expect(db.artist.findUnique).not.toHaveBeenCalled();
      // Should go straight to findFirst for name
      expect(db.artist.findFirst).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // Tests: backfilling external IDs
  // ============================================================================

  describe('external ID backfilling', () => {
    it('should backfill spotifyId when artist found by name', async () => {
      const existing = makeArtist({
        id: 'existing-1',
        name: 'Test Artist',
        spotifyId: null,
      });
      const updated = makeArtist({
        id: 'existing-1',
        name: 'Test Artist',
        spotifyId: 'sp-new',
      });

      db.artist.findFirst.mockResolvedValueOnce(existing);
      db.artist.update.mockResolvedValueOnce(updated);

      const result = await findOrCreateArtist(
        makeOptions(db, {
          identity: { name: 'Test Artist', spotifyId: 'sp-new' },
        })
      );

      expect(result.artist.spotifyId).toBe('sp-new');
      expect(db.artist.update).toHaveBeenCalledWith({
        where: { id: 'existing-1' },
        data: { spotifyId: 'sp-new' },
      });
    });

    it('should backfill multiple IDs at once', async () => {
      const existing = makeArtist({
        id: 'existing-1',
        musicbrainzId: 'mb-1', // found by this
        spotifyId: null,
        discogsId: null,
      });
      db.artist.findUnique.mockResolvedValueOnce(existing);
      db.artist.update.mockResolvedValueOnce(
        makeArtist({
          ...existing,
          spotifyId: 'sp-new',
          discogsId: 'dc-new',
        })
      );

      const result = await findOrCreateArtist(
        makeOptions(db, {
          identity: {
            name: 'Test Artist',
            musicbrainzId: 'mb-1',
            spotifyId: 'sp-new',
            discogsId: 'dc-new',
          },
        })
      );

      expect(db.artist.update).toHaveBeenCalledWith({
        where: { id: 'existing-1' },
        data: { spotifyId: 'sp-new', discogsId: 'dc-new' },
      });
      expect(result.artist.spotifyId).toBe('sp-new');
      expect(result.artist.discogsId).toBe('dc-new');
    });

    it('should not overwrite existing external IDs', async () => {
      const existing = makeArtist({
        id: 'existing-1',
        spotifyId: 'sp-original', // already has spotifyId
      });
      db.artist.findFirst.mockResolvedValueOnce(existing);

      await findOrCreateArtist(
        makeOptions(db, {
          identity: { name: 'Test Artist', spotifyId: 'sp-different' },
        })
      );

      // Should not update — existing spotifyId is non-null
      expect(db.artist.update).not.toHaveBeenCalled();
    });

    it('should skip backfilling when backfillExternalIds is false', async () => {
      const existing = makeArtist({
        id: 'existing-1',
        spotifyId: null,
      });
      db.artist.findFirst.mockResolvedValueOnce(existing);

      await findOrCreateArtist(
        makeOptions(db, {
          identity: { name: 'Test Artist', spotifyId: 'sp-new' },
          backfillExternalIds: false,
        })
      );

      expect(db.artist.update).not.toHaveBeenCalled();
    });

    it('should not update when no IDs need backfilling', async () => {
      const existing = makeArtist({ id: 'existing-1' });
      db.artist.findFirst.mockResolvedValueOnce(existing);

      await findOrCreateArtist(
        makeOptions(db, {
          identity: { name: 'Test Artist' }, // no external IDs to backfill
        })
      );

      expect(db.artist.update).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Tests: creation fields
  // ============================================================================

  describe('artist creation', () => {
    it('should pass all identity fields to create', async () => {
      await findOrCreateArtist(
        makeOptions(db, {
          identity: {
            name: 'New Artist',
            musicbrainzId: 'mb-1',
            spotifyId: 'sp-1',
            discogsId: 'dc-1',
          },
        })
      );

      expect(db.artist.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'New Artist',
          musicbrainzId: 'mb-1',
          spotifyId: 'sp-1',
          discogsId: 'dc-1',
        }),
      });
    });

    it('should apply optional fields when creating', async () => {
      await findOrCreateArtist(
        makeOptions(db, {
          identity: { name: 'New Artist' },
          fields: {
            source: 'MUSICBRAINZ',
            dataQuality: 'HIGH',
            countryCode: 'US',
            biography: 'A great artist',
            formedYear: 1990,
          },
        })
      );

      expect(db.artist.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          source: 'MUSICBRAINZ',
          dataQuality: 'HIGH',
          countryCode: 'US',
          biography: 'A great artist',
          formedYear: 1990,
        }),
      });
    });

    it('should default dataQuality to LOW and enrichmentStatus to PENDING', async () => {
      await findOrCreateArtist(
        makeOptions(db, {
          identity: { name: 'New Artist' },
          // no fields provided
        })
      );

      expect(db.artist.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          dataQuality: 'LOW',
          enrichmentStatus: 'PENDING',
        }),
      });
    });
  });

  // ============================================================================
  // Tests: transaction safety
  // ============================================================================

  describe('transaction safety', () => {
    it('should not run side effects when insideTransaction is true', async () => {
      await findOrCreateArtist(
        makeOptions(db, {
          identity: { name: 'New Artist' },
          enrichment: 'queue-check',
          queueCheckOptions: { source: 'manual', priority: 'high' },
          insideTransaction: true,
          caller: 'test-tx',
        })
      );

      expect(db.artist.create).toHaveBeenCalled(); // artist gets created
      expect(mockAddJob).not.toHaveBeenCalled(); // but no queue job
    });

    it('should not run side effects when enrichment is none', async () => {
      await findOrCreateArtist(
        makeOptions(db, {
          identity: { name: 'New Artist' },
          enrichment: 'none',
          caller: 'test-none',
        })
      );

      expect(db.artist.create).toHaveBeenCalled();
      expect(mockAddJob).not.toHaveBeenCalled();
    });

    it('should run side effects when not in transaction and enrichment is set', async () => {
      await findOrCreateArtist(
        makeOptions(db, {
          identity: { name: 'New Artist' },
          enrichment: 'queue-check',
          queueCheckOptions: { source: 'manual', priority: 'high' },
          insideTransaction: false,
          caller: 'test-run',
        })
      );

      expect(db.artist.create).toHaveBeenCalled();
      expect(mockAddJob).toHaveBeenCalledTimes(1);
    });

    it('should not run side effects for found (existing) artists', async () => {
      const existing = makeArtist({ id: 'existing-1' });
      db.artist.findFirst.mockResolvedValueOnce(existing);

      await findOrCreateArtist(
        makeOptions(db, {
          identity: { name: 'Existing Artist' },
          enrichment: 'queue-check',
          queueCheckOptions: { source: 'manual' },
          caller: 'test-existing',
        })
      );

      expect(mockAddJob).not.toHaveBeenCalled();
    });
  });
});

// ============================================================================
// Tests: runPostCreateSideEffects
// ============================================================================

describe('runPostCreateSideEffects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('queue-check enrichment', () => {
    it('should queue CHECK_ARTIST_ENRICHMENT job', async () => {
      const artist = makeArtist({ id: 'artist-1', name: 'Test Artist' });

      await runPostCreateSideEffects(artist, {
        enrichment: 'queue-check',
        queueCheckOptions: {
          source: 'manual',
          priority: 'high',
          requestId: 'req-123',
          parentJobId: 'parent-456',
        },
        caller: 'test',
      });

      expect(mockAddJob).toHaveBeenCalledTimes(1);
      expect(mockAddJob).toHaveBeenCalledWith(
        'check:artist-enrichment',
        {
          artistId: 'artist-1',
          source: 'manual',
          priority: 'high',
          requestId: 'req-123',
          parentJobId: 'parent-456',
        },
        expect.objectContaining({
          attempts: 3,
        })
      );
    });

    it('should default priority to medium when not specified', async () => {
      const artist = makeArtist({ id: 'artist-1' });

      await runPostCreateSideEffects(artist, {
        enrichment: 'queue-check',
        queueCheckOptions: { source: 'manual' },
        caller: 'test',
      });

      expect(mockAddJob).toHaveBeenCalledWith(
        'check:artist-enrichment',
        expect.objectContaining({ priority: 'medium' }),
        expect.anything()
      );
    });

    it('should not queue job when queueCheckOptions is missing', async () => {
      const artist = makeArtist({ id: 'artist-1' });

      await runPostCreateSideEffects(artist, {
        enrichment: 'queue-check',
        // no queueCheckOptions
        caller: 'test',
      });

      expect(mockAddJob).not.toHaveBeenCalled();
    });
  });

  describe('inline-fetch enrichment', () => {
    it('should call tryFetchSpotifyArtistImage and update artist when image found', async () => {
      const artist = makeArtist({ id: 'artist-1', name: 'Test Artist' });
      mockTryFetchSpotifyArtistImage.mockResolvedValueOnce({
        imageUrl: 'https://img.spotify.com/123',
        spotifyId: 'sp-fetched',
      });
      mockGlobalPrismaArtistUpdate.mockResolvedValueOnce(artist);

      await runPostCreateSideEffects(artist, {
        enrichment: 'inline-fetch',
        inlineFetchOptions: { parentJobId: 'parent-1', requestId: 'req-1' },
        caller: 'test',
      });

      // Should have called Spotify image helper
      expect(mockTryFetchSpotifyArtistImage).toHaveBeenCalledWith(
        'Test Artist'
      );

      // Should have updated artist with image
      expect(mockGlobalPrismaArtistUpdate).toHaveBeenCalledWith({
        where: { id: 'artist-1' },
        data: {
          imageUrl: 'https://img.spotify.com/123',
          spotifyId: 'sp-fetched',
        },
      });

      // Should have queued CACHE_ARTIST_IMAGE
      expect(mockAddJob).toHaveBeenCalledWith(
        'cache:artist-image',
        expect.objectContaining({
          artistId: 'artist-1',
          requestId: 'req-1',
          parentJobId: 'parent-1',
        }),
        expect.objectContaining({ attempts: 3 })
      );
    });

    it('should not update artist when no image found', async () => {
      const artist = makeArtist({ id: 'artist-1', name: 'Unknown Artist' });
      mockTryFetchSpotifyArtistImage.mockResolvedValueOnce(null);

      await runPostCreateSideEffects(artist, {
        enrichment: 'inline-fetch',
        caller: 'test',
      });

      expect(mockTryFetchSpotifyArtistImage).toHaveBeenCalled();
      expect(mockGlobalPrismaArtistUpdate).not.toHaveBeenCalled();
      expect(mockAddJob).not.toHaveBeenCalled();
    });

    it('should not overwrite existing spotifyId when backfilling from image fetch', async () => {
      const artist = makeArtist({
        id: 'artist-1',
        name: 'Test Artist',
        spotifyId: 'sp-original',
      });
      mockTryFetchSpotifyArtistImage.mockResolvedValueOnce({
        imageUrl: 'https://img.spotify.com/123',
        spotifyId: 'sp-different',
      });
      mockGlobalPrismaArtistUpdate.mockResolvedValueOnce(artist);

      await runPostCreateSideEffects(artist, {
        enrichment: 'inline-fetch',
        caller: 'test',
      });

      // Should keep original spotifyId (artist.spotifyId || imageResult.spotifyId)
      expect(mockGlobalPrismaArtistUpdate).toHaveBeenCalledWith({
        where: { id: 'artist-1' },
        data: {
          imageUrl: 'https://img.spotify.com/123',
          spotifyId: 'sp-original', // preserved
        },
      });
    });
  });

  describe('LlamaLog logging', () => {
    it('should create log entry when logging options provided', async () => {
      const artist = makeArtist({
        id: 'artist-1',
        name: 'Test Artist',
        musicbrainzId: 'mb-1',
        dataQuality: 'MEDIUM',
      });

      await runPostCreateSideEffects(artist, {
        enrichment: 'none',
        logging: {
          operation: 'artist:created',
          sources: ['MUSICBRAINZ'],
          userId: 'user-1',
          parentJobId: 'parent-1',
          rootJobId: 'root-1',
        },
        caller: 'test',
      });

      expect(mockLogEnrichment).toHaveBeenCalledTimes(1);
      expect(mockLogEnrichment).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'ARTIST',
          entityId: 'artist-1',
          artistId: 'artist-1',
          operation: 'artist:created',
          sources: ['MUSICBRAINZ'],
          status: 'SUCCESS',
          dataQualityAfter: 'MEDIUM',
          userId: 'user-1',
          parentJobId: 'parent-1',
          rootJobId: 'root-1',
        })
      );
    });

    it('should not log when logging options not provided', async () => {
      const artist = makeArtist({ id: 'artist-1' });

      await runPostCreateSideEffects(artist, {
        enrichment: 'none',
        caller: 'test',
      });

      expect(mockLogEnrichment).not.toHaveBeenCalled();
    });
  });

  describe('error isolation', () => {
    it('should not throw when queue job fails', async () => {
      const artist = makeArtist({ id: 'artist-1' });
      mockAddJob.mockRejectedValueOnce(new Error('Redis connection refused'));

      // Should not throw
      await expect(
        runPostCreateSideEffects(artist, {
          enrichment: 'queue-check',
          queueCheckOptions: { source: 'manual' },
          caller: 'test',
        })
      ).resolves.toBeUndefined();
    });

    it('should not throw when Spotify image fetch fails', async () => {
      const artist = makeArtist({ id: 'artist-1' });
      mockTryFetchSpotifyArtistImage.mockRejectedValueOnce(
        new Error('Spotify API rate limited')
      );

      await expect(
        runPostCreateSideEffects(artist, {
          enrichment: 'inline-fetch',
          caller: 'test',
        })
      ).resolves.toBeUndefined();
    });

    it('should not throw when LlamaLog fails', async () => {
      const artist = makeArtist({ id: 'artist-1' });
      mockLogEnrichment.mockRejectedValueOnce(new Error('DB write failed'));

      await expect(
        runPostCreateSideEffects(artist, {
          enrichment: 'none',
          logging: {
            operation: 'test',
            sources: ['USER'],
          },
          caller: 'test',
        })
      ).resolves.toBeUndefined();
    });
  });
});
