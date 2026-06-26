// src/lib/queue/test-redis.ts
/**
 * Simple Redis connection test script
 * Run with: npx tsx src/lib/queue/test-redis.ts
 */

import { redisManager, getQueueConfig } from './index';
import { queueLogger } from '@/lib/logger';

async function testRedisConnection() {
  queueLogger.info('Testing Redis connection');

  try {
    // Show configuration (without password)
    const config = redisManager.getConfig();
    queueLogger.info({ config }, 'Redis configuration');

    // Test connection
    queueLogger.info('Testing Redis connection');
    const isConnected = await redisManager.testConnection();

    if (isConnected) {
      queueLogger.info('Redis connection successful');

      // Test basic operations
      const redis = redisManager.getClient();
      await redis.set('test:key', 'test-value', 'EX', 10); // Expire in 10 seconds
      const value = await redis.get('test:key');
      queueLogger.info(
        { result: value === 'test-value' ? 'PASSED' : 'FAILED' },
        'Redis set/get test'
      );

      // Clean up
      await redis.del('test:key');
      queueLogger.info('Test cleanup completed');
    } else {
      queueLogger.error('Redis connection failed — ensure Redis is running');
    }
  } catch (error) {
    queueLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'Redis test failed');
  } finally {
    // Graceful shutdown
    await redisManager.disconnect();
    queueLogger.info('Test completed');
    process.exit(0);
  }
}

// Validate queue configuration
queueLogger.info('Validating queue configuration');
try {
  const queueConfig = getQueueConfig();
  queueLogger.info('Queue configuration valid');

  // Run the test
  testRedisConnection();
} catch (error) {
  queueLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'Queue configuration validation failed');
  process.exit(1);
}
