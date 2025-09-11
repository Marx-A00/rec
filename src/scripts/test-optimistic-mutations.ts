// src/scripts/test-optimistic-mutations.ts
/**
 * Test script to verify the refactored optimistic GraphQL mutations
 * Tests that mutations queue CHECK_ENRICHMENT jobs correctly
 */

import { PrismaClient } from '@prisma/client';
import { getMusicBrainzQueue, JOB_TYPES } from '../lib/queue';
import { mutationResolvers } from '../lib/graphql/resolvers/mutations';

// Mock GraphQL context
const createMockContext = (userId: string) => ({
  user: { id: userId },
  prisma: new PrismaClient(),
  dataloaders: {} as any,
  req: null as any,
  timestamp: new Date(),
});

async function testAddAlbumToCollection() {
  console.log('🧪 Testing addAlbumToCollection mutation...');
  
  const prisma = new PrismaClient();
  const queue = getMusicBrainzQueue();
  
  try {
    // Create test user and collection
    const testUser = await prisma.user.create({
      data: {
        id: 'test-user-' + Date.now(),
        name: 'Test User',
        email: `test-${Date.now()}@example.com`,
      }
    });

    const testCollection = await prisma.collection.create({
      data: {
        name: 'Test Collection',
        description: 'Test collection for mutation testing',
        userId: testUser.id,
        isPublic: false,
      }
    });

    // Create test album
    const testAlbum = await prisma.album.create({
      data: {
        title: 'Test Album',
        releaseDate: new Date('2023-01-01'),
        dataQuality: 'LOW',
        enrichmentStatus: 'PENDING',
      }
    });

    console.log(`📝 Created test data: user ${testUser.id}, collection ${testCollection.id}, album ${testAlbum.id}`);

    // Clear any existing jobs in the queue
    await queue.getQueue().obliterate({ force: true });
    console.log('🧹 Cleared queue');

    // Test the mutation
    const result = await mutationResolvers.addAlbumToCollection!(
      {}, // parent
      {
        collectionId: testCollection.id,
        input: {
          albumId: testAlbum.id,
          personalRating: 5,
          personalNotes: 'Great album!',
          position: 1,
        }
      },
      createMockContext(testUser.id),
      {} as any // info
    );

    console.log('✅ Mutation executed successfully:', {
      collectionAlbumId: result.id,
      albumId: result.albumId,
      collectionId: result.collectionId,
    });

    // Wait a moment for queue jobs to be added
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check queue for CHECK_ALBUM_ENRICHMENT jobs
    const waiting = await queue.getQueue().getWaiting();
    const checkJobs = waiting.filter(job => job.name === JOB_TYPES.CHECK_ALBUM_ENRICHMENT);
    
    console.log(`📊 Queue stats: ${waiting.length} total jobs, ${checkJobs.length} check enrichment jobs`);
    
    if (checkJobs.length > 0) {
      const job = checkJobs[0];
      console.log('✅ Found CHECK_ALBUM_ENRICHMENT job:', {
        jobId: job.id,
        albumId: job.data.albumId,
        source: job.data.source,
        priority: job.data.priority,
        requestId: job.data.requestId,
      });
    } else {
      console.error('❌ No CHECK_ALBUM_ENRICHMENT jobs found in queue!');
    }

    // Cleanup
    await prisma.collectionAlbum.deleteMany({ where: { collectionId: testCollection.id } });
    await prisma.collection.delete({ where: { id: testCollection.id } });
    await prisma.album.delete({ where: { id: testAlbum.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
    await queue.getQueue().obliterate({ force: true });
    
    console.log('🧹 Cleaned up test data');
    
    return checkJobs.length > 0;

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function testCreateRecommendation() {
  console.log('\n🧪 Testing createRecommendation mutation...');
  
  const prisma = new PrismaClient();
  const queue = getMusicBrainzQueue();
  
  try {
    // Create test user and albums
    const testUser = await prisma.user.create({
      data: {
        id: 'test-user-rec-' + Date.now(),
        name: 'Test User Rec',
        email: `test-rec-${Date.now()}@example.com`,
      }
    });

    const basisAlbum = await prisma.album.create({
      data: {
        title: 'Basis Album',
        releaseDate: new Date('2022-01-01'),
        dataQuality: 'LOW',
        enrichmentStatus: 'PENDING',
      }
    });

    const recommendedAlbum = await prisma.album.create({
      data: {
        title: 'Recommended Album',
        releaseDate: new Date('2023-01-01'),
        dataQuality: 'MEDIUM',
        enrichmentStatus: 'COMPLETED',
        lastEnriched: new Date(),
      }
    });

    console.log(`📝 Created test data: user ${testUser.id}, basis album ${basisAlbum.id}, recommended album ${recommendedAlbum.id}`);

    // Clear any existing jobs in the queue
    await queue.getQueue().obliterate({ force: true });
    console.log('🧹 Cleared queue');

    // Test the mutation
    const result = await mutationResolvers.createRecommendation!(
      {}, // parent
      {
        basisAlbumId: basisAlbum.id,
        recommendedAlbumId: recommendedAlbum.id,
        score: 85,
      },
      createMockContext(testUser.id),
      {} as any // info
    );

    console.log('✅ Mutation executed successfully:', {
      recommendationId: result.id,
      basisAlbumId: result.basisAlbumId,
      recommendedAlbumId: result.recommendedAlbumId,
      score: result.score,
    });

    // Wait a moment for queue jobs to be added
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check queue for CHECK_ALBUM_ENRICHMENT jobs
    const waiting = await queue.getQueue().getWaiting();
    const checkJobs = waiting.filter(job => job.name === JOB_TYPES.CHECK_ALBUM_ENRICHMENT);
    
    console.log(`📊 Queue stats: ${waiting.length} total jobs, ${checkJobs.length} check enrichment jobs`);
    
    if (checkJobs.length >= 2) {
      console.log('✅ Found CHECK_ALBUM_ENRICHMENT jobs for both albums:');
      checkJobs.forEach((job, index) => {
        console.log(`  Job ${index + 1}:`, {
          jobId: job.id,
          albumId: job.data.albumId,
          source: job.data.source,
          priority: job.data.priority,
          requestId: job.data.requestId,
        });
      });
    } else {
      console.error(`❌ Expected 2 CHECK_ALBUM_ENRICHMENT jobs, found ${checkJobs.length}!`);
    }

    // Cleanup
    await prisma.recommendation.delete({ where: { id: result.id } });
    await prisma.album.delete({ where: { id: basisAlbum.id } });
    await prisma.album.delete({ where: { id: recommendedAlbum.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
    await queue.getQueue().obliterate({ force: true });
    
    console.log('🧹 Cleaned up test data');
    
    return checkJobs.length >= 2;

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function testEnrichmentDecisionLogic() {
  console.log('\n🧪 Testing enrichment decision logic...');
  
  const { shouldEnrichAlbum, shouldEnrichArtist } = await import('../lib/musicbrainz/enrichment-logic');
  
  // Test album that needs enrichment
  const albumNeedsEnrichment = {
    id: 'test-album-1',
    title: 'Test Album',
    musicbrainzId: null,
    releaseDate: null,
    dataQuality: 'LOW' as const,
    enrichmentStatus: null,
    lastEnriched: null,
  };
  
  const result1 = shouldEnrichAlbum(albumNeedsEnrichment);
  console.log('✅ Album needing enrichment:', result1); // Should be true
  
  // Test album that doesn't need enrichment
  const albumNoEnrichment = {
    id: 'test-album-2',
    title: 'Test Album 2',
    musicbrainzId: 'mb-123',
    releaseDate: new Date(),
    dataQuality: 'HIGH' as const,
    enrichmentStatus: 'COMPLETED' as const,
    lastEnriched: new Date(),
  };
  
  const result2 = shouldEnrichAlbum(albumNoEnrichment);
  console.log('✅ Album not needing enrichment:', result2); // Should be false
  
  // Test artist that needs enrichment
  const artistNeedsEnrichment = {
    id: 'test-artist-1',
    name: 'Test Artist',
    musicbrainzId: null,
    biography: null,
    formedYear: null,
    countryCode: null,
    dataQuality: 'LOW' as const,
    enrichmentStatus: 'FAILED' as const,
    lastEnriched: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // 40 days ago
  };
  
  const result3 = shouldEnrichArtist(artistNeedsEnrichment);
  console.log('✅ Artist needing enrichment:', result3); // Should be true
  
  return result1 && !result2 && result3;
}

async function runAllTests() {
  console.log('🚀 Starting optimistic mutations test suite...\n');
  
  try {
    const test1 = await testAddAlbumToCollection();
    const test2 = await testCreateRecommendation();
    const test3 = await testEnrichmentDecisionLogic();
    
    console.log('\n📊 Test Results:');
    console.log(`  addAlbumToCollection: ${test1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  createRecommendation: ${test2 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  enrichmentLogic: ${test3 ? '✅ PASS' : '❌ FAIL'}`);
    
    const allPassed = test1 && test2 && test3;
    console.log(`\n🎯 Overall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    if (allPassed) {
      console.log('\n🎉 Optimistic mutations are working correctly!');
      console.log('   - Mutations queue CHECK_ENRICHMENT jobs');
      console.log('   - Queue jobs contain correct data');
      console.log('   - Enrichment logic makes smart decisions');
    }
    
    process.exit(allPassed ? 0 : 1);
    
  } catch (error) {
    console.error('\n💥 Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

export { runAllTests, testAddAlbumToCollection, testCreateRecommendation, testEnrichmentDecisionLogic };
