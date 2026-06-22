/**
 * Profile & Settings Integration Tests
 *
 * Tests: updateProfile, onboardingStatus, updateOnboardingStatus,
 * resetOnboardingStatus, mySettings, updateUserSettings
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

describe('Profile & Settings', () => {
  const prisma = getTestPrisma();

  beforeAll(async () => {
    await cleanupTestData(prisma);
  });

  afterAll(async () => {
    await cleanupTestData(prisma);
    await disconnectTestPrisma();
  });

  describe('updateProfile', () => {
    let testUser: Awaited<ReturnType<typeof createTestUser>>;

    beforeEach(async () => {
      await cleanupTestData(prisma);
      testUser = await createTestUser(prisma, {
        email: 'test-profile@example.com',
        username: 'OriginalUsername',
      });
    });

    it('should update username and bio', async () => {
      const context = createTestContext({
        prisma,
        user: { id: testUser.id, email: testUser.email },
      });

      const result = await callResolver<{
        username: string;
        bio: string | null;
        profileUpdatedAt: Date | null;
      }>(
        mutationResolvers.updateProfile,
        { username: 'UpdatedUsername', bio: 'Music lover' },
        context
      );

      expect(result.username).toBe('UpdatedUsername');
      expect(result.bio).toBe('Music lover');
      expect(result.profileUpdatedAt).not.toBeNull();
    });

    it('should throw when not authenticated', async () => {
      const context = createTestContext({ prisma, user: null });

      await expect(
        callResolver(
          mutationResolvers.updateProfile,
          { username: 'Hacker' },
          context
        )
      ).rejects.toThrow('Authentication required');
    });
  });

  describe('onboardingStatus', () => {
    let testUser: Awaited<ReturnType<typeof createTestUser>>;

    beforeEach(async () => {
      await cleanupTestData(prisma);
      testUser = await createTestUser(prisma, {
        email: 'test-onboard@example.com',
      });
    });

    it('should return onboarding status for new user', async () => {
      const context = createTestContext({
        prisma,
        user: { id: testUser.id, email: testUser.email },
      });

      const result = await callResolver<{
        isNewUser: boolean;
        hasCompletedTour: boolean;
      }>(queryResolvers.onboardingStatus, {}, context);

      expect(result).toBeDefined();
      expect(result.isNewUser).toBe(true);
      expect(result.hasCompletedTour).toBe(false);
    });

    it('should throw when not authenticated', async () => {
      const context = createTestContext({ prisma, user: null });

      await expect(
        callResolver(queryResolvers.onboardingStatus, {}, context)
      ).rejects.toThrow('Authentication required');
    });
  });

  describe('updateOnboardingStatus', () => {
    let testUser: Awaited<ReturnType<typeof createTestUser>>;

    beforeEach(async () => {
      await cleanupTestData(prisma);
      testUser = await createTestUser(prisma, {
        email: 'test-onboard-update@example.com',
      });
    });

    it('should mark tour as completed', async () => {
      const context = createTestContext({
        prisma,
        user: { id: testUser.id, email: testUser.email },
      });

      const result = await callResolver<{
        isNewUser: boolean;
        hasCompletedTour: boolean;
        profileUpdatedAt: Date | null;
      }>(
        mutationResolvers.updateOnboardingStatus,
        { hasCompletedTour: true },
        context
      );

      expect(result.hasCompletedTour).toBe(true);
      expect(result.isNewUser).toBe(false);
      expect(result.profileUpdatedAt).not.toBeNull();
    });
  });

  describe('resetOnboardingStatus', () => {
    let testUser: Awaited<ReturnType<typeof createTestUser>>;

    beforeEach(async () => {
      await cleanupTestData(prisma);
      testUser = await createTestUser(prisma, {
        email: 'test-onboard-reset@example.com',
      });
      // Complete onboarding first
      await prisma.user.update({
        where: { id: testUser.id },
        data: { profileUpdatedAt: new Date() },
      });
    });

    it('should reset onboarding status', async () => {
      const context = createTestContext({
        prisma,
        user: { id: testUser.id, email: testUser.email },
      });

      const result = await callResolver<{
        isNewUser: boolean;
        hasCompletedTour: boolean;
      }>(mutationResolvers.resetOnboardingStatus, {}, context);

      expect(result.isNewUser).toBe(true);
      expect(result.hasCompletedTour).toBe(false);
    });
  });

  describe('mySettings', () => {
    let testUser: Awaited<ReturnType<typeof createTestUser>>;

    beforeEach(async () => {
      await cleanupTestData(prisma);
      testUser = await createTestUser(prisma, {
        email: 'test-settings@example.com',
      });
    });

    it('should create default settings if none exist', async () => {
      const context = createTestContext({
        prisma,
        user: { id: testUser.id, email: testUser.email },
      });

      const result = await callResolver<{
        theme: string;
        language: string;
        showRecentActivity: boolean;
        showCollections: boolean;
      }>(queryResolvers.mySettings, {}, context);

      expect(result.theme).toBe('dark');
      expect(result.language).toBe('en');
      expect(result.showRecentActivity).toBe(true);
      expect(result.showCollections).toBe(true);
    });

    it('should return existing settings', async () => {
      // Pre-create settings
      await prisma.userSettings.create({
        data: {
          userId: testUser.id,
          theme: 'light',
          language: 'es',
          showRecentActivity: false,
          showCollections: true,
        },
      });

      const context = createTestContext({
        prisma,
        user: { id: testUser.id, email: testUser.email },
      });

      const result = await callResolver<{
        theme: string;
        language: string;
        showRecentActivity: boolean;
      }>(queryResolvers.mySettings, {}, context);

      expect(result.theme).toBe('light');
      expect(result.language).toBe('es');
      expect(result.showRecentActivity).toBe(false);
    });

    it('should throw when not authenticated', async () => {
      const context = createTestContext({ prisma, user: null });

      await expect(
        callResolver(queryResolvers.mySettings, {}, context)
      ).rejects.toThrow('Authentication required');
    });
  });

  describe('updateUserSettings', () => {
    let testUser: Awaited<ReturnType<typeof createTestUser>>;

    beforeEach(async () => {
      await cleanupTestData(prisma);
      testUser = await createTestUser(prisma, {
        email: 'test-settings-update@example.com',
      });
    });

    it('should create settings on first update (upsert)', async () => {
      const context = createTestContext({
        prisma,
        user: { id: testUser.id, email: testUser.email },
      });

      const result = await callResolver<{
        theme: string;
        showRecentActivity: boolean;
      }>(
        mutationResolvers.updateUserSettings,
        { theme: 'light', showRecentActivity: false },
        context
      );

      expect(result.theme).toBe('light');
      expect(result.showRecentActivity).toBe(false);
    });

    it('should update existing settings', async () => {
      // Pre-create settings
      await prisma.userSettings.create({
        data: {
          userId: testUser.id,
          theme: 'dark',
          showRecentActivity: true,
        },
      });

      const context = createTestContext({
        prisma,
        user: { id: testUser.id, email: testUser.email },
      });

      const result = await callResolver<{ theme: string }>(
        mutationResolvers.updateUserSettings,
        { theme: 'light' },
        context
      );

      expect(result.theme).toBe('light');
    });

    it('should throw when not authenticated', async () => {
      const context = createTestContext({ prisma, user: null });

      await expect(
        callResolver(
          mutationResolvers.updateUserSettings,
          { theme: 'dark' },
          context
        )
      ).rejects.toThrow('Authentication required');
    });
  });
});
