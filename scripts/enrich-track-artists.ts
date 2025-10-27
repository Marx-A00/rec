/**
 * Script to enrich tracks with artist relationships by copying from their album
 * Usage: npx tsx scripts/enrich-track-artists.ts [--dry-run] [--limit=N]
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;

async function enrichTrackArtists() {
  console.log('🎵 Track Artist Enrichment Script');
  console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (no changes)' : '✍️  LIVE (will modify database)'}`);
  if (limit) console.log(`Limit: ${limit} tracks\n`);
  else console.log('Limit: All tracks\n');

  // Find tracks without artists that have albums with artists
  const tracksWithoutArtists = await prisma.track.findMany({
    where: {
      artists: {
        none: {},
      },
      album: {
        artists: {
          some: {},
        },
      },
    },
    include: {
      album: {
        include: {
          artists: {
            include: {
              artist: true,
            },
            orderBy: {
              position: 'asc',
            },
          },
        },
      },
    },
    take: limit,
  });

  console.log(`Found ${tracksWithoutArtists.length} tracks to enrich\n`);

  if (tracksWithoutArtists.length === 0) {
    console.log('✅ All tracks already have artists!');
    await prisma.$disconnect();
    return;
  }

  let enriched = 0;
  let errors = 0;

  for (const track of tracksWithoutArtists) {
    const albumArtists = track.album!.artists;

    if (albumArtists.length === 0) {
      console.log(`⚠️  Track "${track.title}" - Album has no artists (shouldn't happen)`);
      errors++;
      continue;
    }

    if (isDryRun) {
      console.log(`[DRY RUN] Would add ${albumArtists.length} artist(s) to "${track.title}"`);
      console.log(`   Album: "${track.album!.title}"`);
      console.log(`   Artists: ${albumArtists.map(aa => aa.artist.name).join(', ')}`);
      enriched++;
    } else {
      try {
        // Create track artist relationships
        await prisma.trackArtist.createMany({
          data: albumArtists.map(aa => ({
            trackId: track.id,
            artistId: aa.artistId,
            role: aa.role || 'primary',
            position: aa.position,
          })),
          skipDuplicates: true,
        });

        enriched++;
        if (enriched % 100 === 0) {
          console.log(`✅ Enriched ${enriched}/${tracksWithoutArtists.length} tracks...`);
        }
      } catch (error) {
        console.error(`❌ Error enriching track "${track.title}":`, error);
        errors++;
      }
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   ✅ Successfully enriched: ${enriched}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📈 Success rate: ${((enriched / tracksWithoutArtists.length) * 100).toFixed(2)}%`);

  if (isDryRun) {
    console.log('\n💡 Run without --dry-run to apply changes');
  } else {
    console.log('\n🎉 Track enrichment complete!');
  }

  await prisma.$disconnect();
}

enrichTrackArtists().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
