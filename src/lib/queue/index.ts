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

// Job types and interfaces
export {
  JOB_TYPES,
  type JobType,
  type MusicBrainzJobData,
  type MusicBrainzJobOptions,
  type JobResult,
  type MusicBrainzQueueMetrics,
  type QueueStats,
} from './jobs';

// MusicBrainz queue system
export {
  MusicBrainzQueue,
  getMusicBrainzQueue,
  destroyMusicBrainzQueue,
} from './musicbrainz-queue';

// Job processor
export { processMusicBrainzJob } from './musicbrainz-processor';

// Re-export BullMQ types for convenience
export type { Queue, Worker, Job, JobsOptions } from 'bullmq';
