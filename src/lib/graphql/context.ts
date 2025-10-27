// src/lib/graphql/context.ts
// GraphQL context definition for Apollo Server

import { randomUUID } from 'crypto';

import chalk from 'chalk';
import type { PrismaClient } from '@prisma/client';
// @ts-nocheck - GraphQL context has some type issues after schema migration
import type { NextRequest } from 'next/server';
import DataLoader from 'dataloader';

import { auth } from '@/../auth';
import {
  ActivityTracker,
  createActivityTracker,
  extractSessionId,
  extractUserAgent,
  extractIpAddress,
} from '@/lib/activity/activity-tracker';
import {
  QueuePriorityManager,
  createQueuePriorityManager,
} from '@/lib/activity/queue-priority-manager';

import {
  createArtistLoader,
  createAlbumLoader,
  createTrackLoader,
  createUserLoader,
  createCollectionLoader,
  createAlbumsByArtistLoader,
  createTracksByAlbumLoader,
  createArtistsByAlbumLoader,
  createCollectionsByUserLoader,
  createRecommendationsByAlbumLoader,
  createArtistsByTrackLoader,
  createAlbumsByCollectionLoader,
} from './dataloaders';

// DataLoader types - strongly typed DataLoader instances
export interface DataLoaders {
  // Entity loaders
  artistLoader: DataLoader<string, any | null>;
  albumLoader: DataLoader<string, any | null>;
  trackLoader: DataLoader<string, any | null>;
  userLoader: DataLoader<string, any | null>;
  collectionLoader: DataLoader<string, any | null>;

  // Relationship loaders
  albumsByArtistLoader: DataLoader<string, any[]>;
  tracksByAlbumLoader: DataLoader<string, any[]>;
  artistsByAlbumLoader: DataLoader<string, any[]>;
  collectionsByUserLoader: DataLoader<string, any[]>;
  recommendationsByAlbumLoader: DataLoader<string, any[]>;
  artistsByTrackLoader: DataLoader<string, any[]>;
  albumsByCollectionLoader: DataLoader<string, any[]>;
}

// GraphQL context interface
export interface GraphQLContext {
  // Database client
  prisma: PrismaClient;

  // DataLoaders for N+1 prevention
  dataloaders: DataLoaders;

  // Request information
  req?: NextRequest;

  // User authentication (if implemented)
  user?: {
    id: string;
    email?: string;
    role?: string;
  } | null;

  // Request metadata
  requestId: string;
  timestamp: Date;

  // Activity tracking
  sessionId: string;
  activityTracker: ActivityTracker;
  priorityManager: QueuePriorityManager;

  // Request context for activity tracking
  userAgent?: string;
  ipAddress?: string;
}

// Context factory function
export async function createGraphQLContext(
  req?: NextRequest,
  prisma?: PrismaClient
): Promise<GraphQLContext> {
  if (!prisma) {
    throw new Error('Prisma client is required for GraphQL context');
  }

  // Extract user from authentication session
  let user = null;
  try {
    const session = await auth();

    if (session?.user?.id) {
      user = {
        id: session.user.id,
        email: session.user.email || undefined,
        role: session.user.role || undefined,
      };

      // Condensed, prettified auth log
      const border = chalk.gray('─'.repeat(50));
      console.log('\n' + border);
      console.log(
        `${chalk.blue('🔐 Auth')} ${chalk.gray('•')} ${chalk.white(user.email || 'No email')} ${chalk.gray('•')} ${chalk.cyan(user.id.substring(0, 12) + '...')} ${chalk.gray('•')} ${chalk.yellow(user.role || 'USER')}`
      );
      console.log(border + '\n');
    }
  } catch (error) {
    console.error(chalk.red('❌ Auth error:'), error);
  }

  // Extract request metadata for activity tracking
  const requestId = randomUUID();
  const sessionId = extractSessionId(req);
  const userAgent = extractUserAgent(req);
  const ipAddress = extractIpAddress(req);

  // Create activity tracking instances
  const activityTracker = createActivityTracker(
    prisma,
    sessionId,
    user && 'id' in user ? (user as any).id : undefined,
    requestId
  );
  const priorityManager = createQueuePriorityManager(prisma);

  // Create request-scoped DataLoaders - fresh instances per GraphQL request
  const dataloaders: DataLoaders = {
    // Entity loaders
    artistLoader: createArtistLoader(prisma),
    albumLoader: createAlbumLoader(prisma),
    trackLoader: createTrackLoader(prisma),
    userLoader: createUserLoader(prisma),
    collectionLoader: createCollectionLoader(prisma),

    // Relationship loaders
    albumsByArtistLoader: createAlbumsByArtistLoader(prisma),
    tracksByAlbumLoader: createTracksByAlbumLoader(prisma),
    artistsByAlbumLoader: createArtistsByAlbumLoader(prisma),
    collectionsByUserLoader: createCollectionsByUserLoader(prisma),
    recommendationsByAlbumLoader: createRecommendationsByAlbumLoader(prisma),
    artistsByTrackLoader: createArtistsByTrackLoader(prisma),
    albumsByCollectionLoader: createAlbumsByCollectionLoader(prisma),
  };

  return {
    prisma,
    dataloaders,
    req,
    user,
    requestId,
    timestamp: new Date(),
    sessionId,
    activityTracker,
    priorityManager,
    userAgent,
    ipAddress,
  };
}
