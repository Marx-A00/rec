// src/lib/queue/enrichment-events.ts
// Shared types and helpers for enrichment status SSE events

import type { Redis } from 'ioredis';

export const ENRICHMENT_CHANNEL = 'enrichment:status';

export interface EnrichmentStatusEvent {
  entityType: 'ALBUM' | 'ARTIST';
  entityId: string;
  status: 'UNENRICHED' | 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  timestamp: string;
  entityName?: string;
}

/**
 * Publish an enrichment status change to Redis pub/sub.
 * Call this after every Prisma update that changes enrichmentStatus.
 * Non-fatal: the DB update already succeeded, SSE notification is best-effort.
 */
export async function publishEnrichmentEvent(
  redisClient: Redis,
  event: EnrichmentStatusEvent
): Promise<void> {
  try {
    await redisClient.publish(ENRICHMENT_CHANNEL, JSON.stringify(event));
  } catch (error) {
    console.warn('Failed to publish enrichment event:', error);
  }
}
