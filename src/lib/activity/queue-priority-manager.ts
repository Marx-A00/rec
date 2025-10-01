// src/lib/activity/queue-priority-manager.ts
// Smart priority management for job queues based on user activity

import { PrismaClient } from '@prisma/client';

import { ActivityTracker, UserActivityContext } from './activity-tracker';

export type JobSource =
  | 'collection_add'
  | 'recommendation_create'
  | 'search'
  | 'browse'
  | 'manual'
  | 'spotify_sync';
export type JobPriority = 'low' | 'medium' | 'high';

export interface PriorityBoost {
  userActivity: number; // 0-3 points for recent user activity
  entityRelevance: number; // 0-3 points for recently viewed entities
  actionImportance: number; // 0-4 points for action type (collection > search > browse)
  systemLoad: number; // -2 to 0 points for system load consideration
}

export class QueuePriorityManager {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Calculate intelligent job priority based on user activity and context
   */
  async calculateJobPriority(
    source: JobSource,
    entityId: string,
    entityType: 'album' | 'artist',
    userId?: string | null,
    sessionId?: string
  ): Promise<{
    priority: number;
    boost: PriorityBoost;
    recommendedDelay?: number;
  }> {
    // Base priority based on action type
    const basePriority = this.getBasePriorityForSource(source);

    // Calculate priority boosts
    const boost: PriorityBoost = {
      userActivity: 0,
      entityRelevance: 0,
      actionImportance: basePriority,
      systemLoad: 0,
    };

    // User activity boost (if we have user context)
    if (sessionId) {
      const activityTracker = new ActivityTracker(
        this.prisma,
        sessionId,
        userId
      );
      const activityContext = await activityTracker.getUserActivityContext();
      boost.userActivity = this.calculateUserActivityBoost(activityContext);
    }

    // Entity relevance boost (recently viewed entities get priority)
    boost.entityRelevance = await this.calculateEntityRelevanceBoost(
      entityId,
      entityType
    );

    // System load consideration
    boost.systemLoad = await this.calculateSystemLoadPenalty();

    // Calculate final priority (1-10 scale)
    const finalPriority = Math.min(
      Math.max(
        boost.actionImportance +
          boost.userActivity +
          boost.entityRelevance +
          boost.systemLoad,
        1
      ),
      10
    );

    // Recommend delay for low-priority background jobs during high activity
    const recommendedDelay = this.calculateRecommendedDelay(
      finalPriority,
      boost
    );

    return {
      priority: finalPriority,
      boost,
      recommendedDelay,
    };
  }

  /**
   * Get base priority for different job sources
   */
  private getBasePriorityForSource(source: JobSource): number {
    const priorities = {
      collection_add: 8, // High - user is committing to their collection
      recommendation_create: 7, // High - user is actively engaging/sharing
      search: 5, // Medium - user is exploring
      browse: 3, // Medium-low - passive discovery
      spotify_sync: 2, // Low - automated background sync
      manual: 2, // Low - background/admin tasks
    };

    return priorities[source] || 1;
  }

  /**
   * Calculate boost based on current user activity
   */
  private calculateUserActivityBoost(context: UserActivityContext): number {
    let boost = 0;

    // Active browsing gets immediate attention
    if (context.isActivelyBrowsing) {
      boost += 2;
    }

    // Recent session activity
    const sessionMinutes = context.sessionDuration / (1000 * 60);
    if (sessionMinutes > 0 && sessionMinutes < 30) {
      boost += 1; // User is in an active session
    }

    return Math.min(boost, 3);
  }

  /**
   * Calculate boost for recently viewed entities
   */
  private async calculateEntityRelevanceBoost(
    entityId: string,
    entityType: 'album' | 'artist'
  ): Promise<number> {
    // Check if this entity was recently active across all users
    const recentlyActiveEntities =
      await ActivityTracker.getRecentlyActiveEntities(
        this.prisma,
        entityType,
        10 // Last 10 minutes
      );

    if (recentlyActiveEntities.includes(entityId)) {
      return 3; // High relevance - multiple users interested
    }

    // Check if entity was active in last hour
    const recentlyActiveEntities1h =
      await ActivityTracker.getRecentlyActiveEntities(
        this.prisma,
        entityType,
        60 // Last hour
      );

    if (recentlyActiveEntities1h.includes(entityId)) {
      return 1; // Medium relevance
    }

    return 0; // No recent activity
  }

  /**
   * Calculate system load penalty
   */
  private async calculateSystemLoadPenalty(): Promise<number> {
    // Check number of active users
    const activeUsers = await ActivityTracker.getActiveUserCount(this.prisma);

    if (activeUsers > 10) {
      return -2; // High load - deprioritize background work
    } else if (activeUsers > 5) {
      return -1; // Medium load - slight deprioritization
    }

    return 0; // Normal load
  }

  /**
   * Calculate recommended delay for job execution
   */
  private calculateRecommendedDelay(
    priority: number,
    boost: PriorityBoost
  ): number | undefined {
    // No delay for high priority jobs
    if (priority >= 7) {
      return undefined;
    }

    // Delay low priority jobs during high user activity
    if (boost.userActivity >= 2 && priority <= 4) {
      return 30000; // 30 second delay
    }

    // Delay background jobs during system load
    if (boost.systemLoad <= -1 && priority <= 3) {
      return 60000; // 1 minute delay
    }

    return undefined;
  }

  /**
   * Check if background jobs should be paused
   */
  async shouldPauseBackgroundJobs(): Promise<boolean> {
    const activeUsers = await ActivityTracker.getActiveUserCount(this.prisma);

    // Always pause if many users are active (high load scenario)
    if (activeUsers > 8) {
      return true;
    }

    // Also pause during ANY recent user activity that could involve MusicBrainz calls
    const recentActivity = await this.hasRecentUserActivity();

    return recentActivity;
  }

  /**
   * Check if there has been recent user activity that should pause background jobs
   */
  private async hasRecentUserActivity(): Promise<boolean> {
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);

    // Check for recent user actions that might trigger MusicBrainz enrichment
    const recentActions = await (this.prisma as any).userActivity.count({
      where: {
        timestamp: { gte: threeMinutesAgo },
        OR: [
          // High-priority actions that definitely trigger enrichment
          { operation: { contains: 'search' } }, // Search queries
          { operation: { contains: 'collection' } }, // Collection actions
          { operation: { contains: 'recommendation' } }, // Recommendations
          { operation: { contains: 'view_album' } }, // Album views
          { operation: { contains: 'view_artist' } }, // Artist views

          // Browse actions that might trigger enrichment
          { operation: { contains: 'browse_trending' } }, // Trending browsing
          { operation: { contains: 'browse_' } }, // General browsing

          // Any GraphQL mutation (creates, updates)
          { operationType: 'mutation' },
        ],
      },
    });

    // Pause background jobs if there's been ANY user activity in last 3 minutes
    return recentActions > 0;
  }

  /**
   * Get job priority configuration for BullMQ
   */
  async getJobOptions(
    source: JobSource,
    entityId: string,
    entityType: 'album' | 'artist',
    userId?: string | null,
    sessionId?: string
  ) {
    const { priority, recommendedDelay } = await this.calculateJobPriority(
      source,
      entityId,
      entityType,
      userId,
      sessionId
    );

    return {
      priority: this.convertToBullMQPriority(priority),
      delay: recommendedDelay,
      attempts: priority >= 7 ? 5 : 3, // More retries for high priority
      backoff: {
        type: 'exponential' as const,
        delay: priority >= 7 ? 2000 : 5000,
      },
      removeOnComplete: priority >= 7 ? 10 : 5,
      removeOnFail: priority >= 7 ? 5 : 3,
    };
  }

  /**
   * Convert our 1-10 priority to BullMQ priority (higher = more priority)
   */
  private convertToBullMQPriority(priority: number): number {
    // BullMQ uses higher numbers for higher priority
    // Our scale: 1-10, BullMQ scale: we'll use 1-100
    return priority * 10;
  }

  /**
   * Log priority decision for debugging
   */
  logPriorityDecision(
    source: JobSource,
    entityId: string,
    priority: number,
    boost: PriorityBoost,
    delay?: number
  ): void {
    console.log(`🎯 Job Priority Decision:`, {
      source,
      entityId: entityId.substring(0, 8),
      finalPriority: priority,
      boosts: {
        action: boost.actionImportance,
        userActivity: boost.userActivity,
        entityRelevance: boost.entityRelevance,
        systemLoad: boost.systemLoad,
      },
      delay: delay ? `${delay}ms` : 'none',
    });
  }
}

// Export helper functions
export function createQueuePriorityManager(
  prisma: PrismaClient
): QueuePriorityManager {
  return new QueuePriorityManager(prisma);
}

export function mapSourceToUserAction(source: JobSource): string {
  const mapping = {
    collection_add: 'Adding album to collection',
    recommendation_create: 'Creating recommendation',
    search: 'Searching for music',
    browse: 'Browsing music',
    spotify_sync: 'Syncing from Spotify',
    manual: 'Manual operation',
  };

  return mapping[source] || 'Unknown action';
}
