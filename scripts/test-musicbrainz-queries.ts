// Test different MusicBrainz query syntaxes to see which gives better results
import { getQueuedMusicBrainzService } from '../src/lib/musicbrainz/queue-service';

async function testQueries() {
  const service = getQueuedMusicBrainzService();

  const testCases = [
    {
      name: 'Pink Floyd - Basic Query',
      query: 'Pink Floyd AND status:official',
    },
    {
      name: 'Pink Floyd - Artist Field',
      query: 'artist:"Pink Floyd" AND status:official',
    },
    {
      name: 'Bladee - Basic Query',
      query: 'bladee AND status:official',
    },
    {
      name: 'Bladee - Artist Field',
      query: 'artist:bladee AND status:official',
    },
    {
      name: 'Bladee - Multiple Fields OR',
      query: '(recording:bladee OR artist:bladee) AND status:official',
    },
  ];

  console.log('🧪 Testing MusicBrainz Query Syntaxes\n');
  console.log('='.repeat(80));

  for (const testCase of testCases) {
    console.log(`\n📝 ${testCase.name}`);
    console.log(`   Query: ${testCase.query}`);

    try {
      const results = await service.searchRecordings(testCase.query, 5);

      console.log(`   Results: ${results.length}`);
      console.log(`   Top 3:`);

      results.slice(0, 3).forEach((r, i) => {
        const artist = r.artistCredit?.[0]?.artist.name || r.artistCredit?.[0]?.name || 'Unknown';
        console.log(`      ${i + 1}. "${r.title}" by ${artist} (score: ${r.score})`);
      });

    } catch (error) {
      console.error(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    console.log('   ' + '-'.repeat(76));
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Test complete!\n');

  process.exit(0);
}

testQueries().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
