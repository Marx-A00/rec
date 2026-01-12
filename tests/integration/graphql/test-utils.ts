/**
 * GraphQL Integration Test Utilities
 *
 * Provides helpers for testing GraphQL resolvers directly against the test database.
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

import type { GraphQLContext } from '@/lib/graphql/context';

// Create a test Prisma client
let testPrisma: PrismaClient | null = null;

export function getTestPrisma(): PrismaClient {
  if (!testPrisma) {
    testPrisma = new PrismaClient({
      datasourceUrl: process.env.DATABASE_URL,
    });
  }
  return testPrisma;
}

export async function disconnectTestPrisma(): Promise<void> {
  if (testPrisma) {
    await testPrisma.$disconnect();
    testPrisma = null;
  }
}

// Test user interface
export interface TestUser {
  id: string;
  email: string;
  role?: string;
}

/**
 * Create a minimal mock GraphQL context for testing resolvers
 * Only includes prisma and user - other fields are mocked
 */
export function createTestContext(options?: {
  user?: TestUser | null;
  prisma?: PrismaClient;
}): GraphQLContext {
  const prisma = options?.prisma || getTestPrisma();
  const requestId = randomUUID();
  const sessionId = `test-session-${randomUUID()}`;

  // Create minimal mock context - only what resolvers actually need
  return {
    prisma,
    dataloaders: {} as any, // Most resolvers don't use dataloaders directly
    user: options?.user || null,
    requestId,
    timestamp: new Date(),
    sessionId,
    // Mock activity tracker with no-op functions
    activityTracker: {
      trackPageView: async () => {},
      trackSearch: async () => {},
      trackAlbumView: async () => {},
      trackArtistView: async () => {},
      trackRecommendation: async () => {},
      trackCollectionAction: async () => {},
      trackSocialAction: async () => {},
      trackEvent: async () => {},
      getRecentActivity: async () => [],
      getTopItems: async () => [],
      recordEntityInteraction: async () => {}, // Used by album/artist queries
    } as any,
    priorityManager: {
      getPriority: async () => 0,
      adjustPriority: async () => {},
    } as any,
  };
}

/**
 * Create a test user in the database
 */
export async function createTestUser(
  prisma: PrismaClient,
  data?: Partial<{
    email: string;
    username: string;
    role: string;
  }>
): Promise<TestUser & { dbUser: any }> {
  const id = randomUUID();
  const email = data?.email || `test-${id}@example.com`;
  const username = data?.username || `TestUser_${id.substring(0, 8)}`;

  const dbUser = await prisma.user.create({
    data: {
      id,
      email,
      username,
      role: data?.role || 'USER',
    },
  });

  return {
    id: dbUser.id,
    email: dbUser.email,
    role: dbUser.role,
    dbUser,
  };
}

/**
 * Create a test album in the database
 */
export async function createTestAlbum(
  prisma: PrismaClient,
  data?: Partial<{
    title: string;
    releaseDate: Date;
    musicbrainzId: string;
  }>
): Promise<any> {
  const id = randomUUID();

  return prisma.album.create({
    data: {
      id,
      title: data?.title || `Test Album ${id.substring(0, 8)}`,
      releaseDate: data?.releaseDate || new Date('2024-01-01'),
      musicbrainzId: data?.musicbrainzId || id, // Must be valid UUID format
    },
  });
}

/**
 * Create a test artist in the database
 */
export async function createTestArtist(
  prisma: PrismaClient,
  data?: Partial<{
    name: string;
    musicbrainzId: string;
    countryCode: string;
  }>
): Promise<any> {
  const id = randomUUID();

  return prisma.artist.create({
    data: {
      id,
      name: data?.name || `Test Artist ${id.substring(0, 8)}`,
      musicbrainzId: data?.musicbrainzId || id, // Must be valid UUID format
      countryCode: data?.countryCode,
    },
  });
}

/**
 * Create a test collection in the database
 */
export async function createTestCollection(
  prisma: PrismaClient,
  userId: string,
  data?: Partial<{
    name: string;
    description: string;
    isPublic: boolean;
  }>
): Promise<any> {
  const id = randomUUID();

  return prisma.collection.create({
    data: {
      id,
      name: data?.name || `Test Collection ${id.substring(0, 8)}`,
      description: data?.description || 'A test collection',
      isPublic: data?.isPublic ?? true,
      userId,
    },
  });
}

/**
 * Create a test recommendation in the database
 */
export async function createTestRecommendation(
  prisma: PrismaClient,
  userId: string,
  basisAlbumId: string,
  recommendedAlbumId: string,
  data?: Partial<{
    score: number;
  }>
): Promise<any> {
  return prisma.recommendation.create({
    data: {
      userId,
      basisAlbumId,
      recommendedAlbumId,
      score: data?.score ?? 8,
    },
  });
}

/**
 * Clean up test data by prefix
 */
export async function cleanupTestData(prisma: PrismaClient): Promise<void> {
  // Delete in order respecting foreign keys
  // First get test user IDs
  const testUsers = await prisma.user.findMany({
    where: { email: { startsWith: 'test-' } },
    select: { id: true },
  });
  const testUserIds = testUsers.map(u => u.id);

  // Delete user follows involving test users
  if (testUserIds.length > 0) {
    await prisma.userFollow.deleteMany({
      where: {
        OR: [
          { followerId: { in: testUserIds } },
          { followedId: { in: testUserIds } },
        ],
      },
    });

    // Delete recommendations by test users
    await prisma.recommendation.deleteMany({
      where: { userId: { in: testUserIds } },
    });
  }

  // Get test album IDs
  const testAlbums = await prisma.album.findMany({
    where: { title: { startsWith: 'Test Album' } },
    select: { id: true },
  });
  const testAlbumIds = testAlbums.map(a => a.id);

  // Delete recommendations referencing test albums
  if (testAlbumIds.length > 0) {
    await prisma.recommendation.deleteMany({
      where: {
        OR: [
          { basisAlbumId: { in: testAlbumIds } },
          { recommendedAlbumId: { in: testAlbumIds } },
        ],
      },
    });

    await prisma.collectionAlbum.deleteMany({
      where: { albumId: { in: testAlbumIds } },
    });
  }

  await prisma.collection.deleteMany({
    where: { name: { startsWith: 'Test Collection' } },
  });

  await prisma.album.deleteMany({
    where: { title: { startsWith: 'Test Album' } },
  });

  await prisma.artist.deleteMany({
    where: { name: { startsWith: 'Test Artist' } },
  });

  await prisma.user.deleteMany({
    where: { email: { startsWith: 'test-' } },
  });
}
