import { cacheLogger } from '@/lib/logger';
import { redis } from '@/lib/queue/redis';

const MISS_SENTINEL = '__MISS__';

function isCacheEnabled(): boolean {
  return process.env.REDIS_CACHE_ENABLED !== 'false';
}

interface CacheMetrics {
  hits: number;
  misses: number;
  errors: number;
}

class RedisCache {
  private metrics: CacheMetrics = { hits: 0, misses: 0, errors: 0 };

  getMetrics(): CacheMetrics & { hitRate: number } {
    const total = this.metrics.hits + this.metrics.misses;
    return {
      ...this.metrics,
      hitRate: total > 0 ? this.metrics.hits / total : 0,
    };
  }

  resetMetrics(): void {
    this.metrics = { hits: 0, misses: 0, errors: 0 };
  }

  async get<T>(key: string): Promise<T | null> {
    if (!isCacheEnabled()) return null;
    try {
      const raw = await redis.get(key);
      if (raw === null) {
        this.metrics.misses++;
        cacheLogger.debug({ key, hit: false }, 'Cache miss');
        return null;
      }
      this.metrics.hits++;
      cacheLogger.debug({ key, hit: true }, 'Cache hit');
      return JSON.parse(raw) as T;
    } catch (error) {
      this.metrics.errors++;
      cacheLogger.error({ key, error: (error as Error).message }, 'Cache error');
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (!isCacheEnabled()) return;
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      cacheLogger.debug({ key, ttl: ttlSeconds }, 'Cache set');
    } catch (error) {
      cacheLogger.error({ key, error: (error as Error).message }, 'Cache error');
    }
  }

  async setMiss(key: string, ttlSeconds: number): Promise<void> {
    if (!isCacheEnabled()) return;
    try {
      await redis.set(key, JSON.stringify(MISS_SENTINEL), 'EX', ttlSeconds);
      cacheLogger.debug({ key, ttl: ttlSeconds }, 'Cache set (miss sentinel)');
    } catch (error) {
      cacheLogger.error({ key, error: (error as Error).message }, 'Cache error');
    }
  }

  isMiss(value: unknown): boolean {
    return value === MISS_SENTINEL;
  }

  async invalidate(key: string): Promise<void> {
    try {
      await redis.del(key);
      cacheLogger.debug({ key }, 'Cache invalidated');
    } catch (error) {
      cacheLogger.error({ key, error: (error as Error).message }, 'Cache error');
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      let cursor = '0';
      let count = 0;
      do {
        const [nextCursor, keys] = await redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100
        );
        cursor = nextCursor;
        if (keys.length > 0) {
          await redis.del(...keys);
          count += keys.length;
        }
      } while (cursor !== '0');
      cacheLogger.debug({ pattern, count }, 'Cache invalidated');
    } catch (error) {
      cacheLogger.error(
        { pattern, error: (error as Error).message },
        'Cache error'
      );
    }
  }
}

export const cache = new RedisCache();
