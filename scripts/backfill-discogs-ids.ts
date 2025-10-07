#!/usr/bin/env tsx
/**
 * Backfill Discogs IDs for existing artists from MusicBrainz relations
 *
 * Usage:
 *   tsx scripts/backfill-discogs-ids.ts [--limit=N] [--dry-run]
 *
 * Options:
 *   --limit=N    Limit number of artists to process (default: all)
 *   --dry-run    Show what would be updated without making changes
 */

import { prisma } from '../src/lib/prisma';
import { musicBrainzService } from '../src/lib/musicbrainz';

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const isDryRun = args.includes('--dry-run');

  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;

  console.log('🔗 Discogs ID Backfill Script');
  console.log('==============================');
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Limit: ${limit || 'none'}\n`);

  // Find artists with MusicBrainz ID but no Discogs ID
  const artists = await prisma.artist.findMany({
    where: {
      AND: [
        { musicbrainzId: { not: null } },
        {
          OR: [
            { discogsId: null },
            { discogsId: '' },
          ],
        },
      ],
    },
    select: {
      id: true,
      name: true,
      musicbrainzId: true,
      discogsId: true,
    },
    take: limit,
  });

  console.log(`Found ${artists.length} artists needing Discogs ID:\n`);

  if (artists.length === 0) {
    console.log('✅ All artists already have Discogs IDs!');
    await prisma.$disconnect();
    return;
  }

  // Show sample
  console.log('Sample artists:');
  artists.slice(0, 5).forEach((artist, i) => {
    console.log(`  ${i + 1}. ${artist.name}`);
    console.log(`     MBID: ${artist.musicbrainzId}`);
  });

  if (artists.length > 5) {
    console.log(`  ... and ${artists.length - 5} more\n`);
  }

  if (isDryRun) {
    console.log('🏃 DRY RUN - No updates will be made');
    await prisma.$disconnect();
    return;
  }

  // Process artists
  console.log('\n🔍 Fetching Discogs IDs from MusicBrainz...\n');

  let updated = 0;
  let notFound = 0;
  let errors = 0;

  for (const artist of artists) {
    try {
      // Fetch MusicBrainz data with url-rels
      const mbData = await musicBrainzService.getArtist(artist.musicbrainzId!, ['url-rels']);

      if (!mbData?.relations) {
        console.log(`⏭️  ${artist.name} - No relations found`);
        notFound++;
        continue;
      }

      // Find Discogs relation
      const discogsRel = mbData.relations.find((rel: any) => rel.type === 'discogs');

      if (!discogsRel?.url?.resource) {
        console.log(`⏭️  ${artist.name} - No Discogs relation`);
        notFound++;
        continue;
      }

      // Extract Discogs ID from URL
      const discogsMatch = discogsRel.url.resource.match(/\/artist\/(\d+)/);

      if (!discogsMatch) {
        console.log(`⏭️  ${artist.name} - Could not parse Discogs URL`);
        notFound++;
        continue;
      }

      const discogsId = discogsMatch[1];

      // Update database
      await prisma.artist.update({
        where: { id: artist.id },
        data: { discogsId },
      });

      console.log(`✅ ${artist.name} - Discogs ID: ${discogsId}`);
      updated++;

      // Rate limiting: 1 request per second to MusicBrainz
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`❌ ${artist.name} - Error:`, error);
      errors++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   Updated: ${updated}`);
  console.log(`   Not found: ${notFound}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Total processed: ${artists.length}\n`);

  await prisma.$disconnect();
}

main()
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
