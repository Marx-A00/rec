/**
 * Activity-based Social Feed Integration Tests
 *
 * Tests the Activity table functionality, pagination, privacy filtering, and edge cases.
 *
 * NOTE: Run with --no-file-parallelism to avoid database conflicts:
 * pnpm vitest run tests/integration/graphql/activity-feed.test.ts --no-file-parallelism
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';
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
  createTestCollection,
  cleanupTestData,
} from './test-utils';

// Helper type to call resolvers
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

describe('Activity-based Social Feed', () => {
  const prisma = getTestPrisma();

  beforeAll(async () => {
    await cleanupTestData(prisma);
  });

  afterAll(async () => {
    await cleanupTestData(prisma);
    await disconnectTestPrisma();
  });

  describe('Activity Creation', () => {
    beforeEach(async () => {
      await cleanupTestData(prisma);
    });

    it('should create Activity when following a user', async () => {
      // Create two users
      const user1 = await createTestUser(prisma, { email: 'user1@test.com' });
      const user2 = await createTestUser(prisma, { email: 'user2@test.com' });

      const context = createTestContext({ prisma, user: user1 });

      // Follow user2
      await callResolver(
        mutationResolvers.followUser,
        { userId: user2.id },
        context
      );

      // Verify Activity was created
      const activity = await prisma.activity.findFirst({
        where: {
          userId: user1.id,
          type: 'follow',
          targetUserId: user2.id,
        },
      });

      expect(activity).toBeDefined();
      expect(activity?.type).toBe('follow');
      expect(activity?.targetUserId).toBe(user2.id);
      expect(activity?.deletedAt).toBeNull();
    });

    it('should create Activity with metadata when creating recommendation', async () => {
      const user = await createTestUser(prisma, { email: 'rec-user@test.com' });
      const basisAlbum = await createTestAlbum(prisma, {
        title: 'Basis Album',
      });
      const recommendedAlbum = await createTestAlbum(prisma, {
        title: 'Recommended Album',
      });

      const context = createTestContext({ prisma, user });

      await callResolver(
        mutationResolvers.createRecommendation,
        {
          basisAlbumId: basisAlbum.id,
          recommendedAlbumId: recommendedAlbum.id,
          score: 85,
        },
        context
      );

      // Verify Activity was created with metadata
      const activity = await prisma.activity.findFirst({
        where: {
          userId: user.id,
          type: 'recommendation',
        },
      });

      expect(activity).toBeDefined();
      expect(activity?.type).toBe('recommendation');
      expect(activity?.recommendationId).toBeDefined();
      expect(activity?.metadata).toBeDefined();

      const metadata = activity?.metadata as Record<string, unknown>;
      expect(metadata.score).toBe(85);
      expect(metadata.basisAlbumTitle).toBe('Basis Album');
      expect(metadata.recommendedAlbumTitle).toBe('Recommended Album');
    });

    it('should create Activity when adding album to collection', async () => {
      const user = await createTestUser(prisma, { email: 'col-user@test.com' });
      const album = await createTestAlbum(prisma, {
        title: 'Collection Album',
      });
      const collection = await createTestCollection(prisma, user.id, {
        name: 'Test Collection',
        isPublic: true,
      });

      const context = createTestContext({ prisma, user });

      await callResolver(
        mutationResolvers.addAlbumToCollection,
        {
          collectionId: collection.id,
          input: { albumId: album.id },
        },
        context
      );

      // Verify Activity was created
      const activity = await prisma.activity.findFirst({
        where: {
          userId: user.id,
          type: 'collection_add',
        },
      });

      expect(activity).toBeDefined();
      expect(activity?.type).toBe('collection_add');
      expect(activity?.collectionAlbumId).toBeDefined();

      const metadata = activity?.metadata as Record<string, unknown>;
      expect(metadata.collectionName).toBe('Test Collection');
      expect(metadata.albumTitle).toBe('Collection Album');
    });
  });

  describe('Soft Delete', () => {
    beforeEach(async () => {
      await cleanupTestData(prisma);
    });

    it('should soft-delete Activity when unfollowing', async () => {
      const user1 = await createTestUser(prisma, {
        email: 'unfollow1@test.com',
      });
      const user2 = await createTestUser(prisma, {
        email: 'unfollow2@test.com',
      });

      const context = createTestContext({ prisma, user: user1 });

      // Follow then unfollow
      await callResolver(
        mutationResolvers.followUser,
        { userId: user2.id },
        context
      );
      await callResolver(
        mutationResolvers.unfollowUser,
        { userId: user2.id },
        context
      );

      // Verify Activity is soft-deleted (deletedAt set)
      const activity = await prisma.activity.findFirst({
        where: {
          userId: user1.id,
          type: 'follow',
          targetUserId: user2.id,
        },
      });

      expect(activity).toBeDefined();
      expect(activity?.deletedAt).not.toBeNull();
    });

    it('should soft-delete Activity when deleting recommendation', async () => {
      const user = await createTestUser(prisma, { email: 'del-rec@test.com' });
      const basisAlbum = await createTestAlbum(prisma, { title: 'Basis' });
      const recommendedAlbum = await createTestAlbum(prisma, {
        title: 'Recommended',
      });

      const context = createTestContext({ prisma, user });

      // Create recommendation
      const rec = await callResolver<{ id: string }>(
        mutationResolvers.createRecommendation,
        {
          basisAlbumId: basisAlbum.id,
          recommendedAlbumId: recommendedAlbum.id,
          score: 80,
        },
        context
      );

      // Delete recommendation
      await callResolver(
        mutationResolvers.deleteRecommendation,
        { id: rec.id },
        context
      );

      // Verify Activity is soft-deleted
      const activity = await prisma.activity.findFirst({
        where: {
          userId: user.id,
          type: 'recommendation',
        },
      });

      expect(activity?.deletedAt).not.toBeNull();
    });

    it('should not show soft-deleted activities in feed', async () => {
      // Create users: viewer follows actor
      const viewer = await createTestUser(prisma, { email: 'viewer@test.com' });
      const actor = await createTestUser(prisma, { email: 'actor@test.com' });
      const target = await createTestUser(prisma, { email: 'target@test.com' });

      // Viewer follows actor
      await prisma.userFollow.create({
        data: { followerId: viewer.id, followedId: actor.id },
      });

      // Actor follows target (creates activity)
      const actorContext = createTestContext({ prisma, user: actor });
      await callResolver(
        mutationResolvers.followUser,
        { userId: target.id },
        actorContext
      );

      // Verify activity appears in viewer's feed
      const viewerContext = createTestContext({ prisma, user: viewer });
      let feed = await callResolver<{
        activities: Array<{ type: string }>;
      }>(queryResolvers.socialFeed, { limit: 10 }, viewerContext);

      expect(feed.activities.length).toBeGreaterThan(0);

      // Actor unfollows target (soft-deletes activity)
      await callResolver(
        mutationResolvers.unfollowUser,
        { userId: target.id },
        actorContext
      );

      // Verify activity no longer appears in viewer's feed
      feed = await callResolver<{
        activities: Array<{ type: string }>;
      }>(queryResolvers.socialFeed, { limit: 10 }, viewerContext);

      const followActivities = feed.activities.filter(a => a.type === 'FOLLOW');
      expect(followActivities.length).toBe(0);
    });
  });

  describe('Pagination', () => {
    beforeEach(async () => {
      await cleanupTestData(prisma);
    });

    it('should paginate activities correctly', async () => {
      const viewer = await createTestUser(prisma, {
        email: 'pag-viewer@test.com',
      });
      const actor = await createTestUser(prisma, {
        email: 'pag-actor@test.com',
      });

      // Viewer follows actor
      await prisma.userFollow.create({
        data: { followerId: viewer.id, followedId: actor.id },
      });

      // Create multiple albums and recommendations
      const albums = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          createTestAlbum(prisma, { title: `Album ${i}` })
        )
      );

      // Create recommendations as actor
      const actorContext = createTestContext({ prisma, user: actor });
      for (let i = 0; i < 5; i++) {
        await callResolver(
          mutationResolvers.createRecommendation,
          {
            basisAlbumId: albums[i * 2].id,
            recommendedAlbumId: albums[i * 2 + 1].id,
            score: 80 + i,
          },
          actorContext
        );
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Fetch first page
      const viewerContext = createTestContext({ prisma, user: viewer });
      const page1 = await callResolver<{
        activities: Array<{ id: string; createdAt: Date }>;
        cursor: string | null;
        hasMore: boolean;
      }>(queryResolvers.socialFeed, { limit: 2 }, viewerContext);

      expect(page1.activities.length).toBe(2);
      expect(page1.hasMore).toBe(true);
      expect(page1.cursor).toBeDefined();

      // Fetch second page
      const page2 = await callResolver<{
        activities: Array<{ id: string; createdAt: Date }>;
        cursor: string | null;
        hasMore: boolean;
      }>(
        queryResolvers.socialFeed,
        { limit: 2, cursor: page1.cursor },
        viewerContext
      );

      expect(page2.activities.length).toBe(2);
      expect(page2.hasMore).toBe(true);

      // Verify no duplicates between pages
      const page1Ids = new Set(page1.activities.map(a => a.id));
      const page2Ids = page2.activities.map(a => a.id);
      const hasDuplicates = page2Ids.some(id => page1Ids.has(id));
      expect(hasDuplicates).toBe(false);

      // Verify chronological order (newer first)
      const allActivities = [...page1.activities, ...page2.activities];
      for (let i = 1; i < allActivities.length; i++) {
        expect(
          new Date(allActivities[i - 1].createdAt).getTime()
        ).toBeGreaterThanOrEqual(
          new Date(allActivities[i].createdAt).getTime()
        );
      }
    });
  });

  describe('Privacy Filtering', () => {
    beforeEach(async () => {
      await cleanupTestData(prisma);
    });

    it('should hide activities when showRecentActivity is false', async () => {
      const viewer = await createTestUser(prisma, {
        email: 'priv-viewer@test.com',
      });
      const actor = await createTestUser(prisma, {
        email: 'priv-actor@test.com',
      });
      const target = await createTestUser(prisma, {
        email: 'priv-target@test.com',
      });

      // Viewer follows actor
      await prisma.userFollow.create({
        data: { followerId: viewer.id, followedId: actor.id },
      });

      // Actor follows target
      const actorContext = createTestContext({ prisma, user: actor });
      await callResolver(
        mutationResolvers.followUser,
        { userId: target.id },
        actorContext
      );

      // Set actor's privacy to hide recent activity
      await prisma.userSettings.create({
        data: {
          userId: actor.id,
          showRecentActivity: false,
        },
      });

      // Verify viewer's feed doesn't show actor's activities
      const viewerContext = createTestContext({ prisma, user: viewer });
      const feed = await callResolver<{
        activities: Array<{ type: string }>;
      }>(queryResolvers.socialFeed, { limit: 10 }, viewerContext);

      expect(feed.activities.length).toBe(0);
    });

    it('should hide private collection activities (except My Collection)', async () => {
      const viewer = await createTestUser(prisma, {
        email: 'col-viewer@test.com',
      });
      const actor = await createTestUser(prisma, {
        email: 'col-actor@test.com',
      });

      // Viewer follows actor
      await prisma.userFollow.create({
        data: { followerId: viewer.id, followedId: actor.id },
      });

      const album = await createTestAlbum(prisma, { title: 'Private Album' });

      // Create a private collection (not "My Collection")
      const privateCollection = await createTestCollection(prisma, actor.id, {
        name: 'Secret Playlist',
        isPublic: false,
      });

      // Add album to private collection
      const actorContext = createTestContext({ prisma, user: actor });
      await callResolver(
        mutationResolvers.addAlbumToCollection,
        {
          collectionId: privateCollection.id,
          input: { albumId: album.id },
        },
        actorContext
      );

      // Verify viewer's feed doesn't show private collection activity
      const viewerContext = createTestContext({ prisma, user: viewer });
      const feed = await callResolver<{
        activities: Array<{ type: string }>;
      }>(queryResolvers.socialFeed, { limit: 10 }, viewerContext);

      const collectionActivities = feed.activities.filter(
        a => a.type === 'COLLECTION_ADD'
      );
      expect(collectionActivities.length).toBe(0);
    });
  });

  describe('Type Filtering', () => {
    beforeEach(async () => {
      await cleanupTestData(prisma);
    });

    it('should filter by activity type', async () => {
      const viewer = await createTestUser(prisma, {
        email: 'type-viewer@test.com',
      });
      const actor = await createTestUser(prisma, {
        email: 'type-actor@test.com',
      });
      const target = await createTestUser(prisma, {
        email: 'type-target@test.com',
      });

      // Viewer follows actor
      await prisma.userFollow.create({
        data: { followerId: viewer.id, followedId: actor.id },
      });

      // Actor creates various activities
      const actorContext = createTestContext({ prisma, user: actor });

      // Follow activity
      await callResolver(
        mutationResolvers.followUser,
        { userId: target.id },
        actorContext
      );

      // Recommendation activity
      const album1 = await createTestAlbum(prisma, { title: 'Basis' });
      const album2 = await createTestAlbum(prisma, { title: 'Recommended' });
      await callResolver(
        mutationResolvers.createRecommendation,
        {
          basisAlbumId: album1.id,
          recommendedAlbumId: album2.id,
          score: 85,
        },
        actorContext
      );

      const viewerContext = createTestContext({ prisma, user: viewer });

      // Filter by FOLLOW only
      const followFeed = await callResolver<{
        activities: Array<{ type: string }>;
      }>(
        queryResolvers.socialFeed,
        { type: 'FOLLOW', limit: 10 },
        viewerContext
      );

      expect(followFeed.activities.every(a => a.type === 'FOLLOW')).toBe(true);
      expect(followFeed.activities.length).toBeGreaterThan(0);

      // Filter by RECOMMENDATION only
      const recFeed = await callResolver<{
        activities: Array<{ type: string }>;
      }>(
        queryResolvers.socialFeed,
        { type: 'RECOMMENDATION', limit: 10 },
        viewerContext
      );

      expect(recFeed.activities.every(a => a.type === 'RECOMMENDATION')).toBe(
        true
      );
      expect(recFeed.activities.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    beforeEach(async () => {
      await cleanupTestData(prisma);
    });

    it('should return empty feed when user follows no one', async () => {
      const lonelyUser = await createTestUser(prisma, {
        email: 'lonely@test.com',
      });

      const context = createTestContext({ prisma, user: lonelyUser });
      const feed = await callResolver<{
        activities: Array<unknown>;
        cursor: string | null;
        hasMore: boolean;
      }>(queryResolvers.socialFeed, { limit: 10 }, context);

      expect(feed.activities).toEqual([]);
      expect(feed.cursor).toBeNull();
      expect(feed.hasMore).toBe(false);
    });

    it('should handle update to recommendation score', async () => {
      const user = await createTestUser(prisma, { email: 'update@test.com' });
      const album1 = await createTestAlbum(prisma, { title: 'Album1' });
      const album2 = await createTestAlbum(prisma, { title: 'Album2' });

      const context = createTestContext({ prisma, user });

      // Create recommendation with score 80
      const rec = await callResolver<{ id: string }>(
        mutationResolvers.createRecommendation,
        {
          basisAlbumId: album1.id,
          recommendedAlbumId: album2.id,
          score: 80,
        },
        context
      );

      // Update score to 95
      await callResolver(
        mutationResolvers.updateRecommendation,
        { id: rec.id, score: 95 },
        context
      );

      // Verify Activity metadata was updated
      const activity = await prisma.activity.findFirst({
        where: { recommendationId: rec.id },
      });

      const metadata = activity?.metadata as Record<string, unknown>;
      expect(metadata.score).toBe(95);
    });
  });
});
