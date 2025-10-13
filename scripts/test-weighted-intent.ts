// Quick test to show weighted intent detection
import { PrismaClient } from '@prisma/client';
import { SearchOrchestrator } from '../src/lib/search/SearchOrchestrator';

const prisma = new PrismaClient();

async function test() {
  const orchestrator = new SearchOrchestrator(prisma);

  console.log('\n🧪 Testing Weighted Intent Detection\n');
  console.log('='.repeat(70));

  const result = await orchestrator.intelligentSearch('Pink Floyd', 5, {
    includeMetadata: true
  });

  const meta = result.intelligentMetadata!;

  console.log(`\n📝 Query: "Pink Floyd"`);
  console.log(`\n🎯 Detection:`);
  console.log(`   Primary Intent: ${meta.intent.detected}`);
  console.log(`   Confidence: ${(meta.intent.confidence * 100).toFixed(1)}%`);
  console.log(`   ${meta.intent.reasoning}`);

  console.log(`\n⚖️  Result Mixing Weights:`);
  console.log(`   Track weight:  ${(meta.intent.weights.track * 100).toFixed(1)}%`);
  console.log(`   Artist weight: ${(meta.intent.weights.artist * 100).toFixed(1)}%`);
  console.log(`   Album weight:  ${(meta.intent.weights.album * 100).toFixed(1)}%`);

  console.log(`\n📊 Match Scores:`);
  console.log(`   Track:  ${(meta.matching.trackMatchScore * 100).toFixed(1)}%`);
  console.log(`   Artist: ${(meta.matching.artistMatchScore * 100).toFixed(1)}%`);
  console.log(`   Album:  ${(meta.matching.albumMatchScore * 100).toFixed(1)}%`);

  console.log(`\n📀 Top 5 Results:`);
  result.results.forEach((r, i) => {
    console.log(`   ${i + 1}. "${r.title}" by ${r.artist}`);
  });

  console.log('\n' + '='.repeat(70));
  console.log('\n✨ Explanation:');
  console.log('   The weights determine how results are mixed:');
  console.log('   - Higher track weight = more songs named "Pink Floyd"');
  console.log('   - Higher artist weight = more songs BY Pink Floyd');
  console.log('   - Higher album weight = more albums by Pink Floyd\n');

  await prisma.$disconnect();

  // Force exit because BullMQ connections stay open
  process.exit(0);
}

test().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
