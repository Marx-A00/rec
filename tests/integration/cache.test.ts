import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Redis from 'ioredis';

import { cache } from '@/lib/cache/redis-cache';
import { CACHE_KEYS, CACHE_TTLS } from '@/lib/cache/keys';

// Use a separate Redis DB for tests so we don't pollute dev data
const testRedis = new Redis({ host: 'localhost', port: 6379, db: 1 });

beforeAll(async () => {
  // Flush test DB
  await testRedis.flushdb();
});

afterAll(async () => {
  await testRedis.flushdb();
  await testRedis.quit();
});

beforeEach(async () => {
  // Clean between tests
  await testRedis.flushdb();
});

describe('Redis Cache - Integration', () => {
  describe('get/set round-trip', () => {
    it('should store and retrieve a string', async () => {
      await cache.set('test:string', 'hello world', 60);
      const result = await cache.get<string>('test:string');
      expect(result).toBe('hello world');
    });

    it('should store and retrieve an object', async () => {
      const obj = { name: 'Radiohead', albums: 9, genres: ['rock', 'electronic'] };
      await cache.set('test:obj', obj, 60);
      const result = await cache.get<typeof obj>('test:obj');
      expect(result).toEqual(obj);
    });

    it('should store and retrieve an array', async () => {
      const arr = [1, 2, 3, 4, 5];
      await cache.set('test:arr', arr, 60);
      const result = await cache.get<number[]>('test:arr');
      expect(result).toEqual(arr);
    });

    it('should return null for missing keys', async () => {
      const result = await cache.get('test:nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('sentinel miss values', () => {
    it('should set and detect miss sentinel', async () => {
      await cache.setMiss('test:miss', 60);
      const value = await cache.get<string>('test:miss');
      expect(cache.isMiss(value)).toBe(true);
    });

    it('should not false-positive on real values', async () => {
      await cache.set('test:real', 'actual data', 60);
      const value = await cache.get<string>('test:real');
      expect(cache.isMiss(value)).toBe(false);
    });
  });

  describe('invalidation', () => {
    it('should delete a single key', async () => {
      await cache.set('test:delete-me', 'bye', 60);
      await cache.invalidate('test:delete-me');
      const result = await cache.get('test:delete-me');
      expect(result).toBeNull();
    });

    it('should delete keys matching a pattern', async () => {
      await cache.set('cache:count:artist-albums:a1', 5, 60);
      await cache.set('cache:count:artist-tracks:a1', 20, 60);
      await cache.set('cache:count:artist-albums:a2', 3, 60);

      await cache.invalidatePattern('cache:count:*:a1');

      // a1 keys should be gone
      expect(await cache.get('cache:count:artist-albums:a1')).toBeNull();
      expect(await cache.get('cache:count:artist-tracks:a1')).toBeNull();
      // a2 should still be there
      expect(await cache.get('cache:count:artist-albums:a2')).toBe(3);
    });
  });

  describe('TTL expiry', () => {
    it('should expire after TTL', async () => {
      await cache.set('test:expire', 'temporary', 1); // 1 second TTL
      const before = await cache.get<string>('test:expire');
      expect(before).toBe('temporary');

      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 1500));

      const after = await cache.get('test:expire');
      expect(after).toBeNull();
    });
  });

  describe('cache key builders', () => {
    it('should create distinct keys for different inputs', async () => {
      const key1 = CACHE_KEYS.spotifyImage('mbid-1');
      const key2 = CACHE_KEYS.spotifyImage('mbid-2');

      await cache.set(key1, { imageUrl: 'url1' }, 60);
      await cache.set(key2, { imageUrl: 'url2' }, 60);

      expect(await cache.get(key1)).toEqual({ imageUrl: 'url1' });
      expect(await cache.get(key2)).toEqual({ imageUrl: 'url2' });
    });

    it('should normalize search queries to same key', async () => {
      const key1 = CACHE_KEYS.spotifySearch('Radiohead');
      const key2 = CACHE_KEYS.spotifySearch('radiohead');
      const key3 = CACHE_KEYS.spotifySearch('  RADIOHEAD  ');

      expect(key1).toBe(key2);
      expect(key2).toBe(key3);
    });
  });

  describe('count cache pattern', () => {
    it('should cache and retrieve numeric counts', async () => {
      const key = CACHE_KEYS.countArtistAlbums('artist-123');
      await cache.set(key, 42, CACHE_TTLS.COUNT);
      const count = await cache.get<number>(key);
      expect(count).toBe(42);
    });

    it('should invalidate count cache', async () => {
      const key = CACHE_KEYS.countArtistAlbums('artist-456');
      await cache.set(key, 10, 60);
      await cache.invalidate(key);
      expect(await cache.get(key)).toBeNull();
    });
  });
});
