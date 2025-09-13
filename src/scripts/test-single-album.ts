// src/scripts/test-single-album.ts
/**
 * Add a single album to test the enrichment flow step by step
 */

import { PrismaClient } from '@prisma/client';
import { mutationResolvers } from '../lib/graphql/resolvers/mutations';
import { createActivityTracker } from '@/lib/activity/activity-tracker';
import { createQueuePriorityManager } from '@/lib/activity/queue-priority-manager';
import { randomUUID } from 'crypto';

// Mock GraphQL context with activity tracking
const createMockContext = (userId: string) => {
  const prisma = new PrismaClient();
  const sessionId = `test-session-${Date.now()}`;
  const requestId = randomUUID();
  
  return {
    user: { id: userId },
    prisma,
    dataloaders: {} as any,
    req: null as any,
    timestamp: new Date(),
    sessionId,
    activityTracker: createActivityTracker(prisma, sessionId, userId, requestId),
    priorityManager: createQueuePriorityManager(prisma),
    requestId,
    userAgent: 'test-script',
    ipAddress: '127.0.0.1',
  };
};

// Single test album
const testAlbum = {
  title: "The Downward Spiral",
  releaseDate: "1994-03-08",
  albumType: "ALBUM",
  totalTracks: 14,
  artists: [
    { artistName: "Nine Inch Nails", role: "PRIMARY" }
  ]
};

async function addSingleAlbum() {
  console.log('🎯 Testing single album enrichment flow...');
  console.log(`📀 Album: "${testAlbum.title}" by ${testAlbum.artists[0].artistName}`);
  
  const prisma = new PrismaClient();
  
  try {
    // Create a test user if none exists
    let testUser = await prisma.user.findFirst();
    
    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          id: 'test-user-' + Date.now(),
          name: 'Test User',
          email: `test-${Date.now()}@example.com`,
        }
      });
      console.log(`👤 Created test user: ${testUser.id}`);
    } else {
      console.log(`👤 Using existing user: ${testUser.id}`);
    }

    console.log('\n🔄 Step 1: Calling addAlbum mutation...');
    
    const result = await mutationResolvers.addAlbum!(
      {}, // parent
      { input: testAlbum },
      createMockContext(testUser.id),
      {} as any // info
    );

    console.log('\n✅ Album created:');
    console.log(`  ID: ${result.id}`);
    console.log(`  Title: ${result.title}`);
    console.log(`  Data quality: ${result.dataQuality}`);
    console.log(`  Enrichment status: ${result.enrichmentStatus}`);
    console.log(`  Artists: ${result.artists?.map(a => a.artist.name).join(', ')}`);
    
    console.log('\n🔄 Step 2: CHECK_ALBUM_ENRICHMENT job should be queued');
    console.log('📊 Check Bull Board at http://localhost:3001 to see if job appears');
    
    // Wait a moment and check database
    console.log('\n⏳ Waiting 5 seconds for job to process...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n🔍 Step 3: Checking album status after job processing...');
    const updatedAlbum = await prisma.album.findUnique({
      where: { id: result.id },
      include: { artists: { include: { artist: true } } }
    });
    
    if (updatedAlbum) {
      console.log(`  Enrichment status: ${updatedAlbum.enrichmentStatus}`);
      console.log(`  Data quality: ${updatedAlbum.dataQuality}`);
      console.log(`  MusicBrainz ID: ${updatedAlbum.musicbrainzId || 'None'}`);
      console.log(`  Last enriched: ${updatedAlbum.lastEnriched ? new Date(updatedAlbum.lastEnriched).toLocaleString() : 'Never'}`);
      
      if (updatedAlbum.musicbrainzId) {
        console.log('\n🎉 SUCCESS: Album was enriched with MusicBrainz ID!');
      } else if (updatedAlbum.enrichmentStatus === 'COMPLETED') {
        console.log('\n⚠️  Album marked COMPLETED but no MusicBrainz ID - check worker logs');
      } else if (updatedAlbum.enrichmentStatus === 'PENDING') {
        console.log('\n⏳ Album still PENDING - job may not have processed yet');
      }
    }
    
    return result;

  } catch (error) {
    console.error('❌ Failed to add test album:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  addSingleAlbum()
    .then((album) => {
      console.log(`\n✨ Test completed for album: ${album.title}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

export { addSingleAlbum };
