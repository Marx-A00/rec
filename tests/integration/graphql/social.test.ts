/**
 * Social Features Integration Tests
 *
 * Tests: userFollowers, userFollowing, isFollowing, mutualConnections
 *
 * NOTE: Run with --no-file-parallelism to avoid database conflicts:
 * pnpm vitest run tests/integration/graphql/ --no-file-parallelism
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { GraphQLResolveInfo } from 'graphql';

import { queryResolvers } from '@/lib/graphql/resolvers/queries';
import type { GraphQLContext } from '@/lib/graphql/context';

import {
  getTestPrisma,
  disconnectTestPrisma,
  createTestContext,
  createTestUser,
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

describe('Social Features', () => {
  const prisma = getTestPrisma();

  beforeAll(async () => {
    await cleanupTestData(prisma);
  });

  afterAll(async () => {
    await cleanupTestData(prisma);
    await disconnectTestPrisma();
  });

  describe('userFollowers', () => {
    let userA: Awaited<ReturnType<typeof createTestUser>>;
    let userB: Awaited<ReturnType<typeof createTestUser>>;
    let userC: Awaited<ReturnType<typeof createTestUser>>;

    beforeEach(async () => {
      await cleanupTestData(prisma);
      userA = await createTestUser(prisma, { email: 'test-soc-a@example.com', username: 'SocUserA' });
      userB = await createTestUser(prisma, { email: 'test-soc-b@example.com', username: 'SocUserB' });
      userC = await createTestUser(prisma, { email: 'test-soc-c@example.com', username: 'SocUserC' });

      // B and C follow A
      await prisma.userFollow.createMany({
        data: [
          { followerId: userB.id, followedId: userA.id },
          { followerId: userC.id, followedId: userA.id },
        ],
      });
    });

    it('should return followers of a user', async () => {
      const context = createTestContext({ prisma });

      type FollowersResult = {
        users: Array<{ id: string; username: string }>;
        hasMore: boolean;
        total: number;
        cursor: string | null;
      };

      const result = await callResolver<FollowersResult>(
        queryResolvers.userFollowers,
        { userId: userA.id, limit: 20 },
        context
      );

      expect(result.total).toBe(2);
      expect(result.users).toHaveLength(2);
      expect(result.hasMore).toBe(false);
      const ids = result.users.map(u => u.id);
      expect(ids).toContain(userB.id);
      expect(ids).toContain(userC.id);
    });

    it('should support pagination with limit', async () => {
      const context = createTestContext({ prisma });

      type FollowersResult = {
        users: Array<{ id: string }>;
        hasMore: boolean;
        total: number;
        cursor: string | null;
      };

      const page1 = await callResolver<FollowersResult>(
        queryResolvers.userFollowers,
        { userId: userA.id, limit: 1 },
        context
      );

      expect(page1.users).toHaveLength(1);
      expect(page1.total).toBe(2);
      expect(page1.hasMore).toBe(true);
      expect(page1.cursor).not.toBeNull();
    });

    it('should include isFollowing flag for authenticated user', async () => {
      // B follows A, we check from perspective of C (who also follows A)
      // C follows B to test isFollowing
      await prisma.userFollow.create({
        data: { followerId: userC.id, followedId: userB.id },
      });

      const context = createTestContext({
        prisma,
        user: { id: userC.id, email: userC.email },
      });

      type FollowersResult = {
        users: Array<{ id: string; isFollowing: boolean }>;
      };

      const result = await callResolver<FollowersResult>(
        queryResolvers.userFollowers,
        { userId: userA.id, limit: 20 },
        context
      );

      const userBEntry = result.users.find(u => u.id === userB.id);
      expect(userBEntry?.isFollowing).toBe(true);

      // C doesn't follow themselves, so isFollowing for userC should be false
      const userCEntry = result.users.find(u => u.id === userC.id);
      expect(userCEntry?.isFollowing).toBe(false);
    });
  });

  describe('userFollowing', () => {
    let userA: Awaited<ReturnType<typeof createTestUser>>;
    let userB: Awaited<ReturnType<typeof createTestUser>>;
    let userC: Awaited<ReturnType<typeof createTestUser>>;

    beforeEach(async () => {
      await cleanupTestData(prisma);
      userA = await createTestUser(prisma, { email: 'test-fol-a@example.com', username: 'FollowA' });
      userB = await createTestUser(prisma, { email: 'test-fol-b@example.com', username: 'FollowB' });
      userC = await createTestUser(prisma, { email: 'test-fol-c@example.com', username: 'FollowC' });

      // A follows B and C
      await prisma.userFollow.createMany({
        data: [
          { followerId: userA.id, followedId: userB.id },
          { followerId: userA.id, followedId: userC.id },
        ],
      });
    });

    it('should return users that a user follows', async () => {
      const context = createTestContext({ prisma });

      type FollowingResult = {
        users: Array<{ id: string }>;
        hasMore: boolean;
        total: number;
      };

      const result = await callResolver<FollowingResult>(
        queryResolvers.userFollowing,
        { userId: userA.id, limit: 20 },
        context
      );

      expect(result.total).toBe(2);
      expect(result.users).toHaveLength(2);
      const ids = result.users.map(u => u.id);
      expect(ids).toContain(userB.id);
      expect(ids).toContain(userC.id);
    });

    it('should return empty for user following no one', async () => {
      const context = createTestContext({ prisma });

      type FollowingResult = {
        users: Array<{ id: string }>;
        total: number;
      };

      const result = await callResolver<FollowingResult>(
        queryResolvers.userFollowing,
        { userId: userB.id, limit: 20 },
        context
      );

      expect(result.total).toBe(0);
      expect(result.users).toHaveLength(0);
    });
  });

  describe('isFollowing', () => {
    let userA: Awaited<ReturnType<typeof createTestUser>>;
    let userB: Awaited<ReturnType<typeof createTestUser>>;

    beforeEach(async () => {
      await cleanupTestData(prisma);
      userA = await createTestUser(prisma, { email: 'test-isf-a@example.com' });
      userB = await createTestUser(prisma, { email: 'test-isf-b@example.com' });

      await prisma.userFollow.create({
        data: { followerId: userA.id, followedId: userB.id },
      });
    });

    it('should return true when following', async () => {
      const context = createTestContext({
        prisma,
        user: { id: userA.id, email: userA.email },
      });

      const result = await callResolver<boolean>(
        queryResolvers.isFollowing,
        { userId: userB.id },
        context
      );

      expect(result).toBe(true);
    });

    it('should return false when not following', async () => {
      const context = createTestContext({
        prisma,
        user: { id: userB.id, email: userB.email },
      });

      const result = await callResolver<boolean>(
        queryResolvers.isFollowing,
        { userId: userA.id },
        context
      );

      expect(result).toBe(false);
    });

    it('should return false when not authenticated', async () => {
      const context = createTestContext({ prisma, user: null });

      const result = await callResolver<boolean>(
        queryResolvers.isFollowing,
        { userId: userB.id },
        context
      );

      expect(result).toBe(false);
    });
  });

  describe('mutualConnections', () => {
    let userA: Awaited<ReturnType<typeof createTestUser>>;
    let userB: Awaited<ReturnType<typeof createTestUser>>;
    let userC: Awaited<ReturnType<typeof createTestUser>>;
    let userD: Awaited<ReturnType<typeof createTestUser>>;

    beforeEach(async () => {
      await cleanupTestData(prisma);
      userA = await createTestUser(prisma, { email: 'test-mut-a@example.com' });
      userB = await createTestUser(prisma, { email: 'test-mut-b@example.com' });
      userC = await createTestUser(prisma, { email: 'test-mut-c@example.com' });
      userD = await createTestUser(prisma, { email: 'test-mut-d@example.com' });

      // Both A and B follow C (mutual connection)
      // Only A follows D (not mutual)
      await prisma.userFollow.createMany({
        data: [
          { followerId: userA.id, followedId: userC.id },
          { followerId: userB.id, followedId: userC.id },
          { followerId: userA.id, followedId: userD.id },
        ],
      });
    });

    it('should return mutual connections between two users', async () => {
      const context = createTestContext({
        prisma,
        user: { id: userA.id, email: userA.email },
      });

      const result = await callResolver<Array<{ id: string }>>(
        queryResolvers.mutualConnections,
        { userId: userB.id },
        context
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(userC.id);
    });

    it('should return empty when no mutual connections', async () => {
      const context = createTestContext({
        prisma,
        user: { id: userC.id, email: userC.email },
      });

      const result = await callResolver<Array<{ id: string }>>(
        queryResolvers.mutualConnections,
        { userId: userD.id },
        context
      );

      expect(result).toHaveLength(0);
    });

    it('should throw when not authenticated', async () => {
      const context = createTestContext({ prisma, user: null });

      await expect(
        callResolver(
          queryResolvers.mutualConnections,
          { userId: userB.id },
          context
        )
      ).rejects.toThrow('Authentication required');
    });
  });
});
