/**
 * GraphQL Mutation Resolver Integration Tests
 *
 * Tests mutation resolvers against the actual database.
 *
 * NOTE: Run with --no-file-parallelism to avoid database conflicts:
 * pnpm vitest run tests/integration/graphql/ --no-file-parallelism
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

import { mutationResolvers } from '@/lib/graphql/resolvers/mutations';

import {
  getTestPrisma,
  disconnectTestPrisma,
  createTestContext,
  createTestUser,
  createTestAlbum,
  createTestCollection,
  cleanupTestData,
} from './test-utils';

describe('GraphQL Mutation Resolvers', () => {
  const prisma = getTestPrisma();

  beforeAll(async () => {
    await cleanupTestData(prisma);
  });

  afterAll(async () => {
    await cleanupTestData(prisma);
    await disconnectTestPrisma();
  });

  describe('createCollection', () => {
    let testUser: any;

    beforeEach(async () => {
      await cleanupTestData(prisma);
      const created = await createTestUser(prisma);
      testUser = created.dbUser;
    });

    it('should create a collection when authenticated', async () => {
      const context = createTestContext({
        prisma,
        user: { id: testUser.id, email: testUser.email },
      });

      const result = await mutationResolvers.createCollection!(
        {},
        {
          name: 'Test Collection Mutation',
          description: 'A test collection',
          isPublic: true,
        },
        context,
        {} as any
      );

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Collection Mutation');
      expect(result.description).toBe('A test collection');
      expect(result.isPublic).toBe(true);
      expect(result.userId).toBe(testUser.id);
    });

    it('should throw error when not authenticated', async () => {
      const context = createTestContext({ prisma, user: null });

      await expect(
        mutationResolvers.createCollection!(
          {},
          { name: 'Test Collection', description: null, isPublic: false },
          context,
          {} as any
        )
      ).rejects.toThrow('Authentication required');
    });
  });

  describe('updateCollection', () => {
    let testUser: any;
    let testCollection: any;

    beforeEach(async () => {
      await cleanupTestData(prisma);
      const created = await createTestUser(prisma);
      testUser = created.dbUser;
      testCollection = await createTestCollection(prisma, testUser.id, {
        name: 'Test Collection Update',
        description: 'Original description',
        isPublic: false,
      });
    });

    it('should update collection when authenticated and owner', async () => {
      const context = createTestContext({
        prisma,
        user: { id: testUser.id, email: testUser.email },
      });

      const result = await mutationResolvers.updateCollection!(
        {},
        {
          id: testCollection.id,
          name: 'Test Collection Updated',
          description: 'Updated description',
          isPublic: true,
        },
        context,
        {} as any
      );

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Collection Updated');
      expect(result.description).toBe('Updated description');
      expect(result.isPublic).toBe(true);
    });

    it('should throw error when not owner', async () => {
      // Create another user
      const otherUser = await createTestUser(prisma, {
        email: 'test-other-user@example.com',
        username: 'OtherUser',
      });

      const context = createTestContext({
        prisma,
        user: { id: otherUser.dbUser.id, email: otherUser.dbUser.email },
      });

      await expect(
        mutationResolvers.updateCollection!(
          {},
          { id: testCollection.id, name: 'Hacked Collection' },
          context,
          {} as any
        )
      ).rejects.toThrow('Collection not found or access denied');
    });
  });

  describe('deleteCollection', () => {
    let testUser: any;
    let testCollection: any;

    beforeEach(async () => {
      await cleanupTestData(prisma);
      const created = await createTestUser(prisma);
      testUser = created.dbUser;
      testCollection = await createTestCollection(prisma, testUser.id, {
        name: 'Test Collection Delete',
      });
    });

    it('should delete collection when authenticated and owner', async () => {
      const context = createTestContext({
        prisma,
        user: { id: testUser.id, email: testUser.email },
      });

      const result = await mutationResolvers.deleteCollection!(
        {},
        { id: testCollection.id },
        context,
        {} as any
      );

      expect(result).toBe(true);

      // Verify collection is deleted
      const deleted = await prisma.collection.findUnique({
        where: { id: testCollection.id },
      });
      expect(deleted).toBeNull();
    });

    it('should throw error when not owner', async () => {
      const otherUser = await createTestUser(prisma, {
        email: 'test-delete-other@example.com',
        username: 'DeleteOther',
      });

      const context = createTestContext({
        prisma,
        user: { id: otherUser.dbUser.id, email: otherUser.dbUser.email },
      });

      await expect(
        mutationResolvers.deleteCollection!(
          {},
          { id: testCollection.id },
          context,
          {} as any
        )
      ).rejects.toThrow('Collection not found or access denied');
    });
  });

  describe('createRecommendation', () => {
    let testUser: any;
    let basisAlbum: any;
    let recommendedAlbum: any;

    beforeEach(async () => {
      await cleanupTestData(prisma);
      const created = await createTestUser(prisma);
      testUser = created.dbUser;
      basisAlbum = await createTestAlbum(prisma, {
        title: 'Test Album Basis Mutation',
      });
      recommendedAlbum = await createTestAlbum(prisma, {
        title: 'Test Album Recommended Mutation',
      });
    });

    it('should create a recommendation when authenticated', async () => {
      const context = createTestContext({
        prisma,
        user: { id: testUser.id, email: testUser.email },
      });

      const result = await mutationResolvers.createRecommendation!(
        {},
        {
          basisAlbumId: basisAlbum.id,
          recommendedAlbumId: recommendedAlbum.id,
          score: 85,
        },
        context,
        {} as any
      );

      expect(result).toBeDefined();
      expect(result.basisAlbumId).toBe(basisAlbum.id);
      expect(result.recommendedAlbumId).toBe(recommendedAlbum.id);
      expect(result.score).toBe(85);
      expect(result.userId).toBe(testUser.id);
    });

    it('should throw error when not authenticated', async () => {
      const context = createTestContext({ prisma, user: null });

      await expect(
        mutationResolvers.createRecommendation!(
          {},
          {
            basisAlbumId: basisAlbum.id,
            recommendedAlbumId: recommendedAlbum.id,
            score: 85,
          },
          context,
          {} as any
        )
      ).rejects.toThrow('Authentication required');
    });
  });

  describe('followUser', () => {
    let testUser: any;
    let targetUser: any;

    beforeEach(async () => {
      await cleanupTestData(prisma);
      const created = await createTestUser(prisma);
      testUser = created.dbUser;
      const targetCreated = await createTestUser(prisma, {
        email: 'test-target-follow@example.com',
        username: 'TargetFollow',
      });
      targetUser = targetCreated.dbUser;
    });

    it('should create follow relationship when authenticated', async () => {
      const context = createTestContext({
        prisma,
        user: { id: testUser.id, email: testUser.email },
      });

      const result = await mutationResolvers.followUser!(
        {},
        { userId: targetUser.id },
        context,
        {} as any
      );

      expect(result).toBeDefined();
      expect(result.followerId).toBe(testUser.id);
      expect(result.followedId).toBe(targetUser.id);
    });

    it('should throw error when trying to follow yourself', async () => {
      const context = createTestContext({
        prisma,
        user: { id: testUser.id, email: testUser.email },
      });

      await expect(
        mutationResolvers.followUser!(
          {},
          { userId: testUser.id },
          context,
          {} as any
        )
      ).rejects.toThrow('Cannot follow yourself');
    });

    it('should throw error when not authenticated', async () => {
      const context = createTestContext({ prisma, user: null });

      await expect(
        mutationResolvers.followUser!(
          {},
          { userId: targetUser.id },
          context,
          {} as any
        )
      ).rejects.toThrow('Authentication required');
    });
  });

  describe('unfollowUser', () => {
    let testUser: any;
    let targetUser: any;

    beforeEach(async () => {
      await cleanupTestData(prisma);
      const created = await createTestUser(prisma);
      testUser = created.dbUser;
      const targetCreated = await createTestUser(prisma, {
        email: 'test-target-unfollow@example.com',
        username: 'TargetUnfollow',
      });
      targetUser = targetCreated.dbUser;

      // Create the follow relationship
      await prisma.userFollow.create({
        data: {
          followerId: testUser.id,
          followedId: targetUser.id,
        },
      });
    });

    it('should remove follow relationship when authenticated', async () => {
      const context = createTestContext({
        prisma,
        user: { id: testUser.id, email: testUser.email },
      });

      const result = await mutationResolvers.unfollowUser!(
        {},
        { userId: targetUser.id },
        context,
        {} as any
      );

      expect(result).toBe(true);

      // Verify follow relationship is deleted
      const follow = await prisma.userFollow.findFirst({
        where: {
          followerId: testUser.id,
          followedId: targetUser.id,
        },
      });
      expect(follow).toBeNull();
    });

    it('should throw error when not authenticated', async () => {
      const context = createTestContext({ prisma, user: null });

      await expect(
        mutationResolvers.unfollowUser!(
          {},
          { userId: targetUser.id },
          context,
          {} as any
        )
      ).rejects.toThrow('Authentication required');
    });
  });
});
