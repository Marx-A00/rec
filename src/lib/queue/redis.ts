// src/lib/queue/redis.ts
import Redis from 'ioredis';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  maxRetriesPerRequest?: number;
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
      maxRetriesPerRequest: 3,
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
    maxRetriesPerRequest: 3,
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
   */
  public getClient(): Redis {
    if (!this.redis) {
      this.redis = new Redis(this.config);
      this.setupEventHandlers();
    }
    return this.redis;
  }

  /**
   * Create a new Redis connection (for BullMQ which needs separate connections)
   */
  public createConnection(): Redis {
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
      console.log('✅ Redis connected successfully');
    });

    client.on('ready', () => {
      console.log('✅ Redis ready for commands');
    });

    client.on('error', (err) => {
      console.error('❌ Redis connection error:', err.message);
    });

    client.on('close', () => {
      console.log('⚠️ Redis connection closed');
    });

    client.on('reconnecting', (time) => {
      console.log(`🔄 Redis reconnecting in ${time}ms`);
    });

    client.on('end', () => {
      console.log('🔚 Redis connection ended');
    });
  }

  /**
   * Test Redis connection
   */
  public async testConnection(): Promise<boolean> {
    try {
      const client = this.getClient();
      await client.ping();
      console.log('✅ Redis connection test successful');
      return true;
    } catch (error) {
      console.error('❌ Redis connection test failed:', error);
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
      console.log('✅ Redis disconnected gracefully');
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
