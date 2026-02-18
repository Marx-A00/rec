import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the redis module to avoid real connections.
// Must mock at this level because redis.ts has top-level singleton side effects.
vi.mock('@/lib/queue/redis', () => ({
  createRedisConnection: vi.fn(() => ({
    on: vi.fn(),
    disconnect: vi.fn(),
    quit: vi.fn(),
  })),
  redisManager: {
    getClient: vi.fn(() => ({
      on: vi.fn(),
      disconnect: vi.fn(),
      quit: vi.fn(),
    })),
    createConnection: vi.fn(() => ({
      on: vi.fn(),
      disconnect: vi.fn(),
      quit: vi.fn(),
    })),
  },
  redis: {
    on: vi.fn(),
    disconnect: vi.fn(),
    quit: vi.fn(),
  },
}));

// Mock BullMQ — Queue constructor needs to work, Worker is tested via injection
vi.mock('bullmq', () => {
  return {
    Queue: vi.fn().mockImplementation(function () {
      return { on: vi.fn(), close: vi.fn(), add: vi.fn() };
    }),
    Worker: vi.fn().mockImplementation(function () {
      return { on: vi.fn(), close: vi.fn() };
    }),
  };
});

import { MusicBrainzQueue } from '@/lib/queue/musicbrainz-queue';

describe('Worker crash recovery', () => {
  let queue: MusicBrainzQueue;

  beforeEach(() => {
    queue = new MusicBrainzQueue();
  });

  describe('destroyWorker', () => {
    it('should null out worker even when close() throws (ECONNRESET)', async () => {
      // Simulate a worker that died from a connection reset
      const brokenWorker = {
        close: vi.fn().mockRejectedValue(new Error('read ECONNRESET')),
        on: vi.fn(),
      };

      // Inject the broken worker (TypeScript private, not JS #private)
      (queue as unknown as Record<string, unknown>).worker = brokenWorker;

      // This is the crash recovery path — should NOT throw
      await expect(queue.destroyWorker()).resolves.toBeUndefined();

      // Worker reference must be nulled so createWorker() can proceed
      expect((queue as unknown as Record<string, unknown>).worker).toBeNull();
    });

    it('should null out worker when close() succeeds normally', async () => {
      const healthyWorker = {
        close: vi.fn().mockResolvedValue(undefined),
        on: vi.fn(),
      };

      (queue as unknown as Record<string, unknown>).worker = healthyWorker;

      await queue.destroyWorker();

      expect(healthyWorker.close).toHaveBeenCalled();
      expect((queue as unknown as Record<string, unknown>).worker).toBeNull();
    });

    it('should be a no-op when no worker exists', async () => {
      // worker starts as null
      await expect(queue.destroyWorker()).resolves.toBeUndefined();
      expect((queue as unknown as Record<string, unknown>).worker).toBeNull();
    });
  });

  describe('createWorker after crash recovery', () => {
    it('should succeed after destroyWorker cleans up a broken worker', async () => {
      const brokenWorker = {
        close: vi.fn().mockRejectedValue(new Error('read ECONNRESET')),
        on: vi.fn(),
      };

      // Simulate crash state: stale worker stuck on the instance
      (queue as unknown as Record<string, unknown>).worker = brokenWorker;

      // Clean up the broken worker
      await queue.destroyWorker();

      // Now createWorker should NOT throw "Worker already exists"
      const dummyProcessor = vi.fn().mockResolvedValue({ success: true });
      const newWorker = queue.createWorker(dummyProcessor);

      expect(newWorker).toBeDefined();
      expect((queue as unknown as Record<string, unknown>).worker).toBe(
        newWorker
      );
    });

    it('should throw if destroyWorker was NOT called first (pre-fix behavior)', async () => {
      const staleWorker = {
        close: vi.fn(),
        on: vi.fn(),
      };

      // Worker is stuck — not cleaned up
      (queue as unknown as Record<string, unknown>).worker = staleWorker;

      // This is what happened in the crash loop before the fix
      const dummyProcessor = vi.fn().mockResolvedValue({ success: true });
      expect(() => queue.createWorker(dummyProcessor)).toThrow(
        'Worker already exists. Call destroyWorker() first.'
      );
    });
  });
});
