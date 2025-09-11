// src/scripts/add-sample-albums.ts
/**
 * Add sample albums to the database using the addAlbum mutation
 * This will also trigger enrichment checks for realistic testing
 */

import { PrismaClient } from '@prisma/client';
import { mutationResolvers } from '../lib/graphql/resolvers/mutations';

// TODO: figure out about mockGQLContext
// Think about how you want to actually add albums to the database
// For example, in a situation when you already have the musicbrainz data, you wouldn't want to queue enrichment checks,
// you would want to just add to the database

// Mock GraphQL context
const createMockContext = (userId: string) => ({
  user: { id: userId },
  prisma: new PrismaClient(),
  dataloaders: {} as any,
  req: null as any,
  timestamp: new Date(),
});

const sampleAlbums = [
  {
    title: "Discovery",
    releaseDate: "2001-02-26",
    albumType: "ALBUM",
    totalTracks: 14,
    artists: [
      { artistName: "Daft Punk", role: "PRIMARY" }
    ]
  },
  {
    title: "Random Access Memories", 
    releaseDate: "2013-05-17",
    albumType: "ALBUM",
    totalTracks: 13,
    artists: [
      { artistName: "Daft Punk", role: "PRIMARY" }
    ]
  },
  {
    title: "In Rainbows",
    releaseDate: "2007-10-10", 
    albumType: "ALBUM",
    totalTracks: 10,
    artists: [
      { artistName: "Radiohead", role: "PRIMARY" }
    ]
  },
  {
    title: "OK Computer",
    releaseDate: "1997-06-16",
    albumType: "ALBUM", 
    totalTracks: 12,
    artists: [
      { artistName: "Radiohead", role: "PRIMARY" }
    ]
  },
  {
    title: "The Dark Side of the Moon",
    releaseDate: "1973-03-01",
    albumType: "ALBUM",
    totalTracks: 10,
    artists: [
      { artistName: "Pink Floyd", role: "PRIMARY" }
    ]
  },
  {
    title: "Wish You Were Here", 
    releaseDate: "1975-09-12",
    albumType: "ALBUM",
    totalTracks: 5,
    artists: [
      { artistName: "Pink Floyd", role: "PRIMARY" }
    ]
  },
  {
    title: "Abbey Road",
    releaseDate: "1969-09-26",
    albumType: "ALBUM",
    totalTracks: 17,
    artists: [
      { artistName: "The Beatles", role: "PRIMARY" }
    ]
  },
  {
    title: "Sgt. Pepper's Lonely Hearts Club Band",
    releaseDate: "1967-06-01", 
    albumType: "ALBUM",
    totalTracks: 13,
    artists: [
      { artistName: "The Beatles", role: "PRIMARY" }
    ]
  }
];

async function addSampleAlbums() {
  console.log('🎵 Adding sample albums to database...');
  
  const prisma = new PrismaClient();
  
  try {
    // Create a test user if none exists
    let testUser = await prisma.user.findFirst();
    
    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          id: 'sample-user-' + Date.now(),
          name: 'Sample User',
          email: `sample-${Date.now()}@example.com`,
        }
      });
      console.log(`👤 Created test user: ${testUser.id}`);
    } else {
      console.log(`👤 Using existing user: ${testUser.id}`);
    }

    const addedAlbums = [];
    
    for (const [index, albumData] of sampleAlbums.entries()) {
      console.log(`\n📀 Adding album ${index + 1}/${sampleAlbums.length}: "${albumData.title}" by ${albumData.artists[0].artistName}`);
      
      try {
        const result = await mutationResolvers.addAlbum!(
          {}, // parent
          { input: albumData },
          createMockContext(testUser.id),
          {} as any // info
        );

        addedAlbums.push(result);
        
        console.log(`  ✅ Created album: ${result.id}`);
        console.log(`  📊 Data quality: ${result.dataQuality}`);
        console.log(`  🔄 Enrichment status: ${result.enrichmentStatus}`);
        console.log(`  🎤 Artists: ${result.artists?.map(a => a.artist.name).join(', ')}`);

      } catch (error) {
        console.error(`  ❌ Failed to add "${albumData.title}":`, error);
      }

      // Small delay between additions
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n🎉 Successfully added ${addedAlbums.length}/${sampleAlbums.length} albums!`);
    
    // Show summary of what was created
    console.log('\n📊 Database Summary:');
    const albumCount = await prisma.album.count();
    const artistCount = await prisma.artist.count();
    console.log(`  Albums: ${albumCount}`);
    console.log(`  Artists: ${artistCount}`);
    
    // Show enrichment status breakdown
    const enrichmentStats = await prisma.album.groupBy({
      by: ['enrichmentStatus'],
      _count: true,
    });
    
    console.log('\n🔄 Enrichment Status:');
    for (const stat of enrichmentStats) {
      console.log(`  ${stat.enrichmentStatus}: ${stat._count} albums`);
    }

    console.log('\n💡 What happens next:');
    console.log('  1. ✅ Albums are in your database');
    console.log('  2. 🔄 CHECK_ALBUM_ENRICHMENT jobs were queued');
    console.log('  3. 🎯 Workers will check if enrichment is needed');
    console.log('  4. 🎵 MusicBrainz lookups will run if needed');
    console.log('  5. 📊 You can see all this in Bull Board!');
    
    return addedAlbums;

  } catch (error) {
    console.error('❌ Failed to add sample albums:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  addSampleAlbums()
    .then((albums) => {
      console.log(`\n✨ Added ${albums.length} sample albums!`);
      console.log('🔗 Now you can:');
      console.log('  - View them in your app');
      console.log('  - Add them to collections');
      console.log('  - Create recommendations');
      console.log('  - Watch enrichment jobs in Bull Board');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Sample album creation failed:', error);
      process.exit(1);
    });
}

export { addSampleAlbums };
