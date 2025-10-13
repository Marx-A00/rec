// Test script for intelligent search
import { PrismaClient } from '@prisma/client';
import { SearchOrchestrator } from '../src/lib/search/SearchOrchestrator';

const prisma = new PrismaClient();

async function testIntelligentSearch() {
  const orchestrator = new SearchOrchestrator(prisma);

  // Test queries covering different intents
  const testQueries = [
    'Bohemian Rhapsody',        // TRACK intent - specific song
    'Pink Floyd',               // ARTIST intent - band name
    'Dark Side of the Moon',    // ALBUM intent - famous album
    'rock music',               // MIXED intent - general search
  ];

  console.log('🔍 Testing Intelligent Search\n');
  console.log('='.repeat(80));

  for (const query of testQueries) {
    console.log(`\n📝 Query: "${query}"\n`);

    try {
      const result = await orchestrator.intelligentSearch(query, 5, {
        includeMetadata: true,
        minConfidence: 0.0
      });

      // Display metadata
      if (result.intelligentMetadata) {
        const { intent, performance, matching } = result.intelligentMetadata;

        console.log(`🎯 Intent Detection:`);
        console.log(`   Detected: ${intent.detected}`);
        console.log(`   Confidence: ${(intent.confidence * 100).toFixed(1)}%`);
        console.log(`   Reasoning: ${intent.reasoning}`);

        console.log(`\n⚡ Performance:`);
        console.log(`   API Calls: ${performance.apiCalls}`);
        console.log(`   Calls Saved: ${performance.apiCallsSaved}`);
        console.log(`   Duration: ${performance.totalDuration}ms`);

        console.log(`\n📊 Matching Scores:`);
        console.log(`   Track: ${(matching.trackMatchScore * 100).toFixed(1)}%`);
        console.log(`   Artist: ${(matching.artistMatchScore * 100).toFixed(1)}%`);
        console.log(`   Album: ${(matching.albumMatchScore * 100).toFixed(1)}%`);

        console.log(`\n⚖️  Result Weights:`);
        console.log(`   Track: ${(intent.weights.track * 100).toFixed(1)}%`);
        console.log(`   Artist: ${(intent.weights.artist * 100).toFixed(1)}%`);
        console.log(`   Album: ${(intent.weights.album * 100).toFixed(1)}%`);
      }

      // Display top 3 results
      console.log(`\n📀 Top ${Math.min(3, result.results.length)} Results:`);
      result.results.slice(0, 3).forEach((r, idx) => {
        console.log(`\n   ${idx + 1}. "${r.title}" ${r.subtitle ? `(${r.subtitle})` : ''}`);
        console.log(`      Type: ${r.type}`);
        console.log(`      ID: ${r.id}`);
        if (r.artist) console.log(`      Artist: ${r.artist}`);
      });

      console.log('\n' + '='.repeat(80));

    } catch (error) {
      console.error(`❌ Error testing query "${query}":`, error);
    }
  }

  await prisma.$disconnect();
}

// Run the test
testIntelligentSearch()
  .then(() => {
    console.log('\n✅ Test complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
