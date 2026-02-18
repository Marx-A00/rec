/**
 * Compare dev DB vs prod snapshot to find albums that need enrichment in prod.
 *
 * This script:
 * 1. Connects to dev DB (via DATABASE_URL) and prod snapshot (port 5433)
 * 2. Finds albums that have better data in dev (tracks, artists, musicbrainz_id)
 * 3. Outputs a correction manifest that can be applied to prod
 */

import * as fs from 'fs';

import { PrismaClient } from '@prisma/client';

// Dev DB - uses DATABASE_URL from .env
const devPrisma = new PrismaClient();

// Prod snapshot - direct connection to Docker container
const prodPrisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:localdev@localhost:5433/rec_prod',
    },
  },
});

interface AlbumEnrichmentData {
  id: string;
  title: string;
  musicbrainzId: string | null;
  spotifyId: string | null;
  discogsId: string | null;
  trackCount: number;
  artistCount: number;
  // For display purposes - first artist name
  firstArtistName: string | null;
}

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

async function getAlbumEnrichmentData(
  prisma: PrismaClient,
  dbName: string
): Promise<Map<string, AlbumEnrichmentData>> {
  console.log(`\nFetching albums from ${dbName}...`);

  const albums = await prisma.album.findMany({
    select: {
      id: true,
      title: true,
      musicbrainzId: true,
      spotifyId: true,
      discogsId: true,
      tracks: {
        select: { id: true },
      },
      artists: {
        select: {
          artist: {
            select: { name: true },
          },
        },
        orderBy: { position: 'asc' },
        take: 1,
      },
    },
  });

  console.log(`Found ${albums.length} albums in ${dbName}`);

  const map = new Map<string, AlbumEnrichmentData>();
  for (const album of albums) {
    map.set(album.id, {
      id: album.id,
      title: album.title,
      musicbrainzId: album.musicbrainzId,
      spotifyId: album.spotifyId,
      discogsId: album.discogsId,
      trackCount: album.tracks.length,
      artistCount: album.artists.length,
      firstArtistName: album.artists[0]?.artist?.name ?? null,
    });
  }

  return map;
}

async function compareAndGenerateManifest() {
  console.log('=== Album Enrichment Comparison ===\n');
  console.log(
    'Comparing dev DB vs prod snapshot to find albums needing updates...\n'
  );

  const devAlbums = await getAlbumEnrichmentData(devPrisma, 'dev');
  const prodAlbums = await getAlbumEnrichmentData(prodPrisma, 'prod snapshot');

  const corrections: CorrectionItem[] = [];

  // Stats
  let albumsOnlyInDev = 0;
  let albumsOnlyInProd = 0;
  let albumsInBoth = 0;
  let albumsNeedingUpdate = 0;

  // Find albums that exist in both and have better data in dev
  const devEntries = Array.from(devAlbums.entries());
  for (const [albumId, devData] of devEntries) {
    const prodData = prodAlbums.get(albumId);

    if (!prodData) {
      albumsOnlyInDev++;
      continue;
    }

    albumsInBoth++;
    const changes: CorrectionItem['changes'] = [];

    // Check for improvements in dev vs prod
    if (!prodData.musicbrainzId && devData.musicbrainzId) {
      changes.push({
        field: 'musicbrainzId',
        prodValue: prodData.musicbrainzId,
        devValue: devData.musicbrainzId,
      });
    }

    if (!prodData.spotifyId && devData.spotifyId) {
      changes.push({
        field: 'spotifyId',
        prodValue: prodData.spotifyId,
        devValue: devData.spotifyId,
      });
    }

    if (!prodData.discogsId && devData.discogsId) {
      changes.push({
        field: 'discogsId',
        prodValue: prodData.discogsId,
        devValue: devData.discogsId,
      });
    }

    if (prodData.trackCount === 0 && devData.trackCount > 0) {
      changes.push({
        field: 'tracks',
        prodValue: prodData.trackCount,
        devValue: devData.trackCount,
      });
    }

    if (prodData.artistCount === 0 && devData.artistCount > 0) {
      changes.push({
        field: 'artists',
        prodValue: prodData.artistCount,
        devValue: devData.artistCount,
      });
    }

    if (changes.length > 0) {
      albumsNeedingUpdate++;
      corrections.push({
        albumId,
        albumTitle: devData.title,
        firstArtistName: devData.firstArtistName,
        changes,
      });
    }
  }

  // Count albums only in prod
  const prodKeys = Array.from(prodAlbums.keys());
  for (const albumId of prodKeys) {
    if (!devAlbums.has(albumId)) {
      albumsOnlyInProd++;
    }
  }

  // Print summary
  console.log('\n=== Summary ===');
  console.log(`Albums only in dev: ${albumsOnlyInDev}`);
  console.log(`Albums only in prod: ${albumsOnlyInProd}`);
  console.log(`Albums in both: ${albumsInBoth}`);
  console.log(`Albums needing update: ${albumsNeedingUpdate}`);

  // Group corrections by type
  const byField = new Map<string, number>();
  for (const correction of corrections) {
    for (const change of correction.changes) {
      const current = byField.get(change.field) || 0;
      byField.set(change.field, current + 1);
    }
  }

  console.log('\n=== Updates by field ===');
  const fieldEntries = Array.from(byField.entries());
  for (const [field, count] of fieldEntries) {
    console.log(`  ${field}: ${count} albums`);
  }

  // Write manifest to file
  const manifestPath =
    '/Users/marcosandrade/roaming/projects/rec/prod-correction-manifest.json';
  fs.writeFileSync(manifestPath, JSON.stringify(corrections, null, 2));
  console.log(`\nManifest written to: ${manifestPath}`);

  // Also print first few corrections as examples
  if (corrections.length > 0) {
    console.log('\n=== Sample corrections (first 5) ===');
    for (const correction of corrections.slice(0, 5)) {
      console.log(
        `\n${correction.albumTitle} (${correction.firstArtistName ?? 'Unknown'})`
      );
      console.log(`  ID: ${correction.albumId}`);
      for (const change of correction.changes) {
        console.log(
          `  ${change.field}: ${change.prodValue} → ${change.devValue}`
        );
      }
    }
  }

  return corrections;
}

async function main() {
  try {
    await compareAndGenerateManifest();
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await devPrisma.$disconnect();
    await prodPrisma.$disconnect();
  }
}

main();
