#!/usr/bin/env tsx
// src/scripts/test-album-pool.ts
// Test our hybrid scoring system with a diverse pool of albums

import { PrismaClient } from '@prisma/client';
import { mutationResolvers } from '../lib/graphql/resolvers/mutations';
import { createActivityTracker } from '@/lib/activity/activity-tracker';
import { createQueuePriorityManager } from '@/lib/activity/queue-priority-manager';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

// 🎵 Diverse Album Test Pool (20 albums across genres, eras, artists)
const ALBUM_POOL = [
  // Classic Rock
  { title: "Dark Side of the Moon", artist: "Pink Floyd", year: "1973-03-01" },
  { title: "Led Zeppelin IV", artist: "Led Zeppelin", year: "1971-11-08" },
  { title: "Abbey Road", artist: "The Beatles", year: "1969-09-26" },
  
  // Hip Hop
  { title: "Illmatic", artist: "Nas", year: "1994-04-19" },
  { title: "The Chronic", artist: "Dr. Dre", year: "1992-12-15" },
  { title: "To Pimp a Butterfly", artist: "Kendrick Lamar", year: "2015-03-15" },
  
  // Electronic
  { title: "Discovery", artist: "Daft Punk", year: "2001-02-26" },
  { title: "Selected Ambient Works 85-92", artist: "Aphex Twin", year: "1992-11-09" },
  { title: "Rounds", artist: "Four Tet", year: "2003-05-05" },
  
  // Alternative/Indie
  { title: "OK Computer", artist: "Radiohead", year: "1997-06-16" },
  { title: "In the Aeroplane Over the Sea", artist: "Neutral Milk Hotel", year: "1998-02-10" },
  { title: "The Lonesome Crowded West", artist: "Modest Mouse", year: "1997-11-18" },
  
  // Jazz
  { title: "Kind of Blue", artist: "Miles Davis", year: "1959-08-17" },
  { title: "A Love Supreme", artist: "John Coltrane", year: "1965-01-27" },
  
  // Pop
  { title: "Thriller", artist: "Michael Jackson", year: "1982-11-30" },
  { title: "Purple Rain", artist: "Prince", year: "1984-06-25" },
  
  // Metal
  { title: "Master of Puppets", artist: "Metallica", year: "1986-03-03" },
  { title: "Black Sabbath", artist: "Black Sabbath", year: "1970-02-13" },
  
  // Contemporary
  { title: "Blonde", artist: "Frank Ocean", year: "2016-08-20" },
  { title: "DAMN.", artist: "Kendrick Lamar", year: "2017-04-14" },
  
  // Drain Gang / Cloud Rap
  { title: "Eversince", artist: "Bladee", year: "2016-05-26" },
  { title: "Red Light", artist: "Bladee", year: "2018-05-11" },
  { title: "The Fool", artist: "Bladee", year: "2021-05-21" },
  
  // Hip Hop/Trap
  { title: "The Life Of Pi'erre 4", artist: "Pi'erre Bourne", year: "2019-06-14" },
  { title: "The Life Of Pi'erre 5", artist: "Pi'erre Bourne", year: "2021-04-23" },
  { title: "Doris", artist: "Earl Sweatshirt", year: "2013-08-20" },
  { title: "Some Rap Songs", artist: "Earl Sweatshirt", year: "2018-11-30" },
  { title: "SICK!", artist: "Earl Sweatshirt", year: "2022-01-14" },
];

// Track which albums we've used
let usedAlbums: Set<string> = new Set();

// Mock GraphQL context
const createMockContext = (userId: string) => {
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

/**
 * Get next unused album from pool
 */
function getNextAlbum() {
  const availableAlbums = ALBUM_POOL.filter(album => 
    !usedAlbums.has(`${album.title}-${album.artist}`)
  );
  
  if (availableAlbums.length === 0) {
    console.log('🔄 All albums used! Reset available for fresh testing.');
    usedAlbums.clear();
    return ALBUM_POOL[0];
  }
  
  // Get random album from available ones
  const randomIndex = Math.floor(Math.random() * availableAlbums.length);
  const selectedAlbum = availableAlbums[randomIndex];
  
  // Mark as used
  usedAlbums.add(`${selectedAlbum.title}-${selectedAlbum.artist}`);
  
  return selectedAlbum;
}

/**
 * Test single album with enhanced scoring
 */
async function testAlbumScoring(albumData: typeof ALBUM_POOL[0]) {
  console.log(`\n🎵 Testing: "${albumData.title}" by ${albumData.artist}`);
  
  try {
    // Get or create test user
    let testUser = await prisma.user.findFirst({
      where: { email: 'pool-test@example.com' }
    });
    
    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          id: 'pool-test-user',
          name: 'Pool Test User',
          email: 'pool-test@example.com',
        }
      });
    }

    // Add album via mutation
    const result = await mutationResolvers.addAlbum!(
      {},
      {
        input: {
          title: albumData.title,
          releaseDate: albumData.year,
          artists: [{
            artistName: albumData.artist,
            role: 'primary'
          }]
        }
      },
      createMockContext(testUser.id),
      {} as any
    );

    console.log(`✅ Album added: ${result.id.substring(0, 8)}... (${result.title})`);
    console.log(`📊 Initial: quality=${result.dataQuality}, status=${result.enrichmentStatus}`);
    
    return {
      albumId: result.id,
      title: result.title,
      artist: albumData.artist,
    };

  } catch (error) {
    console.error(`❌ Failed to test ${albumData.title}:`, error);
    throw error;
  }
}

/**
 * Run multiple album tests
 */
async function runAlbumPoolTest(count: number = 5) {
  console.log(`🧪 Testing Enhanced Hybrid Scoring System`);
  console.log(`📊 MusicBrainz Score (0-100) + Jaccard Similarity (0-1)`);
  console.log(`🎯 Combined: MB_score*0.7 + Jaccard*0.3 > 0.8 threshold\n`);

  const results = [];

  for (let i = 0; i < count; i++) {
    const albumData = getNextAlbum();
    console.log(`\n--- Test ${i + 1}/${count} ---`);
    
    try {
      const result = await testAlbumScoring(albumData);
      results.push(result);
      
      // Brief pause to let job queue
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Test ${i + 1} failed:`, error);
    }
  }

  console.log(`\n🎉 Pool Test Complete!`);
  console.log(`✅ Tested ${results.length}/${count} albums`);
  console.log(`📊 Used ${usedAlbums.size}/${ALBUM_POOL.length} total albums from pool`);
  
  if (usedAlbums.size >= ALBUM_POOL.length) {
    console.log(`\n🔄 Pool exhausted! Consider resetting DB for fresh testing.`);
  }

  console.log(`\n💡 Check Bull Board at http://localhost:3001 to see job processing`);
  console.log(`📈 Worker logs will show the hybrid scoring breakdown`);

  return results;
}

/**
 * Reset database for fresh testing
 */
async function resetTestDatabase() {
  console.log('🗑️  Resetting test database...');
  
  // Delete all albums and artists (cascade will handle relationships)
  await prisma.album.deleteMany({});
  await prisma.artist.deleteMany({});
  await prisma.userActivity.deleteMany({});
  
  // Reset used albums tracker
  usedAlbums.clear();
  
  console.log('✅ Database reset complete - ready for fresh testing!');
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const count = parseInt(process.argv[3]) || 5;

  try {
    switch (command) {
      case 'test':
        await runAlbumPoolTest(count);
        break;
      case 'reset':
        await resetTestDatabase();
        break;
      case 'single':
        const album = getNextAlbum();
        await testAlbumScoring(album);
        break;
      default:
        console.log('🎵 Album Pool Tester');
        console.log('');
        console.log('Commands:');
        console.log('  npx tsx src/scripts/test-album-pool.ts test [count]  - Test multiple albums (default: 5)');
        console.log('  npx tsx src/scripts/test-album-pool.ts single       - Test one random album');
        console.log('  npx tsx src/scripts/test-album-pool.ts reset        - Reset database');
        console.log('');
        console.log('Examples:');
        console.log('  npx tsx src/scripts/test-album-pool.ts test 3       - Test 3 random albums');
        console.log('  npx tsx src/scripts/test-album-pool.ts single       - Test 1 album');
        console.log('  npx tsx src/scripts/test-album-pool.ts reset        - Clear all test data');
    }
  } catch (error) {
    console.error('❌ Command failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { runAlbumPoolTest, resetTestDatabase, getNextAlbum };
