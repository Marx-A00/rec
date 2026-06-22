/**
 * Collection Album Operations Integration Tests
 *
 * Tests: addAlbumToCollection, removeAlbumFromCollection,
 * updateCollectionAlbum, reorderCollectionAlbums,
 * myCollectionAlbums, publicCollections, userCollections
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
  createTestCollection,
  cleanupTestData,
} from './test-utils';

// Helper to call resolvers
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

describe('Collection Album Operations', () => {
  const prisma = getTestPrisma();

  beforeAll(async () => {
    await cleanupTestData(prisma);
  });

  afterAll(async () => {
    await cleanupTestData(prisma);
    await disconnectTestPrisma();
  });

  describe('addAlbumToCollection', () => {
    let testUser: ReturnType<typeof createTestUser> extends Promise<infer T>
      ? T
      : never;
    let testAlbum: Awaited<ReturnType<typeof createTestAlbum>>;
    let testCollection: Awaited<ReturnType<typeof createTestCollection>>;

    beforeEach(async () => {
      await cleanupTestData(prisma);
      testUser = await createTestUser(prisma, {
        email: 'test-col-add@example.com',
      });
      testAlbum = await createTestAlbum(prisma, {
        title: 'Album To Add',
      });
      testCollection = await createTestCollection(prisma, testUser.id, {
        name: 'Test Collection Add',
        isPublic: true,
      });
    });

    it('should add album to collection when authenticated', async () => {
      const context = createTestContext({
        prisma,
        user: { id: testUser.id, email: testUser.email },
      });

      const result = await callResolver<{ albumId: string }>(
        mutationResolvers.addAlbumToCollection,
        {
          collectionId: testCollection.id,
          input: { albumId: testAlbum.id },
        },
        context
      );

      expect(result).toBeDefined();
      expect(result.albumId).toBe(testAlbum.id);

      // Verify in DB
      const inDb = await prisma.collectionAlbum.findFirst({
        where: { collectionId: testCollection.id, albumId: testAlbum.id },
      });
      expect(inDb).not.toBeNull();
    });

    it('should throw when not authenticated', async () => {
      const context = createTestContext({ prisma, user: null });

      await expect(
        callResolver(
          mutationResolvers.addAlbumToCollection,
          {
            collectionId: testCollection.id,
            input: { albumId: testAlbum.id },
          },
          context
        )
      ).rejects.toThrow('Authentication required');
    });

    it('should throw when collection not owned', async () => {
      const otherUser = await createTestUser(prisma, {
        email: 'test-col-other@example.com',
      });
      const context = createTestContext({
        prisma,
        user: { id: otherUser.id, email: otherUser.email },
      });

      await expect(
        callResolver(
          mutationResolvers.addAlbumToCollection,
          {
            collectionId: testCollection.id,
            input: { albumId: testAlbum.id },
          },
          context
        )
      ).rejects.toThrow();
    });
  });

  describe('removeAlbumFromCollection', () => {
    let testUser: Awaited<ReturnType<typeof createTestUser>>;
    let testAlbum: Awaited<ReturnType<typeof createTestAlbum>>;
    let testCollection: Awaited<ReturnType<typeof createTestCollection>>;

    beforeEach(async () => {
      await cleanupTestData(prisma);
      testUser = await createTestUser(prisma, {
        email: 'test-col-rm@example.com',
      });
      testAlbum = await createTestAlbum(prisma, {
        title: 'Album To Remove',
      });
      testCollection = await createTestCollection(prisma, testUser.id, {
        name: 'Test Collection Remove',
        isPublic: true,
      });
      // Pre-add album to collection
      await prisma.collectionAlbum.create({
        data: {
          collectionId: testCollection.id,
          albumId: testAlbum.id,
          position: 0,
        },
      });
    });

    it('should remove album from collection', async () => {
      const context = createTestContext({
        prisma,
        user: { id: testUser.id, email: testUser.email },
      });

      const result = await callResolver<boolean>(
        mutationResolvers.removeAlbumFromCollection,
        { collectionId: testCollection.id, albumId: testAlbum.id },
        context
      );

      expect(result).toBe(true);

      // Verify removed from DB
      const inDb = await prisma.collectionAlbum.findFirst({
        where: { collectionId: testCollection.id, albumId: testAlbum.id },
      });
      expect(inDb).toBeNull();
    });

    it('should throw when not owner', async () => {
      const otherUser = await createTestUser(prisma, {
        email: 'test-col-rm-other@example.com',
      });
      const context = createTestContext({
        prisma,
        user: { id: otherUser.id, email: otherUser.email },
      });

      await expect(
        callResolver(
          mutationResolvers.removeAlbumFromCollection,
          { collectionId: testCollection.id, albumId: testAlbum.id },
          context
        )
      ).rejects.toThrow('Collection not found or access denied');
    });
  });

  describe('updateCollectionAlbum', () => {
    let testUser: Awaited<ReturnType<typeof createTestUser>>;
    let collectionAlbumId: string;

    beforeEach(async () => {
      await cleanupTestData(prisma);
      testUser = await createTestUser(prisma, {
        email: 'test-col-update@example.com',
      });
      const album = await createTestAlbum(prisma, {
        title: 'Album To Update',
      });
      const collection = await createTestCollection(prisma, testUser.id, {
        name: 'Test Collection Update CA',
      });
      const ca = await prisma.collectionAlbum.create({
        data: {
          collectionId: collection.id,
          albumId: album.id,
          position: 0,
        },
      });
      collectionAlbumId = ca.id;
    });

    it('should update personal rating and notes', async () => {
      const context = createTestContext({
        prisma,
        user: { id: testUser.id, email: testUser.email },
      });

      const result = await callResolver<{
        id: string;
        personalRating: number | null;
        personalNotes: string | null;
      }>(
        mutationResolvers.updateCollectionAlbum,
        {
          id: collectionAlbumId,
          input: { personalRating: 9, personalNotes: 'Amazing album!' },
        },
        context
      );

      expect(result.personalRating).toBe(9);
      expect(result.personalNotes).toBe('Amazing album!');
    });

    it('should throw when not owner', async () => {
      const otherUser = await createTestUser(prisma, {
        email: 'test-col-upd-other@example.com',
      });
      const context = createTestContext({
        prisma,
        user: { id: otherUser.id, email: otherUser.email },
      });

      await expect(
        callResolver(
          mutationResolvers.updateCollectionAlbum,
          {
            id: collectionAlbumId,
            input: { personalRating: 1 },
          },
          context
        )
      ).rejects.toThrow('Collection album not found or access denied');
    });
  });

  describe('reorderCollectionAlbums', () => {
    let testUser: Awaited<ReturnType<typeof createTestUser>>;
    let testCollection: Awaited<ReturnType<typeof createTestCollection>>;
    let album1: Awaited<ReturnType<typeof createTestAlbum>>;
    let album2: Awaited<ReturnType<typeof createTestAlbum>>;
    let album3: Awaited<ReturnType<typeof createTestAlbum>>;

    beforeEach(async () => {
      await cleanupTestData(prisma);
      testUser = await createTestUser(prisma, {
        email: 'test-reorder@example.com',
      });
      testCollection = await createTestCollection(prisma, testUser.id, {
        name: 'Test Collection Reorder',
      });
      album1 = await createTestAlbum(prisma, { title: 'Reorder A' });
      album2 = await createTestAlbum(prisma, { title: 'Reorder B' });
      album3 = await createTestAlbum(prisma, { title: 'Reorder C' });

      // Add in order: 1, 2, 3
      await prisma.collectionAlbum.createMany({
        data: [
          {
            collectionId: testCollection.id,
            albumId: album1.id,
            position: 0,
          },
          {
            collectionId: testCollection.id,
            albumId: album2.id,
            position: 1,
          },
          {
            collectionId: testCollection.id,
            albumId: album3.id,
            position: 2,
          },
        ],
      });
    });

    it('should reorder albums', async () => {
      const context = createTestContext({
        prisma,
        user: { id: testUser.id, email: testUser.email },
      });

      // Reverse order: 3, 2, 1
      const result = await callResolver<Array<{ albumId: string; position: number }>>(
        mutationResolvers.reorderCollectionAlbums,
        {
          collectionId: testCollection.id,
          albumIds: [album3.id, album2.id, album1.id],
        },
        context
      );

      expect(result).toHaveLength(3);
      expect(result[0].albumId).toBe(album3.id);
      expect(result[0].position).toBe(0);
      expect(result[1].albumId).toBe(album2.id);
      expect(result[1].position).toBe(1);
      expect(result[2].albumId).toBe(album1.id);
      expect(result[2].position).toBe(2);
    });

    it('should throw when not owner', async () => {
      const otherUser = await createTestUser(prisma, {
        email: 'test-reorder-other@example.com',
      });
      const context = createTestContext({
        prisma,
        user: { id: otherUser.id, email: otherUser.email },
      });

      await expect(
        callResolver(
          mutationResolvers.reorderCollectionAlbums,
          {
            collectionId: testCollection.id,
            albumIds: [album1.id],
          },
          context
        )
      ).rejects.toThrow('Collection not found or access denied');
    });
  });

  describe('myCollectionAlbums', () => {
    let testUser: Awaited<ReturnType<typeof createTestUser>>;

    beforeEach(async () => {
      await cleanupTestData(prisma);
      testUser = await createTestUser(prisma, {
        email: 'test-my-ca@example.com',
      });
      const collection = await createTestCollection(prisma, testUser.id, {
        name: 'Test Collection MCA',
      });
      const album = await createTestAlbum(prisma, {
        title: 'My Collection Album',
      });
      await prisma.collectionAlbum.create({
        data: {
          collectionId: collection.id,
          albumId: album.id,
          position: 0,
        },
      });
    });

    it('should return collection albums for authenticated user', async () => {
      const context = createTestContext({
        prisma,
        user: { id: testUser.id, email: testUser.email },
      });

      const result = await callResolver<Array<{ albumId: string }>>(
        queryResolvers.myCollectionAlbums,
        {},
        context
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
    });

    it('should throw when not authenticated', async () => {
      const context = createTestContext({ prisma, user: null });

      await expect(
        callResolver(queryResolvers.myCollectionAlbums, {}, context)
      ).rejects.toThrow('Authentication required');
    });
  });

  describe('publicCollections', () => {
    beforeEach(async () => {
      await cleanupTestData(prisma);
      const user = await createTestUser(prisma, {
        email: 'test-pub-col@example.com',
      });
      await createTestCollection(prisma, user.id, {
        name: 'Test Collection Public',
        isPublic: true,
      });
      await createTestCollection(prisma, user.id, {
        name: 'Test Collection Private',
        isPublic: false,
      });
    });

    it('should return only public collections', async () => {
      const context = createTestContext({ prisma });

      const result = await callResolver<Array<{ name: string; isPublic: boolean }>>(
        queryResolvers.publicCollections,
        { limit: 50, offset: 0 },
        context
      );

      expect(result).toBeDefined();
      // Should include our public collection (and possibly others from the real DB)
      const testCollections = result.filter(c => c.name?.startsWith('Test Collection'));
      expect(testCollections.length).toBeGreaterThanOrEqual(1);
      expect(testCollections.every(c => c.isPublic)).toBe(true);
    });
  });

  describe('userCollections', () => {
    let testUser: Awaited<ReturnType<typeof createTestUser>>;

    beforeEach(async () => {
      await cleanupTestData(prisma);
      testUser = await createTestUser(prisma, {
        email: 'test-user-cols@example.com',
      });
      await createTestCollection(prisma, testUser.id, {
        name: 'Test Collection UserCol Public',
        isPublic: true,
      });
      await createTestCollection(prisma, testUser.id, {
        name: 'Test Collection UserCol Private',
        isPublic: false,
      });
    });

    it('should return only public collections for a user', async () => {
      const context = createTestContext({ prisma });

      const result = await callResolver<Array<{ name: string; isPublic: boolean }>>(
        queryResolvers.userCollections,
        { userId: testUser.id },
        context
      );

      expect(result).toBeDefined();
      // userCollections filters to public only
      const testCollections = result.filter(c =>
        c.name?.startsWith('Test Collection UserCol')
      );
      expect(testCollections.length).toBe(1);
      expect(testCollections[0].name).toBe('Test Collection UserCol Public');
    });
  });
});
