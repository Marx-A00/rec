#!/usr/bin/env tsx
// src/scripts/debug-worker-search.ts
// Debug what search queries the worker is actually building

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugWorkerSearchQueries() {
  console.log('🔍 Debugging Worker Search Queries...\n');

  // Get the recent albums that failed to get MusicBrainz IDs
  const recentAlbums = await prisma.album.findMany({
    where: {
      enrichmentStatus: 'COMPLETED',
      musicbrainzId: null,
    },
    include: {
      artists: {
        include: {
          artist: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 3
  });

  console.log(`Found ${recentAlbums.length} albums that were processed but got no MusicBrainz ID:\n`);

  for (const album of recentAlbums) {
    console.log(`📀 Album: "${album.title}"`);
    console.log(`   Status: ${album.enrichmentStatus}, Quality: ${album.dataQuality}`);
    console.log(`   Artists:`, album.artists.map(a => `${a.artist.name} (${a.role})`));
    
    // Simulate the worker's search query building logic
    let workerQuery = `releasegroup:"${album.title}"`;
    
    if (album.artists && album.artists.length > 0) {
      const primaryArtist = album.artists.find((a: any) => a.role === 'primary') || album.artists[0];
      if (primaryArtist?.artist?.name) {
        workerQuery += ` AND artist:"${primaryArtist.artist.name}"`;
      }
    }
    
    workerQuery += ` AND type:album AND status:official`;
    
    console.log(`   🔍 Worker Query: ${workerQuery}`);
    
    // Show what our debug script would use
    const debugQuery = `releasegroup:"${album.title}" AND artist:"${album.artists[0]?.artist?.name}" AND type:album AND status:official`;
    console.log(`   🧪 Debug Query: ${debugQuery}`);
    
    console.log(`   🤔 Queries Match: ${workerQuery === debugQuery ? 'YES ✅' : 'NO ❌'}`);
    console.log('');
  }

  console.log('💡 If queries match but still no MusicBrainz IDs, the issue might be:');
  console.log('   • Worker not actually calling MusicBrainz API');
  console.log('   • Search results not being processed correctly');
  console.log('   • Scoring logic failing in worker context');
  console.log('   • Database update failing');
}

debugWorkerSearchQueries().catch(console.error).finally(() => prisma.$disconnect());
