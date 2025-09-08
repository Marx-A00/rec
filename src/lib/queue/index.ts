// src/lib/queue/index.ts

// Redis client and connection management
export {
  redisManager,
  redis,
  createRedisConnection,
  type RedisConfig,
  type Redis,
} from './redis';

// Configuration and validation
export {
  getQueueConfig,
  validateQueueConfig,
  defaultQueueConfig,
  REQUIRED_ENV_VARS,
  type QueueConfig,
  type RequiredEnvVar,
} from './config';

// Re-export BullMQ types for convenience
export type { Queue, Worker, Job, JobOptions } from 'bullmq';
