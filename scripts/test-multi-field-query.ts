// Test multi-field OR query to match track, artist, OR album
import { getQueuedMusicBrainzService } from '../src/lib/musicbrainz/queue-service';

async function testMultiField() {
  const service = getQueuedMusicBrainzService();

  const testCases = [
    {
      name: 'Pink Floyd',
      queries: [
        'Pink Floyd AND status:official',
        '(recording:"Pink Floyd" OR artist:"Pink Floyd" OR release:"Pink Floyd") AND status:official',
      ]
    },
    {
      name: 'Bladee',
      queries: [
        'bladee AND status:official',
        '(recording:bladee OR artist:bladee OR release:bladee) AND status:official',
      ]
    },
    {
      name: 'Dark Side of the Moon',
      queries: [
        'Dark Side of the Moon AND status:official',
        '(recording:"Dark Side of the Moon" OR artist:"Dark Side of the Moon" OR release:"Dark Side of the Moon") AND status:official',
      ]
    }
  ];

  console.log('🧪 Testing Multi-Field OR Queries\n');
  console.log('='.repeat(80));

  for (const testCase of testCases) {
    console.log(`\n\n🔍 Query: "${testCase.name}"`);
    console.log('='.repeat(80));

    for (let i = 0; i < testCase.queries.length; i++) {
      const query = testCase.queries[i];
      const label = i === 0 ? 'BASIC QUERY' : 'MULTI-FIELD OR';

      console.log(`\n📝 ${label}`);
      console.log(`   Lucene: ${query}`);

      try {
        const results = await service.searchRecordings(query, 5);

        console.log(`\n   ✅ Results: ${results.length}`);
        console.log(`   Top 5:`);

        results.forEach((r, idx) => {
          const artist = r.artistCredit?.[0]?.artist.name || r.artistCredit?.[0]?.name || 'Unknown';
          console.log(`      ${idx + 1}. "${r.title}" by ${artist} (score: ${r.score})`);
        });

      } catch (error) {
        console.error(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  console.log('\n\n' + '='.repeat(80));
  console.log('✅ Test complete!\n');

  process.exit(0);
}

testMultiField().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
