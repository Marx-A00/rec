import { redis } from '@/lib/queue/redis';

const MISS_SENTINEL = '__MISS__';

class RedisCache {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await redis.get(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch (error) {
      console.error(`[cache] get error for key=${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
      console.error(`[cache] set error for key=${key}:`, error);
    }
  }

  async setMiss(key: string, ttlSeconds: number): Promise<void> {
    try {
      await redis.set(key, JSON.stringify(MISS_SENTINEL), 'EX', ttlSeconds);
    } catch (error) {
      console.error(`[cache] setMiss error for key=${key}:`, error);
    }
  }

  isMiss(value: unknown): boolean {
    return value === MISS_SENTINEL;
  }

  async invalidate(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      console.error(`[cache] invalidate error for key=${key}:`, error);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      let cursor = '0';
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
        }
      } while (cursor !== '0');
    } catch (error) {
      console.error(
        `[cache] invalidatePattern error for pattern=${pattern}:`,
        error
      );
    }
  }
}

export const cache = new RedisCache();
