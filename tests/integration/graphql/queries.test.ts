/**
 * GraphQL Query Resolver Integration Tests
 *
 * Tests query resolvers against the actual database.
 *
 * NOTE: Run with --no-file-parallelism to avoid database conflicts:
 * pnpm vitest run tests/integration/graphql/ --no-file-parallelism
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';
import type { GraphQLResolveInfo } from 'graphql';

import { queryResolvers } from '@/lib/graphql/resolvers/queries';
import type { GraphQLContext } from '@/lib/graphql/context';

import {
  getTestPrisma,
  disconnectTestPrisma,
  createTestContext,
  createTestUser,
  createTestAlbum,
  createTestArtist,
  createTestCollection,
  createTestRecommendation,
  cleanupTestData,
} from './test-utils';

// Helper type to call resolvers - they may be functions or objects with resolve
type ResolverFn<TResult, TArgs = Record<string, unknown>> = (
  parent: Record<string, unknown>,
  args: TArgs,
  context: GraphQLContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

// Helper to call a resolver (handles both function and object forms)
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

describe('GraphQL Query Resolvers', () => {
  const prisma = getTestPrisma();

  beforeAll(async () => {
    // Ensure clean state before all tests
    await cleanupTestData(prisma);
  });

  afterAll(async () => {
    await cleanupTestData(prisma);
    await disconnectTestPrisma();
  });

  describe('health', () => {
    it('should return health status string', () => {
      const context = createTestContext({ prisma });
      const result = callResolver<string>(queryResolvers.health, {}, context);
      expect(result).toContain('GraphQL server running at');
    });
  });

  describe('album', () => {
    let testAlbum: any;

    beforeEach(async () => {
      await cleanupTestData(prisma);
      testAlbum = await createTestAlbum(prisma, {
        title: 'Test Album Query',
      });
    });

    it('should return album by id', async () => {
      const context = createTestContext({ prisma });

      const result = await callResolver<{ id: string } | null>(
        queryResolvers.album,
        { id: testAlbum.id },
        context
      );

      // Resolver returns minimal object { id } - field resolvers populate the rest
      expect(result).toBeDefined();
      expect(result?.id).toBe(testAlbum.id);
    });

    it('should return null for non-existent album', async () => {
      const context = createTestContext({ prisma });

      // Use a valid UUID format that doesn't exist in the database
      const result = await callResolver<{ id: string } | null>(
        queryResolvers.album,
        { id: randomUUID() },
        context
      );

      expect(result).toBeNull();
    });
  });

  describe('artist', () => {
    let testArtist: any;

    beforeEach(async () => {
      await cleanupTestData(prisma);
      testArtist = await createTestArtist(prisma, {
        name: 'Test Artist Query',
        countryCode: 'US',
      });
    });

    it('should return artist by id', async () => {
      const context = createTestContext({ prisma });

      const result = await callResolver<{ id: string } | null>(
        queryResolvers.artist,
        { id: testArtist.id },
        context
      );

      // Resolver returns minimal object { id } - field resolvers populate the rest
      expect(result).toBeDefined();
      expect(result?.id).toBe(testArtist.id);
    });

    it('should return null for non-existent artist', async () => {
      const context = createTestContext({ prisma });

      // Use a valid UUID format that doesn't exist in the database
      const result = await callResolver<{ id: string } | null>(
        queryResolvers.artist,
        { id: randomUUID() },
        context
      );

      expect(result).toBeNull();
    });
  });

  describe('user', () => {
    let testUser: any;

    beforeEach(async () => {
      await cleanupTestData(prisma);
      const created = await createTestUser(prisma, {
        email: 'test-user-query@example.com',
        username: 'TestUserQuery',
      });
      testUser = created.dbUser;
    });

    it('should return user by id', async () => {
      const context = createTestContext({ prisma });

      const result = await callResolver<{ id: string } | null>(
        queryResolvers.user,
        { id: testUser.id },
        context
      );

      // Resolver returns minimal object { id } - field resolvers populate the rest
      expect(result).toBeDefined();
      expect(result?.id).toBe(testUser.id);
    });

    it('should return null for non-existent user', async () => {
      const context = createTestContext({ prisma });

      const result = await callResolver<{ id: string } | null>(
        queryResolvers.user,
        { id: 'non-existent-id' },
        context
      );

      expect(result).toBeNull();
    });
  });

  describe('collection', () => {
    let testUser: any;
    let testCollection: any;

    beforeEach(async () => {
      await cleanupTestData(prisma);
      const created = await createTestUser(prisma);
      testUser = created.dbUser;
      testCollection = await createTestCollection(prisma, testUser.id, {
        name: 'Test Collection Query',
        description: 'A test collection for query testing',
        isPublic: true,
      });
    });

    it('should return collection by id', async () => {
      const context = createTestContext({ prisma });

      const result = await callResolver<{ id: string } | null>(
        queryResolvers.collection,
        { id: testCollection.id },
        context
      );

      // Resolver returns minimal object { id } - field resolvers populate the rest
      expect(result).toBeDefined();
      expect(result?.id).toBe(testCollection.id);
    });

    it('should return null for non-existent collection', async () => {
      const context = createTestContext({ prisma });

      const result = await callResolver<{ id: string } | null>(
        queryResolvers.collection,
        { id: 'non-existent-id' },
        context
      );

      expect(result).toBeNull();
    });
  });

  describe('recommendation', () => {
    let testUser: any;
    let basisAlbum: any;
    let recommendedAlbum: any;
    let testRecommendation: any;

    beforeEach(async () => {
      await cleanupTestData(prisma);
      const created = await createTestUser(prisma);
      testUser = created.dbUser;
      basisAlbum = await createTestAlbum(prisma, {
        title: 'Test Album Basis',
      });
      recommendedAlbum = await createTestAlbum(prisma, {
        title: 'Test Album Recommended',
      });
      testRecommendation = await createTestRecommendation(
        prisma,
        testUser.id,
        basisAlbum.id,
        recommendedAlbum.id,
        { score: 9 }
      );
    });

    it('should return recommendation by id', async () => {
      const context = createTestContext({ prisma });

      const result = await callResolver<{ id: string } | null>(
        queryResolvers.recommendation,
        { id: testRecommendation.id },
        context
      );

      // Resolver returns minimal object { id } - field resolvers populate the rest
      expect(result).toBeDefined();
      expect(result?.id).toBe(testRecommendation.id);
    });

    it('should return null for non-existent recommendation', async () => {
      const context = createTestContext({ prisma });

      const result = await callResolver<{ id: string } | null>(
        queryResolvers.recommendation,
        { id: 'non-existent-id' },
        context
      );

      expect(result).toBeNull();
    });
  });

  describe('recommendationFeed', () => {
    let testUser: any;
    let basisAlbum: any;
    let recommendedAlbum: any;

    beforeEach(async () => {
      await cleanupTestData(prisma);
      const created = await createTestUser(prisma);
      testUser = created.dbUser;
      basisAlbum = await createTestAlbum(prisma, {
        title: 'Test Album Basis Feed',
      });
      recommendedAlbum = await createTestAlbum(prisma, {
        title: 'Test Album Recommended Feed',
      });
      // Create a few recommendations
      await createTestRecommendation(
        prisma,
        testUser.id,
        basisAlbum.id,
        recommendedAlbum.id,
        { score: 8 }
      );
    });

    it('should return recommendation feed with pagination info', async () => {
      const context = createTestContext({ prisma });

      type FeedResult = {
        recommendations: { id: string }[];
        hasMore: boolean;
        cursor: string | null;
      };
      const result = await callResolver<FeedResult>(
        queryResolvers.recommendationFeed,
        { limit: 10 },
        context
      );

      expect(result).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result).toHaveProperty('hasMore');
      expect(result).toHaveProperty('cursor');
    });

    it('should support cursor-based pagination', async () => {
      const context = createTestContext({ prisma });

      type FeedResult = {
        recommendations: { id: string }[];
        hasMore: boolean;
        cursor: string | null;
      };

      // First call without cursor
      const result1 = await callResolver<FeedResult>(
        queryResolvers.recommendationFeed,
        { limit: 1 },
        context
      );

      expect(result1).toBeDefined();
      expect(result1.recommendations.length).toBe(1);

      // If there's more data, the cursor should be set
      if (result1.hasMore && result1.cursor) {
        // Second call with cursor
        const result2 = await callResolver<FeedResult>(
          queryResolvers.recommendationFeed,
          { limit: 1, cursor: result1.cursor },
          context
        );

        expect(result2).toBeDefined();
        // Should return different recommendations
        expect(result2.recommendations[0]?.id).not.toBe(
          result1.recommendations[0]?.id
        );
      }
    });
  });

  describe('userStats', () => {
    let testUser: any;

    beforeEach(async () => {
      await cleanupTestData(prisma);
      const created = await createTestUser(prisma);
      testUser = created.dbUser;
      // Create a collection for the user
      await createTestCollection(prisma, testUser.id, {
        name: 'Test Collection Stats',
      });
    });

    it('should return user statistics', async () => {
      const context = createTestContext({ prisma });

      type StatsResult = {
        userId: string;
        followersCount: number;
        followingCount: number;
        collectionsCount: number;
        recommendationsCount: number;
      };
      const result = await callResolver<StatsResult>(
        queryResolvers.userStats,
        { userId: testUser.id },
        context
      );

      expect(result).toBeDefined();
      expect(result.userId).toBe(testUser.id);
      expect(result.followersCount).toBe(0);
      expect(result.followingCount).toBe(0);
      expect(result.collectionsCount).toBe(1);
      expect(result.recommendationsCount).toBe(0);
    });

    it('should throw error for non-existent user', async () => {
      const context = createTestContext({ prisma });

      await expect(
        callResolver<unknown>(
          queryResolvers.userStats,
          { userId: 'non-existent-user-id' },
          context
        )
      ).rejects.toThrow('User not found');
    });
  });

  describe('myCollections (authenticated)', () => {
    let testUser: any;
    let testCollection: any;

    beforeEach(async () => {
      await cleanupTestData(prisma);
      const created = await createTestUser(prisma);
      testUser = created.dbUser;
      testCollection = await createTestCollection(prisma, testUser.id, {
        name: 'Test Collection My',
        description: 'My test collection',
      });
    });

    it('should return user collections when authenticated', async () => {
      const context = createTestContext({
        prisma,
        user: { id: testUser.id, email: testUser.email },
      });

      const result = await callResolver<{ id: string }[]>(
        queryResolvers.myCollections,
        {},
        context
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(testCollection.id);
    });

    it('should throw error when not authenticated', async () => {
      const context = createTestContext({ prisma, user: null });

      await expect(
        callResolver<unknown>(queryResolvers.myCollections, {}, context)
      ).rejects.toThrow('Authentication required');
    });
  });
});
