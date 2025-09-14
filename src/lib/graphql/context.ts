// src/lib/graphql/context.ts
// GraphQL context definition for Apollo Server

import type { PrismaClient } from '@prisma/client';
// @ts-nocheck - GraphQL context has some type issues after schema migration
import type { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import DataLoader from 'dataloader';
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
} from './dataloaders';
import { 
  ActivityTracker, 
  createActivityTracker,
  extractSessionId,
  extractUserAgent,
  extractIpAddress 
} from '@/lib/activity/activity-tracker';
import { QueuePriorityManager, createQueuePriorityManager } from '@/lib/activity/queue-priority-manager';

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

  // TODO: Extract user from authentication when implemented
  // For now, we'll set user to null (public access)
  const user = null;

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
