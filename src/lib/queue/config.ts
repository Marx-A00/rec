// src/lib/queue/config.ts

/**
 * Queue system configuration and validation
 */
export interface QueueConfig {
  redis: {
    url?: string;
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  bullmq: {
    defaultJobOptions: {
      attempts: number;
      backoff: {
        type: 'exponential' | 'fixed';
        delay: number;
      };
      removeOnComplete: number;
      removeOnFail: number;
    };
  };
}

/**
 * Default configuration for the queue system
 */
export const defaultQueueConfig: QueueConfig = {
  redis: {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
  },
  bullmq: {
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 100, // Keep last 100 completed jobs
      removeOnFail: 50, // Keep last 50 failed jobs for debugging
    },
  },
};

/**
 * Validate queue configuration
 */
export function validateQueueConfig(config: QueueConfig): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate Redis configuration
  if (!config.redis.host) {
    errors.push('Redis host is required');
  }

  if (
    isNaN(config.redis.port) ||
    config.redis.port <= 0 ||
    config.redis.port > 65535
  ) {
    errors.push('Redis port must be a valid port number (1-65535)');
  }

  if (isNaN(config.redis.db) || config.redis.db < 0) {
    errors.push('Redis database number must be a non-negative integer');
  }

  // Validate BullMQ configuration
  if (config.bullmq.defaultJobOptions.attempts <= 0) {
    errors.push('Job attempts must be greater than 0');
  }

  if (config.bullmq.defaultJobOptions.backoff.delay <= 0) {
    errors.push('Backoff delay must be greater than 0');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get validated queue configuration
 */
export function getQueueConfig(): QueueConfig {
  const config = { ...defaultQueueConfig };

  const validation = validateQueueConfig(config);
  if (!validation.isValid) {
    throw new Error(
      `Queue configuration validation failed:\n${validation.errors.join('\n')}`
    );
  }

  return config;
}

/**
 * Environment variables documentation
 */
export const REQUIRED_ENV_VARS = {
  REDIS_URL: 'Complete Redis connection URL (alternative to host/port)',
  REDIS_HOST: 'Redis server hostname (default: localhost)',
  REDIS_PORT: 'Redis server port (default: 6379)',
  REDIS_PASSWORD: 'Redis authentication password (optional)',
  REDIS_DB: 'Redis database number (default: 0)',
} as const;

export type RequiredEnvVar = keyof typeof REQUIRED_ENV_VARS;
