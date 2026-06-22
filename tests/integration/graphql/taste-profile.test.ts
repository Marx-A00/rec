/**
 * Taste Profile & Album Import Integration Tests
 *
 * Tests: setTasteProfile, userTasteProfile, tasteMatches, albumImportMatch
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
  createTestCollection,
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

describe('Taste Profile', () => {
  const prisma = getTestPrisma();

  beforeAll(async () => {
    await cleanupTestData(prisma);
  });

  afterAll(async () => {
    await cleanupTestData(prisma);
    await disconnectTestPrisma();
  });

  describe('setTasteProfile', () => {
    let testUser: Awaited<ReturnType<typeof createTestUser>>;
    let artist1: Awaited<ReturnType<typeof createTestArtist>>;
    let artist2: Awaited<ReturnType<typeof createTestArtist>>;
    let artist3: Awaited<ReturnType<typeof createTestArtist>>;

    beforeEach(async () => {
      await cleanupTestData(prisma);
      testUser = await createTestUser(prisma, {
        email: 'test-taste@example.com',
      });
      artist1 = await createTestArtist(prisma, { name: 'Test Artist Taste A' });
      artist2 = await createTestArtist(prisma, { name: 'Test Artist Taste B' });
      artist3 = await createTestArtist(prisma, { name: 'Test Artist Taste C' });
    });

    it('should save favorite artists with positions', async () => {
      const context = createTestContext({
        prisma,
        user: { id: testUser.id, email: testUser.email },
      });

      const result = await callResolver<
        Array<{ position: number; artist: { id: string; name: string } }>
      >(
        mutationResolvers.setTasteProfile,
        { artistIds: [artist1.id, artist2.id, artist3.id] },
        context
      );

      expect(result).toHaveLength(3);
      expect(result[0].position).toBe(1);
      expect(result[0].artist.id).toBe(artist1.id);
      expect(result[1].position).toBe(2);
      expect(result[1].artist.id).toBe(artist2.id);
      expect(result[2].position).toBe(3);
      expect(result[2].artist.id).toBe(artist3.id);
    });

    it('should atomically replace existing favorites', async () => {
      const context = createTestContext({
        prisma,
        user: { id: testUser.id, email: testUser.email },
      });

      // Set initial favorites
      await callResolver(
        mutationResolvers.setTasteProfile,
        { artistIds: [artist1.id, artist2.id] },
        context
      );

      // Replace with different set
      const result = await callResolver<
        Array<{ position: number; artist: { id: string } }>
      >(
        mutationResolvers.setTasteProfile,
        { artistIds: [artist3.id] },
        context
      );

      expect(result).toHaveLength(1);
      expect(result[0].artist.id).toBe(artist3.id);

      // Verify old favorites are gone
      const inDb = await prisma.userFavoriteArtist.findMany({
        where: { userId: testUser.id },
      });
      expect(inDb).toHaveLength(1);
    });

    it('should allow clearing all favorites', async () => {
      const context = createTestContext({
        prisma,
        user: { id: testUser.id, email: testUser.email },
      });

      // Set then clear
      await callResolver(
        mutationResolvers.setTasteProfile,
        { artistIds: [artist1.id] },
        context
      );

      const result = await callResolver<Array<unknown>>(
        mutationResolvers.setTasteProfile,
        { artistIds: [] },
        context
      );

      expect(result).toHaveLength(0);
    });

    it('should reject more than 5 artists', async () => {
      const context = createTestContext({
        prisma,
        user: { id: testUser.id, email: testUser.email },
      });

      // Create 6 artists
      const extraArtists = await Promise.all(
        Array.from({ length: 6 }, (_, i) =>
          createTestArtist(prisma, { name: `Test Artist Extra ${i}` })
        )
      );

      await expect(
        callResolver(
          mutationResolvers.setTasteProfile,
          { artistIds: extraArtists.map(a => a.id) },
          context
        )
      ).rejects.toThrow('Maximum 5 favorite artists allowed');
    });

    it('should throw when not authenticated', async () => {
      const context = createTestContext({ prisma, user: null });

      await expect(
        callResolver(
          mutationResolvers.setTasteProfile,
          { artistIds: [artist1.id] },
          context
        )
      ).rejects.toThrow('Authentication required');
    });
  });

  describe('userTasteProfile', () => {
    let testUser: Awaited<ReturnType<typeof createTestUser>>;
    let artist1: Awaited<ReturnType<typeof createTestArtist>>;

    beforeEach(async () => {
      await cleanupTestData(prisma);
      testUser = await createTestUser(prisma, {
        email: 'test-taste-query@example.com',
      });
      artist1 = await createTestArtist(prisma, {
        name: 'Test Artist Profile',
      });
      await prisma.userFavoriteArtist.create({
        data: {
          userId: testUser.id,
          artistId: artist1.id,
          position: 1,
        },
      });
    });

    it('should return taste profile for own user', async () => {
      const context = createTestContext({
        prisma,
        user: { id: testUser.id, email: testUser.email },
      });

      const result = await callResolver<
        Array<{ position: number; artist: { id: string } }>
      >(
        queryResolvers.userTasteProfile,
        { userId: testUser.id },
        context
      );

      expect(result).toHaveLength(1);
      expect(result[0].artist.id).toBe(artist1.id);
    });

    it('should return taste profile when public', async () => {
      // Default showTasteProfile = true (no settings = visible)
      const otherUser = await createTestUser(prisma, {
        email: 'test-taste-viewer@example.com',
      });
      const context = createTestContext({
        prisma,
        user: { id: otherUser.id, email: otherUser.email },
      });

      const result = await callResolver<
        Array<{ position: number; artist: { id: string } }>
      >(
        queryResolvers.userTasteProfile,
        { userId: testUser.id },
        context
      );

      expect(result).toHaveLength(1);
    });

    it('should return empty when showTasteProfile is false', async () => {
      await prisma.userSettings.create({
        data: {
          userId: testUser.id,
          showTasteProfile: false,
        },
      });

      const otherUser = await createTestUser(prisma, {
        email: 'test-taste-blocked@example.com',
      });
      const context = createTestContext({
        prisma,
        user: { id: otherUser.id, email: otherUser.email },
      });

      const result = await callResolver<Array<unknown>>(
        queryResolvers.userTasteProfile,
        { userId: testUser.id },
        context
      );

      expect(result).toHaveLength(0);
    });

    it('should always show own profile even when hidden', async () => {
      await prisma.userSettings.create({
        data: {
          userId: testUser.id,
          showTasteProfile: false,
        },
      });

      const context = createTestContext({
        prisma,
        user: { id: testUser.id, email: testUser.email },
      });

      const result = await callResolver<
        Array<{ position: number; artist: { id: string } }>
      >(
        queryResolvers.userTasteProfile,
        { userId: testUser.id },
        context
      );

      expect(result).toHaveLength(1);
    });
  });

  describe('tasteMatches', () => {
    let userA: Awaited<ReturnType<typeof createTestUser>>;
    let userB: Awaited<ReturnType<typeof createTestUser>>;
    let userC: Awaited<ReturnType<typeof createTestUser>>;
    let sharedArtist: Awaited<ReturnType<typeof createTestArtist>>;
    let uniqueArtist: Awaited<ReturnType<typeof createTestArtist>>;

    beforeEach(async () => {
      await cleanupTestData(prisma);
      userA = await createTestUser(prisma, { email: 'test-match-a@example.com' });
      userB = await createTestUser(prisma, { email: 'test-match-b@example.com' });
      userC = await createTestUser(prisma, { email: 'test-match-c@example.com' });
      sharedArtist = await createTestArtist(prisma, { name: 'Test Artist Shared' });
      uniqueArtist = await createTestArtist(prisma, { name: 'Test Artist Unique' });

      // A and B share sharedArtist, C has uniqueArtist
      await prisma.userFavoriteArtist.createMany({
        data: [
          { userId: userA.id, artistId: sharedArtist.id, position: 1 },
          { userId: userB.id, artistId: sharedArtist.id, position: 1 },
          { userId: userC.id, artistId: uniqueArtist.id, position: 1 },
        ],
      });
    });

    it('should find users with overlapping favorites', async () => {
      const context = createTestContext({
        prisma,
        user: { id: userA.id, email: userA.email },
      });

      type MatchResult = {
        user: { id: string };
        sharedArtists: Array<{ id: string }>;
        overlapCount: number;
      };

      const result = await callResolver<MatchResult[]>(
        queryResolvers.tasteMatches,
        { limit: 10 },
        context
      );

      expect(result).toHaveLength(1);
      expect(result[0].user.id).toBe(userB.id);
      expect(result[0].overlapCount).toBe(1);
      expect(result[0].sharedArtists).toHaveLength(1);
      expect(result[0].sharedArtists[0].id).toBe(sharedArtist.id);
    });

    it('should return empty when no overlapping favorites', async () => {
      const context = createTestContext({
        prisma,
        user: { id: userC.id, email: userC.email },
      });

      const result = await callResolver<Array<unknown>>(
        queryResolvers.tasteMatches,
        { limit: 10 },
        context
      );

      expect(result).toHaveLength(0);
    });

    it('should return empty when user has no favorites', async () => {
      const lonelyUser = await createTestUser(prisma, {
        email: 'test-match-lonely@example.com',
      });
      const context = createTestContext({
        prisma,
        user: { id: lonelyUser.id, email: lonelyUser.email },
      });

      const result = await callResolver<Array<unknown>>(
        queryResolvers.tasteMatches,
        { limit: 10 },
        context
      );

      expect(result).toHaveLength(0);
    });

    it('should exclude self from matches', async () => {
      const context = createTestContext({
        prisma,
        user: { id: userA.id, email: userA.email },
      });

      const result = await callResolver<Array<{ user: { id: string } }>>(
        queryResolvers.tasteMatches,
        { limit: 10 },
        context
      );

      const ids = result.map(r => r.user.id);
      expect(ids).not.toContain(userA.id);
    });

    it('should throw when not authenticated', async () => {
      const context = createTestContext({ prisma, user: null });

      await expect(
        callResolver(queryResolvers.tasteMatches, { limit: 10 }, context)
      ).rejects.toThrow('Authentication required');
    });
  });

  describe('albumImportMatch', () => {
    let testUser: Awaited<ReturnType<typeof createTestUser>>;
    let testCollection: Awaited<ReturnType<typeof createTestCollection>>;
    let dbAlbum: Awaited<ReturnType<typeof createTestAlbum>>;

    beforeEach(async () => {
      await cleanupTestData(prisma);
      testUser = await createTestUser(prisma, {
        email: 'test-import@example.com',
      });
      testCollection = await createTestCollection(prisma, testUser.id, {
        name: 'Test Collection Import',
      });
      dbAlbum = await createTestAlbum(prisma, {
        title: 'In Rainbows',
        musicbrainzId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      });

      // Seed UserLastfmData with top albums
      await prisma.userSettings.create({
        data: {
          userId: testUser.id,
          lastfmUsername: 'importuser',
          lastfmConnectedAt: new Date(),
        },
      });
      await prisma.userLastfmData.create({
        data: {
          userId: testUser.id,
          lastfmUsername: 'importuser',
          topAlbums: {
            overall: [
              {
                name: 'In Rainbows',
                artistName: 'Radiohead',
                playcount: 500,
                mbid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
              },
              {
                name: 'Unknown Album',
                artistName: 'Some Artist',
                playcount: 100,
                mbid: '11111111-2222-3333-4444-555555555555',
              },
              {
                name: 'No MBID Album',
                artistName: 'Another Artist',
                playcount: 50,
                mbid: '',
              },
            ],
          },
          lastSyncedAt: new Date(),
        },
      });
    });

    it('should categorize albums correctly', async () => {
      const context = createTestContext({
        prisma,
        user: { id: testUser.id, email: testUser.email },
      });

      type ImportResult = {
        readyNow: Array<{ id: string; title: string }>;
        canBeFetched: Array<{ mbid: string; name: string }>;
        alreadyAdded: Array<{ id: string }>;
        skipped: Array<{ name: string }>;
      };

      const result = await callResolver<ImportResult>(
        queryResolvers.albumImportMatch,
        { collectionId: testCollection.id },
        context
      );

      // "In Rainbows" exists in DB and not in collection -> readyNow
      expect(result.readyNow.length).toBeGreaterThanOrEqual(1);
      const readyTitles = result.readyNow.map(a => a.title);
      expect(readyTitles).toContain('[TEST] In Rainbows');

      // "Unknown Album" not in DB -> canBeFetched
      expect(result.canBeFetched.length).toBeGreaterThanOrEqual(1);

      // "No MBID Album" has no mbid -> skipped
      expect(result.skipped.length).toBeGreaterThanOrEqual(1);
    });

    it('should move album to alreadyAdded when in collection', async () => {
      // Add album to collection first
      await prisma.collectionAlbum.create({
        data: {
          collectionId: testCollection.id,
          albumId: dbAlbum.id,
          position: 0,
        },
      });

      const context = createTestContext({
        prisma,
        user: { id: testUser.id, email: testUser.email },
      });

      type ImportResult = {
        readyNow: Array<{ id: string }>;
        alreadyAdded: Array<{ id: string }>;
      };

      const result = await callResolver<ImportResult>(
        queryResolvers.albumImportMatch,
        { collectionId: testCollection.id },
        context
      );

      // "In Rainbows" now in collection -> alreadyAdded
      const alreadyIds = result.alreadyAdded.map(a => a.id);
      expect(alreadyIds).toContain(dbAlbum.id);
      const readyIds = result.readyNow.map(a => a.id);
      expect(readyIds).not.toContain(dbAlbum.id);
    });

    it('should return empty when no Last.fm data', async () => {
      const freshUser = await createTestUser(prisma, {
        email: 'test-import-empty@example.com',
      });
      const freshCollection = await createTestCollection(
        prisma,
        freshUser.id,
        { name: 'Test Collection Fresh' }
      );

      const context = createTestContext({
        prisma,
        user: { id: freshUser.id, email: freshUser.email },
      });

      type ImportResult = {
        readyNow: Array<unknown>;
        canBeFetched: Array<unknown>;
        alreadyAdded: Array<unknown>;
        skipped: Array<unknown>;
      };

      const result = await callResolver<ImportResult>(
        queryResolvers.albumImportMatch,
        { collectionId: freshCollection.id },
        context
      );

      expect(result.readyNow).toHaveLength(0);
      expect(result.canBeFetched).toHaveLength(0);
      expect(result.alreadyAdded).toHaveLength(0);
      expect(result.skipped).toHaveLength(0);
    });

    it('should throw when not authenticated', async () => {
      const context = createTestContext({ prisma, user: null });

      await expect(
        callResolver(
          queryResolvers.albumImportMatch,
          { collectionId: testCollection.id },
          context
        )
      ).rejects.toThrow('Authentication required');
    });
  });
});
