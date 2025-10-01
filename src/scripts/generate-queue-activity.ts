// src/scripts/generate-queue-activity.ts
/**
 * Script to generate queue activity for testing the QueueDash dashboard
 */

import { getQueuedMusicBrainzService } from '@/lib/musicbrainz';

async function generateActivity() {
  console.log('🚀 Generating queue activity for dashboard testing...');

  const service = getQueuedMusicBrainzService();

  try {
    // Generate a few searches to populate the dashboard
    const searches = [
      'Radiohead',
      'Aphex Twin',
      'Burial',
      'Flying Lotus',
      'Thom Yorke',
    ];

    console.log(`📋 Queuing ${searches.length} search operations...`);

    // Queue all searches (they'll be processed at 1 req/sec)
    const promises = searches.map(async (artist, index) => {
      console.log(`🎯 Search ${index + 1}: ${artist}`);
      const results = await service.searchArtists(artist, 5);
      console.log(`✅ Found ${results.length} results for ${artist}`);
      return results;
    });

    // Wait for all to complete
    await Promise.all(promises);

    console.log('🎉 All search operations completed!');
    console.log('\n📊 Queue Statistics:');
    console.log(JSON.stringify(await service.getQueueStats(), null, 2));
  } catch (error) {
    console.error('❌ Error generating activity:', error);
  } finally {
    // Keep the service running for dashboard viewing
    console.log('\n🔄 Service will remain active for dashboard monitoring...');
    console.log(
      '💡 Visit http://localhost:3000/api/queue-dashboard to view the dashboard'
    );
    console.log('⏹️  Press Ctrl+C to stop the service');

    // Keep process alive
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down service...');
      await service.shutdown();
      process.exit(0);
    });
  }
}

generateActivity().catch(console.error);
