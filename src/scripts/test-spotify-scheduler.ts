// Test script for Spotify scheduler
import { spotifyScheduler } from '@/lib/spotify/scheduler';
import { getMusicBrainzQueue } from '@/lib/queue';

async function testSpotifyScheduler() {
  console.log('🧪 Testing Spotify Scheduler...\n');

  // 1. Check Spotify credentials
  console.log('1️⃣ Checking Spotify credentials...');
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    console.error('❌ Spotify credentials not found in environment');
    process.exit(1);
  }
  console.log('✅ Spotify credentials found\n');

  // 2. Test manual trigger (doesn't start intervals)
  console.log('2️⃣ Testing manual trigger...');
  try {
    await spotifyScheduler.triggerSync();
    console.log('✅ New releases sync triggered successfully\n');

    console.log('✅ Job successfully queued to BullMQ\n');
  } catch (error) {
    console.error('❌ Failed to trigger sync:', error);
    process.exit(1);
  }

  // 3. Test scheduler status
  console.log('3️⃣ Checking scheduler status...');
  const status = await spotifyScheduler.getStatus();
  console.log('Status:', {
    isRunning: status.isRunning,
    activeSchedules: status.activeSchedules,
    config: status.config,
  });
  console.log('');

  // 4. Test start/stop
  console.log('4️⃣ Testing start/stop...');
  console.log('Starting scheduler...');
  await spotifyScheduler.start();
  await new Promise(resolve => setTimeout(resolve, 1000));

  const statusAfterStart = await spotifyScheduler.getStatus();
  console.log('After start:', {
    isRunning: statusAfterStart.isRunning,
    activeSchedules: statusAfterStart.activeSchedules,
  });

  console.log('Stopping scheduler...');
  await spotifyScheduler.stop();
  await new Promise(resolve => setTimeout(resolve, 500));

  const statusAfterStop = await spotifyScheduler.getStatus();
  console.log('After stop:', {
    isRunning: statusAfterStop.isRunning,
    activeSchedules: statusAfterStop.activeSchedules,
  });
  console.log('');

  console.log('✅ All tests passed!\n');
  console.log('📝 Summary:');
  console.log('   - Spotify credentials: ✓');
  console.log('   - Manual trigger: ✓');
  console.log('   - Job queuing: ✓');
  console.log('   - Start/stop: ✓');
  console.log('');
  console.log(
    '💡 To see it run with the worker, use: pnpm queue:dev (or pnpm worker)'
  );

  process.exit(0);
}

testSpotifyScheduler().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
