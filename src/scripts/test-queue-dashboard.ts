// src/scripts/test-queue-dashboard.ts
/**
 * Mock queue test for QueueDash dashboard testing
 * Generates fake jobs without calling external APIs
 */

import { getMusicBrainzQueue } from '@/lib/queue';

interface MockJobData {
  mockType: 'search-artists' | 'search-releases' | 'get-artist' | 'get-release';
  query?: string;
  artistId?: string;
  releaseId?: string;
  requestId: string;
}

interface MockJobResult {
  success: boolean;
  resultCount: number;
  data: any[];
  processingTime: number;
}

/**
 * Mock processor that simulates MusicBrainz API calls
 */
async function mockMusicBrainzProcessor(job: any): Promise<MockJobResult> {
  const { mockType, query, requestId } = job.data as MockJobData;
  
  // Simulate processing time (100-500ms)
  const processingTime = Math.floor(Math.random() * 400) + 100;
  await new Promise(resolve => setTimeout(resolve, processingTime));
  
  // Generate mock results based on job type
  let resultCount = 0;
  let data: any[] = [];
  
  switch (mockType) {
    case 'search-artists':
      resultCount = Math.floor(Math.random() * 8) + 1; // 1-8 results
      data = Array.from({ length: resultCount }, (_, i) => ({
        id: `artist-${Date.now()}-${i}`,
        name: `Mock Artist ${i + 1} (${query})`,
        country: ['US', 'UK', 'CA', 'AU'][Math.floor(Math.random() * 4)],
        type: ['Person', 'Group'][Math.floor(Math.random() * 2)]
      }));
      break;
      
    case 'search-releases':
      resultCount = Math.floor(Math.random() * 5) + 1; // 1-5 results
      data = Array.from({ length: resultCount }, (_, i) => ({
        id: `release-${Date.now()}-${i}`,
        title: `Mock Release ${i + 1} (${query})`,
        date: `${2020 + Math.floor(Math.random() * 4)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-01`,
        status: ['Official', 'Bootleg', 'Promo'][Math.floor(Math.random() * 3)]
      }));
      break;
      
    case 'get-artist':
    case 'get-release':
      resultCount = 1;
      data = [{
        id: job.data.artistId || job.data.releaseId,
        name: `Mock ${mockType.includes('artist') ? 'Artist' : 'Release'} Detail`,
        fullData: true
      }];
      break;
  }
  
  // Randomly fail 5% of jobs to test error handling
  const shouldFail = Math.random() < 0.05;
  
  if (shouldFail) {
    throw new Error(`Mock ${mockType} failed for testing purposes`);
  }
  
  console.log(`🎵 Mock ${mockType} completed:`, {
    requestId,
    resultCount,
    processingTime: `${processingTime}ms`
  });
  
  return {
    success: true,
    resultCount,
    data,
    processingTime
  };
}

/**
 * Generate test queue activity with mock jobs
 */
async function generateMockQueueActivity() {
  console.log('🎭 Starting Mock Queue Activity Generator...');
  console.log('🔧 Creating queue and worker...');
  
  const queue = getMusicBrainzQueue();
  const worker = queue.createWorker(mockMusicBrainzProcessor);
  
  console.log('✅ Mock worker started with rate limiting (1 req/sec)');
  
  // Test scenarios
  const testScenarios = [
    // Batch 1: Artist searches
    { mockType: 'search-artists', query: 'Radiohead', requestId: `mock-${Date.now()}-1` },
    { mockType: 'search-artists', query: 'The Beatles', requestId: `mock-${Date.now()}-2` },
    { mockType: 'search-artists', query: 'Pink Floyd', requestId: `mock-${Date.now()}-3` },
    
    // Batch 2: Release searches  
    { mockType: 'search-releases', query: 'OK Computer', requestId: `mock-${Date.now()}-4` },
    { mockType: 'search-releases', query: 'Abbey Road', requestId: `mock-${Date.now()}-5` },
    
    // Batch 3: Detail fetches
    { mockType: 'get-artist', artistId: 'artist-123', requestId: `mock-${Date.now()}-6` },
    { mockType: 'get-release', releaseId: 'release-456', requestId: `mock-${Date.now()}-7` },
    
    // Batch 4: More searches to build history
    { mockType: 'search-artists', query: 'Led Zeppelin', requestId: `mock-${Date.now()}-8` },
    { mockType: 'search-artists', query: 'Queen', requestId: `mock-${Date.now()}-9` },
    { mockType: 'search-releases', query: 'Bohemian Rhapsody', requestId: `mock-${Date.now()}-10` },
  ] as MockJobData[];
  
  console.log(`📋 Queuing ${testScenarios.length} mock jobs...`);
  
  // Queue all jobs
  const jobs = [];
  for (const [index, scenario] of testScenarios.entries()) {
    console.log(`🎯 Queuing mock job ${index + 1}: ${scenario.mockType} - ${scenario.query || scenario.artistId || scenario.releaseId}`);
    
    const job = await queue.addJob(
      scenario.mockType as any, // Cast to satisfy type
      scenario,
      {
        priority: Math.floor(Math.random() * 3), // Random priority 0-2
        attempts: 3,
        removeOnComplete: false, // Keep for dashboard
        removeOnFail: false,
      }
    );
    
    jobs.push(job);
    
    // Small delay between queuing to spread them out
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  console.log('⏳ Waiting for all jobs to complete...');
  console.log('🔥 Jobs will be processed at 1 req/sec due to rate limiting');
  
  // Wait for all jobs to complete (with timeout)
  const startTime = Date.now();
  const timeout = 30000; // 30 seconds max
  
  while (Date.now() - startTime < timeout) {
    const stats = await queue.getStats();
    const totalProcessed = stats.completed + stats.failed;
    
    console.log(`📊 Progress: ${totalProcessed}/${testScenarios.length} jobs processed`);
    console.log(`   Waiting: ${stats.waiting}, Active: ${stats.active}, Completed: ${stats.completed}, Failed: ${stats.failed}`);
    
    if (totalProcessed >= testScenarios.length) {
      console.log('✅ All mock jobs completed!');
      break;
    }
    
    // Wait 2 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Final stats
  const finalStats = await queue.getStats();
  console.log('📈 Final Queue Stats:');
  console.log('   Completed:', finalStats.completed);
  console.log('   Failed:', finalStats.failed);
  console.log('   Total Processing Time:', Math.round((Date.now() - startTime) / 1000), 'seconds');
  
  console.log('🎭 Mock queue activity generation complete!');
  console.log('📊 Check your QueueDash at: http://localhost:3000/admin/queuedash');
  
  // Don't shut down - keep worker running for dashboard monitoring
  console.log('🔄 Worker still running for dashboard monitoring...');
  console.log('💡 Press Ctrl+C to stop when done testing the dashboard');
}

// Run the test
if (require.main === module) {
  generateMockQueueActivity().catch(console.error);
}

export { generateMockQueueActivity, mockMusicBrainzProcessor };
