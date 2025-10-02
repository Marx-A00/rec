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
}

/**
 * Redis connection configuration
 * Supports both REDIS_URL and individual host/port configuration
 */
function getRedisConfig(): RedisConfig {
  // If REDIS_URL is provided, parse it
  if (process.env.REDIS_URL) {
    const url = new URL(process.env.REDIS_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      password: url.password || undefined,
      db: 0,
      maxRetriesPerRequest: null,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      lazyConnect: true,
    };
  }

  // Fallback to individual environment variables
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0'),
    maxRetriesPerRequest: null,
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    lazyConnect: true,
  };
}

/**
 * Redis client singleton with connection pooling and error handling
 */
class RedisManager {
  private static instance: RedisManager;
  private redis: Redis | null = null;
  private config: RedisConfig;

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
    return redis;
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
      console.error(
        chalk.red.bold('💥 Redis Error:') + chalk.red(` ${err.message}`)
      );
    });

    client.on('close', () => {
      // Redis connection closed (verbose logging disabled)
    });

    client.on('reconnecting', (time: number) => {
      console.log(`🔄 Redis reconnecting (${time}ms)`);
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
      // Redis test successful (verbose logging disabled)
      return true;
    } catch (error) {
      console.error(
        chalk.red.bold('❌ Redis') + chalk.red(' connection test failed:'),
        chalk.red(error as any)
      );
      return false;
    }
  }

  /**
   * Gracefully close all Redis connections
   */
  public async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
      // Redis disconnected (verbose logging disabled)
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
