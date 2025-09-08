// src/lib/queue/test-redis.ts
/**
 * Simple Redis connection test script
 * Run with: npx tsx src/lib/queue/test-redis.ts
 */

import { redisManager, getQueueConfig } from './index';

async function testRedisConnection() {
  console.log('🔧 Testing Redis connection...\n');

  try {
    // Show configuration (without password)
    const config = redisManager.getConfig();
    console.log('📋 Redis Configuration:');
    console.log(JSON.stringify(config, null, 2));
    console.log();

    // Test connection
    console.log('🔗 Testing Redis connection...');
    const isConnected = await redisManager.testConnection();

    if (isConnected) {
      console.log('✅ Redis connection successful!');
      
      // Test basic operations
      const redis = redisManager.getClient();
      await redis.set('test:key', 'test-value', 'EX', 10); // Expire in 10 seconds
      const value = await redis.get('test:key');
      console.log(`✅ Redis set/get test: ${value === 'test-value' ? 'PASSED' : 'FAILED'}`);
      
      // Clean up
      await redis.del('test:key');
      console.log('🧹 Test cleanup completed');
      
    } else {
      console.log('❌ Redis connection failed!');
      console.log('\n💡 Make sure Redis is running:');
      console.log('   - Install: brew install redis (macOS) or apt install redis (Ubuntu)');
      console.log('   - Start: redis-server');
      console.log('   - Or use Docker: docker run -d -p 6379:6379 redis:alpine');
    }

  } catch (error) {
    console.error('❌ Redis test failed:', error);
  } finally {
    // Graceful shutdown
    await redisManager.disconnect();
    console.log('\n✅ Test completed');
    process.exit(0);
  }
}

// Validate queue configuration
console.log('⚙️ Validating queue configuration...');
try {
  const queueConfig = getQueueConfig();
  console.log('✅ Queue configuration valid\n');
  
  // Run the test
  testRedisConnection();
} catch (error) {
  console.error('❌ Queue configuration validation failed:', error);
  process.exit(1);
}
