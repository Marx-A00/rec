/**
 * Apply enrichment corrections to production database.
 *
 * This script reads the correction manifest and applies changes to prod.
 * It copies tracks and artists from dev DB to prod.
 *
 * IMPORTANT: Set PROD_DATABASE_URL env var to your actual production DB URL
 * before running this script.
 *
 * Usage:
 *   PROD_DATABASE_URL="postgresql://..." npx tsx src/scripts/apply-prod-corrections.ts
 *
 * Options:
 *   --dry-run    Show what would be done without making changes
 *   --album=ID   Only process a specific album
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

interface CorrectionItem {
  albumId: string;
  albumTitle: string;
  firstArtistName: string | null;
  changes: {
    field: string;
    prodValue: string | number | null;
    devValue: string | number | null;
  }[];
}

// Parse CLI args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const albumArg = args.find(a => a.startsWith('--album='));
const specificAlbumId = albumArg?.split('=')[1];

// Dev DB - uses DATABASE_URL from .env
const devPrisma = new PrismaClient();

// Prod DB - requires PROD_DATABASE_URL env var
const prodDbUrl = process.env.PROD_DATABASE_URL;
if (!prodDbUrl) {
  console.error('ERROR: PROD_DATABASE_URL environment variable is required');
  console.error(
    'Usage: PROD_DATABASE_URL="postgresql://..." npx tsx src/scripts/apply-prod-corrections.ts'
  );
  process.exit(1);
}

const prodPrisma = new PrismaClient({
  datasources: {
    db: {
      url: prodDbUrl,
    },
  },
});

async function copyTracksFromDevToProd(albumId: string): Promise<number> {
  // Get tracks from dev
  const devTracks = await devPrisma.track.findMany({
    where: { albumId },
    include: {
      artists: {
        include: {
          artist: true,
        },
      },
    },
    orderBy: { trackNumber: 'asc' },
  });

  if (devTracks.length === 0) {
    console.log(`    No tracks found in dev for album ${albumId}`);
    return 0;
  }

  if (dryRun) {
    console.log(`    [DRY RUN] Would copy ${devTracks.length} tracks`);
    return devTracks.length;
  }

  // Delete existing tracks in prod (if any)
  await prodPrisma.track.deleteMany({
    where: { albumId },
  });

  // Insert tracks one by one
  for (const track of devTracks) {
    await prodPrisma.track.create({
      data: {
        id: track.id,
        albumId: track.albumId,
        title: track.title,
        trackNumber: track.trackNumber,
        discNumber: track.discNumber,
        durationMs: track.durationMs,
        musicbrainzId: track.musicbrainzId,
        spotifyId: track.spotifyId,
        isrc: track.isrc,
        previewUrl: track.previewUrl,
        // Note: track artists are handled separately via AlbumArtist relation
      },
    });
  }

  console.log(`    Copied ${devTracks.length} tracks`);
  return devTracks.length;
}

async function copyArtistsFromDevToProd(albumId: string): Promise<number> {
  // Get album artists from dev
  const devAlbumArtists = await devPrisma.albumArtist.findMany({
    where: { albumId },
    include: {
      artist: true,
    },
    orderBy: { position: 'asc' },
  });

  if (devAlbumArtists.length === 0) {
    console.log(`    No artists found in dev for album ${albumId}`);
    return 0;
  }

  if (dryRun) {
    console.log(`    [DRY RUN] Would copy ${devAlbumArtists.length} artists`);
    return devAlbumArtists.length;
  }

  // For each artist, ensure they exist in prod, then create the album-artist link
  for (const albumArtist of devAlbumArtists) {
    const artist = albumArtist.artist;

    // Check if artist exists in prod
    const existingArtist = await prodPrisma.artist.findUnique({
      where: { id: artist.id },
    });

    if (!existingArtist) {
      // Create the artist in prod
      await prodPrisma.artist.create({
        data: {
          id: artist.id,
          name: artist.name,
          musicbrainzId: artist.musicbrainzId,
          spotifyId: artist.spotifyId,
          discogsId: artist.discogsId,
          biography: artist.biography,
          formedYear: artist.formedYear,
          countryCode: artist.countryCode,
          area: artist.area,
          artistType: artist.artistType,
          imageUrl: artist.imageUrl,
          cloudflareImageId: artist.cloudflareImageId,
          genres: artist.genres,
          source: artist.source,
          sourceUrl: artist.sourceUrl,
          dataQuality: artist.dataQuality,
          enrichmentStatus: artist.enrichmentStatus,
        },
      });
      console.log(`    Created artist: ${artist.name}`);
    }

    // Check if album-artist link exists
    const existingLink = await prodPrisma.albumArtist.findUnique({
      where: {
        albumId_artistId_role: {
          albumId,
          artistId: artist.id,
          role: albumArtist.role,
        },
      },
    });

    if (!existingLink) {
      await prodPrisma.albumArtist.create({
        data: {
          albumId,
          artistId: artist.id,
          role: albumArtist.role,
          position: albumArtist.position,
        },
      });
    }
  }

  console.log(`    Linked ${devAlbumArtists.length} artists`);
  return devAlbumArtists.length;
}

async function applyCorrections() {
  console.log('=== Apply Production Corrections ===\n');

  if (dryRun) {
    console.log('*** DRY RUN MODE - No changes will be made ***\n');
  }

  // Read manifest
  const manifestPath =
    '/Users/marcosandrade/roaming/projects/rec/prod-correction-manifest.json';
  const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
  const corrections: CorrectionItem[] = JSON.parse(manifestContent);

  console.log(`Found ${corrections.length} albums in correction manifest\n`);

  // Filter by specific album if requested
  const toProcess = specificAlbumId
    ? corrections.filter(c => c.albumId === specificAlbumId)
    : corrections;

  if (specificAlbumId && toProcess.length === 0) {
    console.log(`Album ${specificAlbumId} not found in manifest`);
    return;
  }

  // Stats
  let albumsProcessed = 0;
  let tracksAdded = 0;
  let artistsAdded = 0;
  let musicbrainzIdsSet = 0;
  let errors = 0;

  for (const correction of toProcess) {
    console.log(
      `\n${correction.albumTitle} (${correction.firstArtistName ?? 'Unknown'})`
    );
    console.log(`  ID: ${correction.albumId}`);

    try {
      // Check if album exists in prod
      const prodAlbum = await prodPrisma.album.findUnique({
        where: { id: correction.albumId },
      });

      if (!prodAlbum) {
        console.log(`  SKIP: Album not found in prod`);
        continue;
      }

      // Process each change
      for (const change of correction.changes) {
        console.log(`  Processing: ${change.field}`);

        switch (change.field) {
          case 'musicbrainzId':
            if (dryRun) {
              console.log(
                `    [DRY RUN] Would set musicbrainzId to ${change.devValue}`
              );
            } else {
              await prodPrisma.album.update({
                where: { id: correction.albumId },
                data: { musicbrainzId: change.devValue as string },
              });
              console.log(`    Set musicbrainzId: ${change.devValue}`);
            }
            musicbrainzIdsSet++;
            break;

          case 'spotifyId':
            if (dryRun) {
              console.log(
                `    [DRY RUN] Would set spotifyId to ${change.devValue}`
              );
            } else {
              await prodPrisma.album.update({
                where: { id: correction.albumId },
                data: { spotifyId: change.devValue as string },
              });
              console.log(`    Set spotifyId: ${change.devValue}`);
            }
            break;

          case 'discogsId':
            if (dryRun) {
              console.log(
                `    [DRY RUN] Would set discogsId to ${change.devValue}`
              );
            } else {
              await prodPrisma.album.update({
                where: { id: correction.albumId },
                data: { discogsId: change.devValue as string },
              });
              console.log(`    Set discogsId: ${change.devValue}`);
            }
            break;

          case 'tracks':
            const trackCount = await copyTracksFromDevToProd(
              correction.albumId
            );
            tracksAdded += trackCount;
            break;

          case 'artists':
            const artistCount = await copyArtistsFromDevToProd(
              correction.albumId
            );
            artistsAdded += artistCount;
            break;

          default:
            console.log(`    WARN: Unknown field ${change.field}`);
        }
      }

      albumsProcessed++;
    } catch (error) {
      console.error(`  ERROR: ${error}`);
      errors++;
    }
  }

  // Summary
  console.log('\n\n=== Summary ===');
  console.log(`Albums processed: ${albumsProcessed}`);
  console.log(`MusicBrainz IDs set: ${musicbrainzIdsSet}`);
  console.log(`Tracks added: ${tracksAdded}`);
  console.log(`Artists added: ${artistsAdded}`);
  console.log(`Errors: ${errors}`);

  if (dryRun) {
    console.log(
      '\n*** This was a dry run. Run without --dry-run to apply changes. ***'
    );
  }
}

async function main() {
  try {
    await applyCorrections();
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await devPrisma.$disconnect();
    await prodPrisma.$disconnect();
  }
}

main();
