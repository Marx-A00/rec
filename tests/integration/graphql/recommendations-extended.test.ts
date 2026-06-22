/**
 * Extended Recommendation Integration Tests
 *
 * Tests: updateRecommendation, deleteRecommendation,
 * myRecommendations, getAlbumRecommendations, artistByMusicBrainzId,
 * albumByMusicBrainzId, track, albumTracks
 *
 * NOTE: Run with --no-file-parallelism to avoid database conflicts:
 * pnpm vitest run tests/integration/graphql/ --no-file-parallelism
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { GraphQLResolveInfo } from 'graphql';

import { queryResolvers } from '@/lib/graphql/resolvers/queries';
import { mutationResolvers } from '@/lib/graphql/resolvers/mutations';
import type { GraphQLContext } from '@/lib/graphql/context';

import {
  getTestPrisma,
  disconnectTestPrisma,
  createTestContext,
  createTestUser,
  createTestAlbum,
  createTestArtist,
  createTestRecommendation,
  cleanupTestData,
} from './test-utils';

type ResolverFn<TResult, TArgs = Record<string, unknown>> = (
  parent: Record<string, unknown>,
  args: TArgs,
  context: GraphQLContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

function callResolver<TResult, TArgs = Record<string, unknown>>(
  resolver: unknown,
  args: TArgs,
  context: GraphQLContext
): TResult | Promise<TResult> {
  const fn = (
    typeof resolver === 'function'
      ? resolver
      : (resolver as { resolve: ResolverFn<TResult, TArgs> }).resolve
  ) as ResolverFn<TResult, TArgs>;
  return fn({}, args, context, {} as GraphQLResolveInfo);
}

describe('Extended Recommendations & Entity Lookups', () => {
  const prisma = getTestPrisma();

  beforeAll(async () => {
    await cleanupTestData(prisma);
  });

  afterAll(async () => {
    await cleanupTestData(prisma);
    await disconnectTestPrisma();
  });

  describe('updateRecommendation', () => {
    let testUser: Awaited<ReturnType<typeof createTestUser>>;
    let testRec: Awaited<ReturnType<typeof createTestRecommendation>>;

    beforeEach(async () => {
      await cleanupTestData(prisma);
      testUser = await createTestUser(prisma, {
        email: 'test-rec-upd@example.com',
      });
      const album1 = await createTestAlbum(prisma, { title: 'Basis Update' });
      const album2 = await createTestAlbum(prisma, { title: 'Rec Update' });
      testRec = await createTestRecommendation(
        prisma,
        testUser.id,
        album1.id,
        album2.id,
        { score: 70 }
      );
    });

    it('should update recommendation score', async () => {
      const context = createTestContext({
        prisma,
        user: { id: testUser.id, email: testUser.email },
      });

      const result = await callResolver<{ id: string; score: number }>(
        mutationResolvers.updateRecommendation,
        { id: testRec.id, score: 95 },
        context
      );

      expect(result.score).toBe(95);

      // Verify in DB
      const updated = await prisma.recommendation.findUnique({
        where: { id: testRec.id },
      });
      expect(updated?.score).toBe(95);
    });

    it('should throw when not owner', async () => {
      const otherUser = await createTestUser(prisma, {
        email: 'test-rec-upd-other@example.com',
      });
      const context = createTestContext({
        prisma,
        user: { id: otherUser.id, email: otherUser.email },
      });

      await expect(
        callResolver(
          mutationResolvers.updateRecommendation,
          { id: testRec.id, score: 50 },
          context
        )
      ).rejects.toThrow('Recommendation not found or access denied');
    });

    it('should throw when not authenticated', async () => {
      const context = createTestContext({ prisma, user: null });

      await expect(
        callResolver(
          mutationResolvers.updateRecommendation,
          { id: testRec.id, score: 50 },
          context
        )
      ).rejects.toThrow('Authentication required');
    });
  });

  describe('deleteRecommendation', () => {
    let testUser: Awaited<ReturnType<typeof createTestUser>>;
    let testRec: Awaited<ReturnType<typeof createTestRecommendation>>;

    beforeEach(async () => {
      await cleanupTestData(prisma);
      testUser = await createTestUser(prisma, {
        email: 'test-rec-del@example.com',
      });
      const album1 = await createTestAlbum(prisma, { title: 'Basis Delete' });
      const album2 = await createTestAlbum(prisma, { title: 'Rec Delete' });
      testRec = await createTestRecommendation(
        prisma,
        testUser.id,
        album1.id,
        album2.id
      );
    });

    it('should delete recommendation', async () => {
      const context = createTestContext({
        prisma,
        user: { id: testUser.id, email: testUser.email },
      });

      const result = await callResolver<boolean>(
        mutationResolvers.deleteRecommendation,
        { id: testRec.id },
        context
      );

      expect(result).toBe(true);

      // Verify deleted from DB
      const deleted = await prisma.recommendation.findUnique({
        where: { id: testRec.id },
      });
      expect(deleted).toBeNull();
    });

    it('should throw when not owner', async () => {
      const otherUser = await createTestUser(prisma, {
        email: 'test-rec-del-other@example.com',
      });
      const context = createTestContext({
        prisma,
        user: { id: otherUser.id, email: otherUser.email },
      });

      await expect(
        callResolver(
          mutationResolvers.deleteRecommendation,
          { id: testRec.id },
          context
        )
      ).rejects.toThrow('Recommendation not found or access denied');
    });
  });

  describe('myRecommendations', () => {
    let testUser: Awaited<ReturnType<typeof createTestUser>>;

    beforeEach(async () => {
      await cleanupTestData(prisma);
      testUser = await createTestUser(prisma, {
        email: 'test-my-rec@example.com',
      });
      // Create 3 recommendations with different scores
      for (let i = 0; i < 3; i++) {
        const a1 = await createTestAlbum(prisma, {
          title: `Basis MyRec ${i}`,
        });
        const a2 = await createTestAlbum(prisma, {
          title: `Rec MyRec ${i}`,
        });
        await createTestRecommendation(
          prisma,
          testUser.id,
          a1.id,
          a2.id,
          { score: 70 + i * 10 }
        );
      }
    });

    it('should return user recommendations with pagination', async () => {
      const context = createTestContext({
        prisma,
        user: { id: testUser.id, email: testUser.email },
      });

      type MyRecsResult = {
        recommendations: Array<{ id: string; score: number }>;
        hasMore: boolean;
        cursor: string | null;
      };

      const result = await callResolver<MyRecsResult>(
        queryResolvers.myRecommendations,
        { limit: 2 },
        context
      );

      expect(result.recommendations).toHaveLength(2);
      expect(result.hasMore).toBe(true);
      expect(result.cursor).not.toBeNull();

      // Default sort is SCORE_DESC, so highest score first
      expect(result.recommendations[0].score).toBeGreaterThanOrEqual(
        result.recommendations[1].score
      );
    });

    it('should return empty for user with no recommendations', async () => {
      const newUser = await createTestUser(prisma, {
        email: 'test-my-rec-empty@example.com',
      });
      const context = createTestContext({
        prisma,
        user: { id: newUser.id, email: newUser.email },
      });

      type MyRecsResult = {
        recommendations: Array<{ id: string }>;
        hasMore: boolean;
      };

      const result = await callResolver<MyRecsResult>(
        queryResolvers.myRecommendations,
        { limit: 10 },
        context
      );

      expect(result.recommendations).toHaveLength(0);
      expect(result.hasMore).toBe(false);
    });

    it('should throw when not authenticated', async () => {
      const context = createTestContext({ prisma, user: null });

      await expect(
        callResolver(queryResolvers.myRecommendations, { limit: 10 }, context)
      ).rejects.toThrow('Authentication required');
    });
  });

  describe('getAlbumRecommendations', () => {
    let basisAlbum: Awaited<ReturnType<typeof createTestAlbum>>;

    beforeEach(async () => {
      await cleanupTestData(prisma);
      const user = await createTestUser(prisma, {
        email: 'test-album-rec@example.com',
      });
      basisAlbum = await createTestAlbum(prisma, { title: 'Basis AlbumRec' });
      const recAlbum = await createTestAlbum(prisma, { title: 'Rec AlbumRec' });
      await createTestRecommendation(
        prisma,
        user.id,
        basisAlbum.id,
        recAlbum.id,
        { score: 85 }
      );
    });

    it('should return recommendations for an album', async () => {
      const context = createTestContext({ prisma });

      type AlbumRecsResult = {
        recommendations: Array<{ id: string }>;
        pagination: { total: number; hasMore: boolean };
      };

      const result = await callResolver<AlbumRecsResult>(
        queryResolvers.getAlbumRecommendations,
        { albumId: basisAlbum.id, limit: 10 },
        context
      );

      expect(result.recommendations.length).toBeGreaterThanOrEqual(1);
      expect(result.pagination.total).toBeGreaterThanOrEqual(1);
    });

    it('should return empty for album with no recommendations', async () => {
      const lonelyAlbum = await createTestAlbum(prisma, {
        title: 'No Recs Album',
      });
      const context = createTestContext({ prisma });

      type AlbumRecsResult = {
        recommendations: Array<{ id: string }>;
        pagination: { total: number };
      };

      const result = await callResolver<AlbumRecsResult>(
        queryResolvers.getAlbumRecommendations,
        { albumId: lonelyAlbum.id, limit: 10 },
        context
      );

      expect(result.recommendations).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('artistByMusicBrainzId', () => {
    let testArtist: Awaited<ReturnType<typeof createTestArtist>>;

    beforeEach(async () => {
      await cleanupTestData(prisma);
      testArtist = await createTestArtist(prisma, {
        name: 'Test Artist MbId',
        musicbrainzId: '550e8400-e29b-41d4-a716-446655440000',
      });
    });

    it('should return artist by musicbrainz id', async () => {
      const context = createTestContext({ prisma });

      const result = await callResolver<{ id: string; name: string } | null>(
        queryResolvers.artistByMusicBrainzId,
        { musicbrainzId: '550e8400-e29b-41d4-a716-446655440000' },
        context
      );

      expect(result).not.toBeNull();
      expect(result?.id).toBe(testArtist.id);
    });

    it('should return null for non-existent musicbrainz id', async () => {
      const context = createTestContext({ prisma });

      const result = await callResolver<{ id: string } | null>(
        queryResolvers.artistByMusicBrainzId,
        { musicbrainzId: '00000000-0000-0000-0000-000000000000' },
        context
      );

      expect(result).toBeNull();
    });
  });

  describe('albumByMusicBrainzId', () => {
    let testAlbum: Awaited<ReturnType<typeof createTestAlbum>>;

    beforeEach(async () => {
      await cleanupTestData(prisma);
      testAlbum = await createTestAlbum(prisma, {
        title: 'Album MbId',
        musicbrainzId: '660e8400-e29b-41d4-a716-446655440000',
      });
    });

    it('should return album by musicbrainz id', async () => {
      const context = createTestContext({ prisma });

      const result = await callResolver<{ id: string; title: string } | null>(
        queryResolvers.albumByMusicBrainzId,
        { musicbrainzId: '660e8400-e29b-41d4-a716-446655440000' },
        context
      );

      expect(result).not.toBeNull();
      expect(result?.id).toBe(testAlbum.id);
    });

    it('should return null for non-existent musicbrainz id', async () => {
      const context = createTestContext({ prisma });

      const result = await callResolver<{ id: string } | null>(
        queryResolvers.albumByMusicBrainzId,
        { musicbrainzId: '00000000-0000-0000-0000-000000000000' },
        context
      );

      expect(result).toBeNull();
    });
  });

  describe('track', () => {
    it('should return null for non-existent track', async () => {
      const context = createTestContext({ prisma });

      const result = await callResolver<{ id: string } | null>(
        queryResolvers.track,
        { id: '00000000-0000-0000-0000-000000000000' },
        context
      );

      expect(result).toBeNull();
    });
  });
});
