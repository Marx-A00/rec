// src/lib/queue/redis.ts
import Redis from 'ioredis';
import chalk from 'chalk';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  maxRetriesPerRequest?: number | null;
  retryDelayOnFailover?: number;
  enableReadyCheck?: boolean;
  lazyConnect?: boolean;
  keepAlive?: number;
  retryStrategy?: (times: number) => number;
}

// Transient errors that auto-recover — no need to alarm on these
const TRANSIENT_ERRORS = ['ECONNRESET', 'EPIPE', 'ETIMEDOUT'];

/**
 * Redis connection configuration
 * Supports both REDIS_URL and individual host/port configuration
 */
function getRedisConfig(): RedisConfig {
  const baseConfig: Omit<RedisConfig, 'host' | 'port' | 'password' | 'db'> = {
    maxRetriesPerRequest: null,
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    lazyConnect: true,
    keepAlive: 10000,
    // Exponential backoff: min 1s, max 20s (recommended by BullMQ docs)
    retryStrategy: (times: number) =>
      Math.max(Math.min(Math.exp(times), 20000), 1000),
  };

  // If REDIS_URL is provided, parse it
  if (process.env.REDIS_URL) {
    const url = new URL(process.env.REDIS_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      password: url.password || undefined,
      db: 0,
      ...baseConfig,
    };
  }

  // Fallback to individual environment variables
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0'),
    ...baseConfig,
  };
}

// Ping interval in ms — keeps connections alive through load balancer idle timeouts
const PING_INTERVAL_MS = 30_000;

/**
 * Redis client singleton with connection pooling and error handling
 */
class RedisManager {
  private static instance: RedisManager;
  private redis: Redis | null = null;
  private config: RedisConfig;
  private pingIntervals: Set<ReturnType<typeof setInterval>> = new Set();

  private constructor() {
    this.config = getRedisConfig();
  }

  public static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      RedisManager.instance = new RedisManager();
    }
    return RedisManager.instance;
  }

  /**
   * Get Redis client instance with automatic connection management
   * Returns a mock client during build time to avoid connection errors
   */
  public getClient(): Redis {
    // Skip Redis connection during build time
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return this.getMockClient();
    }

    if (!this.redis) {
      this.redis = new Redis(this.config);
      this.setupEventHandlers();
      this.startPingInterval(this.redis);
    }
    return this.redis;
  }

  /**
   * Get a mock Redis client for build time
   */
  private getMockClient(): Redis {
    return {
      ping: async () => 'PONG',
      get: async () => null,
      set: async () => 'OK',
      del: async () => 0,
      quit: async () => 'OK',
      disconnect: () => {},
      on: () => {},
    } as unknown as Redis;
  }

  /**
   * Create a new Redis connection (for BullMQ which needs separate connections)
   * Returns a mock client during build time
   */
  public createConnection(): Redis {
    // Skip Redis connection during build time
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return this.getMockClient();
    }

    const redis = new Redis(this.config);
    this.setupEventHandlers(redis);
    this.startPingInterval(redis);
    return redis;
  }

  /**
   * Send periodic PING to keep the connection alive through load balancer idle timeouts.
   * TCP keepalive alone isn't enough — managed Redis proxies (Railway, AWS NLB, etc.)
   * ignore OS-level keepalive packets and only track real Redis commands as activity.
   */
  private startPingInterval(client: Redis): void {
    const interval = setInterval(() => {
      if (client.status === 'ready') {
        client.ping().catch(() => {
          // Ping failed — connection is probably down, ioredis will reconnect
        });
      }
    }, PING_INTERVAL_MS);

    // Don't let the interval keep the process alive during shutdown
    interval.unref();
    this.pingIntervals.add(interval);
  }

  /**
   * Setup event handlers for Redis connection
   */
  private setupEventHandlers(redis?: Redis): void {
    const client = redis || this.redis;
    if (!client) return;

    client.on('connect', () => {
      // Redis connected (verbose logging disabled)
    });

    client.on('ready', () => {
      // Redis ready (verbose logging disabled)
    });

    client.on('error', err => {
      const isTransient = TRANSIENT_ERRORS.some(
        code =>
          err.message.includes(code) ||
          (err as NodeJS.ErrnoException).code === code
      );

      if (isTransient) {
        // Transient proxy/network blip — ioredis will auto-reconnect
        console.log(
          chalk.yellow(
            `⚡ Redis: ${err.message} (transient — will reconnect automatically)`
          )
        );
      } else {
        // Unexpected error — this one deserves attention
        console.error(
          chalk.red.bold('❌ Redis Error:') + chalk.red(` ${err.message}`)
        );
      }
    });

    client.on('close', () => {
      // Redis connection closed (verbose logging disabled)
    });

    client.on('reconnecting', (time: number) => {
      console.log(chalk.gray(`↻ Redis reconnecting (${time}ms)`));
    });

    client.on('end', () => {
      // Redis connection ended (verbose logging disabled)
    });
  }

  /**
   * Test Redis connection
   */
  public async testConnection(): Promise<boolean> {
    try {
      const client = this.getClient();
      await client.ping();
      return true;
    } catch (error) {
      console.error(
        chalk.red.bold('❌ Redis') + chalk.red(' connection test failed:'),
        chalk.red(error as NodeJS.ErrnoException)
      );
      return false;
    }
  }

  /**
   * Gracefully close all Redis connections
   */
  public async disconnect(): Promise<void> {
    // Clear all ping intervals
    for (const interval of this.pingIntervals) {
      clearInterval(interval);
    }
    this.pingIntervals.clear();

    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
  }

  /**
   * Get connection configuration (for debugging)
   */
  public getConfig(): Omit<RedisConfig, 'password'> {
    const { password, ...config } = this.config;
    return config;
  }
}

// Export singleton instance
export const redisManager = RedisManager.getInstance();

// Export Redis client for direct use
export const redis = redisManager.getClient();

// Export connection creator for BullMQ
export const createRedisConnection = () => redisManager.createConnection();

// Export types
export type { Redis };
