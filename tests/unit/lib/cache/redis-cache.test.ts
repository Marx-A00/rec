import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/queue/redis', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    scan: vi.fn(),
  },
}));

import { cache } from '@/lib/cache/redis-cache';
import { redis } from '@/lib/queue/redis';

const mockRedis = vi.mocked(redis);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RedisCache', () => {
  describe('get', () => {
    it('should return parsed value on cache hit', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({ name: 'Radiohead' }));
      const result = await cache.get<{ name: string }>('cache:test');
      expect(result).toEqual({ name: 'Radiohead' });
      expect(mockRedis.get).toHaveBeenCalledWith('cache:test');
    });

    it('should return null on cache miss', async () => {
      mockRedis.get.mockResolvedValue(null);
      const result = await cache.get('cache:missing');
      expect(result).toBeNull();
    });

    it('should return null and log on error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockRedis.get.mockRejectedValue(new Error('connection lost'));
      const result = await cache.get('cache:broken');
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[cache] get error'),
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('should handle primitives: string', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify('hello'));
      expect(await cache.get<string>('k')).toBe('hello');
    });

    it('should handle primitives: number', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(42));
      expect(await cache.get<number>('k')).toBe(42);
    });

    it('should handle arrays', async () => {
      const arr = [1, 2, 3];
      mockRedis.get.mockResolvedValue(JSON.stringify(arr));
      expect(await cache.get<number[]>('k')).toEqual(arr);
    });
  });

  describe('set', () => {
    it('should serialize and store with TTL', async () => {
      mockRedis.set.mockResolvedValue('OK');
      await cache.set('cache:album:1', { title: 'OK Computer' }, 3600);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'cache:album:1',
        JSON.stringify({ title: 'OK Computer' }),
        'EX',
        3600
      );
    });

    it('should not throw on error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockRedis.set.mockRejectedValue(new Error('write failed'));
      await expect(cache.set('k', 'v', 60)).resolves.toBeUndefined();
      consoleSpy.mockRestore();
    });
  });

  describe('setMiss / isMiss', () => {
    it('should store sentinel value', async () => {
      mockRedis.set.mockResolvedValue('OK');
      await cache.setMiss('cache:img:abc', 600);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'cache:img:abc',
        JSON.stringify('__MISS__'),
        'EX',
        600
      );
    });

    it('should detect sentinel via isMiss', () => {
      expect(cache.isMiss('__MISS__')).toBe(true);
    });

    it('should not false-positive on normal values', () => {
      expect(cache.isMiss('some-url')).toBe(false);
      expect(cache.isMiss(null)).toBe(false);
      expect(cache.isMiss(undefined)).toBe(false);
      expect(cache.isMiss({ url: '__MISS__' })).toBe(false);
    });

    it('should round-trip sentinel through get', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify('__MISS__'));
      const value = await cache.get<string>('cache:img:abc');
      expect(cache.isMiss(value)).toBe(true);
    });
  });

  describe('invalidate', () => {
    it('should delete the key', async () => {
      mockRedis.del.mockResolvedValue(1);
      await cache.invalidate('cache:album:1');
      expect(mockRedis.del).toHaveBeenCalledWith('cache:album:1');
    });
  });

  describe('invalidatePattern', () => {
    it('should scan and delete matching keys', async () => {
      mockRedis.scan
        .mockResolvedValueOnce(['42', ['cache:a:1', 'cache:a:2']])
        .mockResolvedValueOnce(['0', ['cache:a:3']]);
      mockRedis.del.mockResolvedValue(1);

      await cache.invalidatePattern('cache:a:*');

      expect(mockRedis.scan).toHaveBeenCalledTimes(2);
      expect(mockRedis.del).toHaveBeenCalledWith('cache:a:1', 'cache:a:2');
      expect(mockRedis.del).toHaveBeenCalledWith('cache:a:3');
    });

    it('should skip del when scan returns no keys', async () => {
      mockRedis.scan.mockResolvedValueOnce(['0', []]);
      await cache.invalidatePattern('cache:nothing:*');
      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });
});
