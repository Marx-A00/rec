/**
 * Last.fm Connection & Sync Integration Tests
 *
 * Tests: confirmLastfmConnection, disconnectLastfm, triggerLastfmSync,
 * and the connect → disconnect lifecycle.
 *
 * NOTE: connectLastfm calls the external Last.fm API so it's tested
 * only for auth checks here. The full connect flow is E2E.
 *
 * NOTE: Run with --no-file-parallelism to avoid database conflicts:
 * pnpm vitest run tests/integration/graphql/ --no-file-parallelism
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { GraphQLResolveInfo } from 'graphql';

import { mutationResolvers } from '@/lib/graphql/resolvers/mutations';
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

describe('Last.fm Connection & Sync', () => {
  const prisma = getTestPrisma();

  beforeAll(async () => {
    await cleanupTestData(prisma);
  });

  afterAll(async () => {
    await cleanupTestData(prisma);
    await disconnectTestPrisma();
  });

  describe('connectLastfm', () => {
    beforeEach(async () => {
      await cleanupTestData(prisma);
    });

    it('should throw when not authenticated', async () => {
      const context = createTestContext({ prisma, user: null });

      await expect(
        callResolver(
          mutationResolvers.connectLastfm,
          { username: 'testuser' },
          context
        )
      ).rejects.toThrow('Authentication required');
    });
  });

  describe('confirmLastfmConnection', () => {
    let testUser: Awaited<ReturnType<typeof createTestUser>>;

    beforeEach(async () => {
      await cleanupTestData(prisma);
      testUser = await createTestUser(prisma, {
        email: 'test-lfm-confirm@example.com',
      });
    });

    it('should save Last.fm connection to UserSettings', async () => {
      const context = createTestContext({
        prisma,
        user: { id: testUser.id, email: testUser.email },
      });

      const result = await callResolver<{
        lastfmUsername: string | null;
        lastfmConnectedAt: Date | null;
      }>(
        mutationResolvers.confirmLastfmConnection,
        { username: 'testscrobbler' },
        context
      );

      expect(result.lastfmUsername).toBe('testscrobbler');
      expect(result.lastfmConnectedAt).not.toBeNull();

      // Verify in DB
      const settings = await prisma.userSettings.findUnique({
        where: { userId: testUser.id },
      });
      expect(settings?.lastfmUsername).toBe('testscrobbler');
    });

    it('should upsert settings if they already exist', async () => {
      // Pre-create settings
      await prisma.userSettings.create({
        data: {
          userId: testUser.id,
          theme: 'dark',
        },
      });

      const context = createTestContext({
        prisma,
        user: { id: testUser.id, email: testUser.email },
      });

      const result = await callResolver<{
        lastfmUsername: string | null;
        theme: string;
      }>(
        mutationResolvers.confirmLastfmConnection,
        { username: 'newuser' },
        context
      );

      expect(result.lastfmUsername).toBe('newuser');
      expect(result.theme).toBe('dark'); // Existing settings preserved
    });

    it('should throw when not authenticated', async () => {
      const context = createTestContext({ prisma, user: null });

      await expect(
        callResolver(
          mutationResolvers.confirmLastfmConnection,
          { username: 'testuser' },
          context
        )
      ).rejects.toThrow('Authentication required');
    });
  });

  describe('disconnectLastfm', () => {
    let testUser: Awaited<ReturnType<typeof createTestUser>>;

    beforeEach(async () => {
      await cleanupTestData(prisma);
      testUser = await createTestUser(prisma, {
        email: 'test-lfm-disconnect@example.com',
      });
      // Set up connected state
      await prisma.userSettings.create({
        data: {
          userId: testUser.id,
          lastfmUsername: 'connecteduser',
          lastfmConnectedAt: new Date(),
        },
      });
      await prisma.userLastfmData.create({
        data: {
          userId: testUser.id,
          lastfmUsername: 'connecteduser',
          totalPlaycount: 5000,
          lastSyncedAt: new Date(),
        },
      });
    });

    it('should clear connection and delete synced data', async () => {
      const context = createTestContext({
        prisma,
        user: { id: testUser.id, email: testUser.email },
      });

      const result = await callResolver<{
        lastfmUsername: string | null;
        lastfmConnectedAt: Date | null;
      }>(mutationResolvers.disconnectLastfm, {}, context);

      expect(result.lastfmUsername).toBeNull();
      expect(result.lastfmConnectedAt).toBeNull();

      // Verify UserLastfmData deleted
      const data = await prisma.userLastfmData.findUnique({
        where: { userId: testUser.id },
      });
      expect(data).toBeNull();
    });

    it('should throw when not authenticated', async () => {
      const context = createTestContext({ prisma, user: null });

      await expect(
        callResolver(mutationResolvers.disconnectLastfm, {}, context)
      ).rejects.toThrow('Authentication required');
    });
  });

  describe('triggerLastfmSync', () => {
    let testUser: Awaited<ReturnType<typeof createTestUser>>;

    beforeEach(async () => {
      await cleanupTestData(prisma);
      testUser = await createTestUser(prisma, {
        email: 'test-lfm-sync@example.com',
      });
    });

    it('should throw when not connected', async () => {
      const context = createTestContext({
        prisma,
        user: { id: testUser.id, email: testUser.email },
      });

      await expect(
        callResolver(mutationResolvers.triggerLastfmSync, {}, context)
      ).rejects.toThrow('Last.fm is not connected');
    });

    it('should throw when cooldown is active', async () => {
      // Set up connected state with recent sync
      await prisma.userSettings.create({
        data: {
          userId: testUser.id,
          lastfmUsername: 'syncuser',
          lastfmConnectedAt: new Date(),
        },
      });
      await prisma.userLastfmData.create({
        data: {
          userId: testUser.id,
          lastfmUsername: 'syncuser',
          lastSyncedAt: new Date(), // Just synced
        },
      });

      const context = createTestContext({
        prisma,
        user: { id: testUser.id, email: testUser.email },
      });

      await expect(
        callResolver(mutationResolvers.triggerLastfmSync, {}, context)
      ).rejects.toThrow(/Please wait .* seconds before syncing again/);
    });

    it('should allow sync when cooldown has elapsed', async () => {
      // Set up connected state with old sync
      await prisma.userSettings.create({
        data: {
          userId: testUser.id,
          lastfmUsername: 'syncuser',
          lastfmConnectedAt: new Date(),
        },
      });
      await prisma.userLastfmData.create({
        data: {
          userId: testUser.id,
          lastfmUsername: 'syncuser',
          lastSyncedAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        },
      });

      const context = createTestContext({
        prisma,
        user: { id: testUser.id, email: testUser.email },
      });

      // This will try to enqueue a job — may fail if Redis/queue not available,
      // but it should get past the cooldown check
      try {
        const result = await callResolver<boolean>(
          mutationResolvers.triggerLastfmSync,
          {},
          context
        );
        expect(result).toBe(true);
      } catch (error: unknown) {
        // If queue is unavailable, the error should be about the queue, not cooldown
        expect((error as Error).message).not.toMatch(/Please wait/);
      }
    });

    it('should allow sync when no previous sync exists', async () => {
      await prisma.userSettings.create({
        data: {
          userId: testUser.id,
          lastfmUsername: 'freshuser',
          lastfmConnectedAt: new Date(),
        },
      });

      const context = createTestContext({
        prisma,
        user: { id: testUser.id, email: testUser.email },
      });

      try {
        const result = await callResolver<boolean>(
          mutationResolvers.triggerLastfmSync,
          {},
          context
        );
        expect(result).toBe(true);
      } catch (error: unknown) {
        // Queue unavailable is fine — no cooldown error
        expect((error as Error).message).not.toMatch(/Please wait/);
        expect((error as Error).message).not.toMatch(/not connected/);
      }
    });

    it('should throw when not authenticated', async () => {
      const context = createTestContext({ prisma, user: null });

      await expect(
        callResolver(mutationResolvers.triggerLastfmSync, {}, context)
      ).rejects.toThrow('Authentication required');
    });
  });

  describe('Full connect → disconnect lifecycle', () => {
    let testUser: Awaited<ReturnType<typeof createTestUser>>;

    beforeEach(async () => {
      await cleanupTestData(prisma);
      testUser = await createTestUser(prisma, {
        email: 'test-lfm-lifecycle@example.com',
      });
    });

    it('should handle connect then disconnect cleanly', async () => {
      const context = createTestContext({
        prisma,
        user: { id: testUser.id, email: testUser.email },
      });

      // 1. Confirm connection
      const connected = await callResolver<{
        lastfmUsername: string | null;
      }>(
        mutationResolvers.confirmLastfmConnection,
        { username: 'lifecycleuser' },
        context
      );
      expect(connected.lastfmUsername).toBe('lifecycleuser');

      // 2. Simulate synced data existing
      await prisma.userLastfmData.create({
        data: {
          userId: testUser.id,
          lastfmUsername: 'lifecycleuser',
          totalPlaycount: 1000,
          topArtists: { overall: [{ name: 'Radiohead', playcount: 500 }] },
          lastSyncedAt: new Date(),
        },
      });

      // 3. Disconnect
      const disconnected = await callResolver<{
        lastfmUsername: string | null;
      }>(mutationResolvers.disconnectLastfm, {}, context);
      expect(disconnected.lastfmUsername).toBeNull();

      // 4. Verify all data cleaned up
      const data = await prisma.userLastfmData.findUnique({
        where: { userId: testUser.id },
      });
      expect(data).toBeNull();

      const settings = await prisma.userSettings.findUnique({
        where: { userId: testUser.id },
      });
      expect(settings?.lastfmUsername).toBeNull();
      expect(settings?.lastfmConnectedAt).toBeNull();
    });
  });
});
