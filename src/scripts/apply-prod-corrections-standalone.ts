/**
 * Apply enrichment corrections to production database.
 *
 * This is a STANDALONE script - all data is embedded in prod-correction-data.json.
 * No dev DB connection required.
 *
 * Usage:
 *   npx tsx src/scripts/apply-prod-corrections-standalone.ts
 *
 * Options:
 *   --dry-run    Show what would be done without making changes
 *   --album=ID   Only process a specific album
 */

import * as fs from 'fs';
import * as path from 'path';

import { PrismaClient } from '@prisma/client';

interface TrackData {
  id: string;
  albumId: string;
  title: string;
  trackNumber: number | null;
  discNumber: number | null;
  durationMs: number | null;
  musicbrainzId: string | null;
  spotifyId: string | null;
  isrc: string | null;
  previewUrl: string | null;
}

interface ArtistData {
  id: string;
  name: string;
  musicbrainzId: string | null;
  spotifyId: string | null;
  discogsId: string | null;
  biography: string | null;
  formedYear: number | null;
  countryCode: string | null;
  area: string | null;
  artistType: string | null;
  imageUrl: string | null;
  cloudflareImageId: string | null;
  genres: string[];
  source: string;
  sourceUrl: string | null;
  dataQuality: string | null;
  enrichmentStatus: string | null;
}

interface AlbumArtistLink {
  artistId: string;
  role: string;
  position: number;
}

interface CorrectionData {
  albumId: string;
  albumTitle: string;
  firstArtistName: string | null;
  updates: {
    musicbrainzId?: string;
    spotifyId?: string;
    discogsId?: string;
  };
  tracks: TrackData[];
  artists: ArtistData[];
  albumArtistLinks: AlbumArtistLink[];
}

// Parse CLI args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const albumArg = args.find(a => a.startsWith('--album='));
const specificAlbumId = albumArg?.split('=')[1];

// Uses DATABASE_URL from environment
const prisma = new PrismaClient();

async function applyCorrections() {
  console.log('=== Apply Production Corrections (Standalone) ===\n');

  if (dryRun) {
    console.log('*** DRY RUN MODE - No changes will be made ***\n');
  }

  // Read the self-contained correction data
  const dataPath = path.join(__dirname, '../../prod-correction-data.json');

  if (!fs.existsSync(dataPath)) {
    // Try alternate path (when running from project root)
    const altPath = './prod-correction-data.json';
    if (!fs.existsSync(altPath)) {
      console.error('ERROR: prod-correction-data.json not found');
      console.error('Expected at:', dataPath);
      process.exit(1);
    }
  }

  const dataContent = fs.readFileSync(
    fs.existsSync(dataPath) ? dataPath : './prod-correction-data.json',
    'utf-8'
  );
  const corrections: CorrectionData[] = JSON.parse(dataContent);

  console.log(`Found ${corrections.length} albums in correction data\n`);

  // Filter by specific album if requested
  const toProcess = specificAlbumId
    ? corrections.filter(c => c.albumId === specificAlbumId)
    : corrections;

  if (specificAlbumId && toProcess.length === 0) {
    console.log(`Album ${specificAlbumId} not found in correction data`);
    return;
  }

  // Stats
  let albumsProcessed = 0;
  let tracksAdded = 0;
  let artistsAdded = 0;
  let albumFieldsUpdated = 0;
  let errors = 0;

  for (const correction of toProcess) {
    console.log(
      `\n${correction.albumTitle} (${correction.firstArtistName ?? 'Unknown'})`
    );
    console.log(`  ID: ${correction.albumId}`);

    try {
      // Check if album exists in prod
      const prodAlbum = await prisma.album.findUnique({
        where: { id: correction.albumId },
      });

      if (!prodAlbum) {
        console.log(`  SKIP: Album not found in database`);
        continue;
      }

      // Apply direct field updates (musicbrainzId, spotifyId, discogsId)
      if (Object.keys(correction.updates).length > 0) {
        if (dryRun) {
          console.log(`  [DRY RUN] Would update fields:`, correction.updates);
        } else {
          await prisma.album.update({
            where: { id: correction.albumId },
            data: correction.updates,
          });
          console.log(
            `  Updated fields:`,
            Object.keys(correction.updates).join(', ')
          );
        }
        albumFieldsUpdated++;
      }

      // Add tracks
      if (correction.tracks.length > 0) {
        if (dryRun) {
          console.log(
            `  [DRY RUN] Would add ${correction.tracks.length} tracks`
          );
        } else {
          // Delete existing tracks first (in case of partial data)
          await prisma.track.deleteMany({
            where: { albumId: correction.albumId },
          });

          // Insert tracks
          for (const track of correction.tracks) {
            await prisma.track.create({
              data: {
                id: track.id,
                albumId: track.albumId,
                title: track.title,
                trackNumber: track.trackNumber ?? 0,
                discNumber: track.discNumber ?? 1,
                durationMs: track.durationMs,
                musicbrainzId: track.musicbrainzId,
                spotifyId: track.spotifyId,
                isrc: track.isrc,
                previewUrl: track.previewUrl,
              },
            });
          }
          console.log(`  Added ${correction.tracks.length} tracks`);
        }
        tracksAdded += correction.tracks.length;
      }

      // Add artists
      if (correction.artists.length > 0) {
        if (dryRun) {
          console.log(
            `  [DRY RUN] Would add ${correction.artists.length} artists`
          );
        } else {
          for (const artist of correction.artists) {
            // Check if artist exists
            const existingArtist = await prisma.artist.findUnique({
              where: { id: artist.id },
            });

            if (!existingArtist) {
              // Create artist
              await prisma.artist.create({
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
                  source: artist.source as
                    | 'MUSICBRAINZ'
                    | 'DISCOGS'
                    | 'SPOTIFY'
                    | 'YOUTUBE'
                    | 'BANDCAMP'
                    | 'SOUNDCLOUD'
                    | 'USER_SUBMITTED',
                  sourceUrl: artist.sourceUrl,
                  dataQuality: artist.dataQuality as
                    | 'LOW'
                    | 'MEDIUM'
                    | 'HIGH'
                    | null,
                  enrichmentStatus: artist.enrichmentStatus as
                    | 'PENDING'
                    | 'IN_PROGRESS'
                    | 'COMPLETED'
                    | 'FAILED'
                    | null,
                },
              });
              console.log(`  Created artist: ${artist.name}`);
            }
          }

          // Create album-artist links
          for (const link of correction.albumArtistLinks) {
            const existingLink = await prisma.albumArtist.findUnique({
              where: {
                albumId_artistId_role: {
                  albumId: correction.albumId,
                  artistId: link.artistId,
                  role: link.role,
                },
              },
            });

            if (!existingLink) {
              await prisma.albumArtist.create({
                data: {
                  albumId: correction.albumId,
                  artistId: link.artistId,
                  role: link.role,
                  position: link.position,
                },
              });
            }
          }
          console.log(`  Linked ${correction.albumArtistLinks.length} artists`);
        }
        artistsAdded += correction.artists.length;
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
  console.log(`Album fields updated: ${albumFieldsUpdated}`);
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
    await prisma.$disconnect();
  }
}

main();
