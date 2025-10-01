// src/lib/graphql/field-cache.ts
// Redis-based caching for expensive GraphQL computed fields

import { Redis } from 'ioredis';
import { createHash } from 'crypto';

// Create Redis client (singleton)
let redisClient: Redis | null = null;

function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: 3,
    });
  }
  return redisClient;
}

// Cache key generation
function getCacheKey(prefix: string, id: string, field: string): string {
  return `graphql:${prefix}:${id}:${field}`;
}

// Cache options interface
interface CacheOptions {
  ttl?: number; // Time to live in seconds
  invalidatePattern?: string; // Pattern for cache invalidation
}

// Generic field cache wrapper
export async function cachedField<T>(
  entityType: string,
  entityId: string,
  fieldName: string,
  computeFn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const redis = getRedisClient();
  const cacheKey = getCacheKey(entityType, entityId, fieldName);
  const { ttl = 300 } = options; // Default 5 minutes

  try {
    // Try to get from cache
    const cached = await redis.get(cacheKey);
    if (cached !== null) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.error(`Cache read error for ${cacheKey}:`, error);
  }

  // Compute value if not cached
  const value = await computeFn();

  // Store in cache (non-blocking)
  redis
    .set(cacheKey, JSON.stringify(value), 'EX', ttl)
    .catch(error => console.error(`Cache write error for ${cacheKey}:`, error));

  return value;
}

// Batch cache invalidation
export async function invalidateCache(pattern: string): Promise<void> {
  const redis = getRedisClient();

  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error(`Cache invalidation error for pattern ${pattern}:`, error);
  }
}

// Specific cache functions for common computed fields

export async function cacheAlbumPopularity(
  albumId: string,
  computeFn: () => Promise<number | null>
): Promise<number | null> {
  return cachedField(
    'album',
    albumId,
    'popularity',
    computeFn,
    { ttl: 3600 } // 1 hour cache
  );
}

export async function cacheAlbumAverageRating(
  albumId: string,
  computeFn: () => Promise<number | null>
): Promise<number | null> {
  return cachedField(
    'album',
    albumId,
    'averageRating',
    computeFn,
    { ttl: 600 } // 10 minutes cache
  );
}

export async function cacheArtistFollowerCount(
  artistId: string,
  computeFn: () => Promise<number>
): Promise<number> {
  return cachedField(
    'artist',
    artistId,
    'followerCount',
    computeFn,
    { ttl: 1800 } // 30 minutes cache
  );
}

// Cache warmup utility
export async function warmupCache(
  entityType: string,
  entities: Array<{ id: string }>,
  fields: string[],
  computeFns: { [field: string]: (entity: any) => Promise<any> }
): Promise<void> {
  const redis = getRedisClient();
  const pipeline = redis.pipeline();

  for (const entity of entities) {
    for (const field of fields) {
      if (computeFns[field]) {
        try {
          const value = await computeFns[field](entity);
          const cacheKey = getCacheKey(entityType, entity.id, field);
          pipeline.set(cacheKey, JSON.stringify(value), 'EX', 300);
        } catch (error) {
          console.error(`Warmup error for ${entityType}:${entity.id}:${field}:`, error);
        }
      }
    }
  }

  await pipeline.exec();
}

// Cleanup on shutdown
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}