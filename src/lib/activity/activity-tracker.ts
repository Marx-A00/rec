// src/lib/activity/activity-tracker.ts
// User activity tracking system for GraphQL operations

import { randomUUID } from 'crypto';

import { PrismaClient } from '@prisma/client';

export interface UserActivityData {
  userId: string | null;
  sessionId: string;
  operation: string;
  operationType: 'query' | 'mutation' | 'subscription';
  metadata?: Record<string, any>;
  albumIds?: string[];
  artistIds?: string[];
  userAgent?: string;
  ipAddress?: string;
  requestId?: string;
}

export interface UserActivityContext {
  isActivelyBrowsing: boolean;
  recentlyViewedEntities: string[];
  sessionDuration: number;
}

export class ActivityTracker {
  private prisma: PrismaClient;
  private sessionId: string;
  private userId: string | null;
  private requestId: string;

  constructor(
    prisma: PrismaClient,
    sessionId: string,
    userId: string | null = null,
    requestId?: string
  ) {
    this.prisma = prisma;
    this.sessionId = sessionId;
    this.userId = userId;
    this.requestId = requestId || randomUUID();
  }

  /**
   * Track a user action with metadata
   */
  async trackAction(
    operation: string,
    operationType: 'query' | 'mutation' | 'subscription' = 'query',
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await this.prisma.userActivity.create({
        data: {
          userId: this.userId,
          sessionId: this.sessionId,
          operation,
          operationType,
          metadata: metadata || {},
          albumIds: [],
          artistIds: [],
          requestId: this.requestId,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.warn('Failed to track user activity:', error);
      // Don't throw - activity tracking shouldn't break the app
    }
  }

  /**
   * Track entity interactions (albums/artists viewed or manipulated)
   */
  async recordEntityInteraction(
    operation: string,
    entityType: 'album' | 'artist',
    entityIds: string | string[],
    operationType: 'query' | 'mutation' = 'query',
    metadata?: Record<string, any>
  ): Promise<void> {
    const ids = Array.isArray(entityIds) ? entityIds : [entityIds];

    try {
      await this.prisma.userActivity.create({
        data: {
          userId: this.userId,
          sessionId: this.sessionId,
          operation,
          operationType,
          metadata: metadata || {},
          albumIds: entityType === 'album' ? ids : [],
          artistIds: entityType === 'artist' ? ids : [],
          requestId: this.requestId,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.warn('Failed to record entity interaction:', error);
    }
  }

  /**
   * Track search activities with query terms
   */
  async trackSearch(
    searchType: 'albums' | 'artists' | 'tracks',
    searchQuery: string,
    resultCount?: number,
    filters?: Record<string, any>
  ): Promise<void> {
    await this.trackAction(`search_${searchType}`, 'query', {
      searchQuery,
      resultCount,
      filters,
      searchType,
    });
  }

  /**
   * Track collection activities (high priority actions)
   */
  async trackCollectionAction(
    action:
      | 'add_album'
      | 'remove_album'
      | 'create_collection'
      | 'create_recommendation',
    entityId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const operationType =
      action.includes('create') || action.includes('add')
        ? 'mutation'
        : 'query';

    await this.recordEntityInteraction(
      action,
      action.includes('album') ? 'album' : 'artist',
      entityId,
      operationType as 'query' | 'mutation',
      metadata
    );
  }

  /**
   * Track browse activities (passive discovery)
   */
  async trackBrowse(
    browseType:
      | 'trending'
      | 'recommendations'
      | 'artist_albums'
      | 'album_details',
    entityIds?: string[],
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.trackAction(`browse_${browseType}`, 'query', metadata);

    // Also record entity interactions if provided
    if (entityIds && entityIds.length > 0) {
      const entityType = browseType.includes('album') ? 'album' : 'artist';
      await this.recordEntityInteraction(
        `view_${entityType}`,
        entityType,
        entityIds,
        'query',
        metadata
      );
    }
  }

  /**
   * Get recent user activity context for priority management
   */
  async getUserActivityContext(): Promise<UserActivityContext> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const recentActivity = await this.prisma.userActivity.findMany({
      where: {
        sessionId: this.sessionId,
        timestamp: { gte: fiveMinutesAgo },
      },
      orderBy: { timestamp: 'desc' },
      take: 10,
    });

    // Extract recently viewed entities
    const recentlyViewedEntities = recentActivity
      .flatMap(activity => [
        ...(activity.albumIds || []),
        ...(activity.artistIds || []),
      ])
      .filter((id, index, arr) => arr.indexOf(id) === index) // Unique
      .slice(0, 5); // Top 5 most recent

    // Determine if user is actively browsing
    const isActivelyBrowsing = recentActivity.length > 0;

    // Calculate session duration
    const firstActivity = await this.prisma.userActivity.findFirst({
      where: { sessionId: this.sessionId },
      orderBy: { timestamp: 'asc' },
    });

    const sessionDuration = firstActivity
      ? Date.now() - firstActivity.timestamp.getTime()
      : 0;

    return {
      isActivelyBrowsing,
      recentlyViewedEntities,
      sessionDuration,
    };
  }

  /**
   * Static method to check if any users are currently active
   * Includes retry logic for transient connection errors (P1017)
   */
  static async getActiveUserCount(prisma: PrismaClient): Promise<number> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    try {
      const activeUsers = await prisma.userActivity.groupBy({
        by: ['sessionId'],
        where: {
          timestamp: { gte: fiveMinutesAgo },
        },
      });

      return activeUsers.length;
    } catch (error: unknown) {
      const prismaError = error as { code?: string };
      // P1017 = Server has closed the connection (e.g. laptop sleep)
      // Silently return 0 — the monitor will retry on the next interval
      if (prismaError.code === 'P1017') {
        return 0;
      }
      throw error;
    }
  }

  /**
   * Static method to get recently active entities for priority boosting
   */
  static async getRecentlyActiveEntities(
    prisma: PrismaClient,
    entityType: 'album' | 'artist',
    minutes: number = 10
  ): Promise<string[]> {
    const timeAgo = new Date(Date.now() - minutes * 60 * 1000);

    const activities = await prisma.userActivity.findMany({
      where: {
        timestamp: { gte: timeAgo },
        OR: [
          entityType === 'album'
            ? { albumIds: { isEmpty: false } }
            : { artistIds: { isEmpty: false } },
        ],
      },
      select: {
        albumIds: entityType === 'album',
        artistIds: entityType === 'artist',
      },
    });

    const entityIds = activities
      .flatMap(activity =>
        entityType === 'album' ? activity.albumIds : activity.artistIds
      )
      .filter((id, index, arr) => arr.indexOf(id) === index); // Unique

    return entityIds || [];
  }
}

// Export helper functions for GraphQL integration
export function createActivityTracker(
  prisma: PrismaClient,
  sessionId: string,
  userId?: string | null,
  requestId?: string
): ActivityTracker {
  return new ActivityTracker(prisma, sessionId, userId, requestId);
}

export function extractSessionId(request?: any): string {
  // Try to extract session ID from request headers, cookies, or generate new one
  const sessionId =
    request?.headers?.['x-session-id'] ||
    request?.cookies?.sessionId ||
    randomUUID();
  return sessionId;
}

export function extractUserAgent(request?: any): string | undefined {
  return request?.headers?.['user-agent'];
}

export function extractIpAddress(request?: any): string | undefined {
  return (
    request?.headers?.['x-forwarded-for']?.split(',')[0] ||
    request?.headers?.['x-real-ip'] ||
    request?.connection?.remoteAddress ||
    request?.socket?.remoteAddress
  );
}
