import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'disconnect';

import {
  mapDiscogsMasterToAlbum,
  mapDiscogsReleaseToAlbum,
} from '@/lib/discogs/mappers';
import { albumParamsSchema } from '@/lib/validations/params';
import { Album } from '@/types/album';
import { DiscogsMaster } from '@/types/discogs/master';
import { DiscogsRelease } from '@/types/discogs/release';

// Create a client with consumer key and secret from environment variables
const db = new Client({
  userAgent: 'RecProject/1.0 +http://localhost:3000',
  consumerKey: process.env.CONSUMER_KEY,
  consumerSecret: process.env.CONSUMER_SECRET,
}).database();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const rawParams = await params;

  // Validate parameters
  const paramsResult = albumParamsSchema.safeParse(rawParams);
  if (!paramsResult.success) {
    console.error('Invalid album parameters:', paramsResult.error);
    return NextResponse.json(
      { error: 'Invalid album ID format' },
      { status: 400 }
    );
  }

  const { id } = paramsResult.data;

  if (!id) {
    return NextResponse.json(
      { error: 'Album ID is required' },
      { status: 400 }
    );
  }

  console.log(`🔍 API - Fetching album details for ID: ${id}`);

  // Try to get the master release details first
  try {
    console.log(`🟢 API - Attempting db.getMaster(${id})`);
    const albumDetails: DiscogsMaster = await db.getMaster(id);
    console.log(`✅ API - Successfully fetched MASTER details for ID: ${id}`, {
      title: albumDetails.title,
      main_release: albumDetails.main_release,
      id: albumDetails.id,
    });

    const album: Album = mapDiscogsMasterToAlbum(albumDetails);
    return NextResponse.json(album);
  } catch (masterError) {
    console.log(
      `❌ API - Master fetch failed for ID: ${id}, trying release...`,
      masterError
    );

    // If master doesn't work, try release
    try {
      console.log(`🔵 API - Attempting db.getRelease(${id})`);
      const albumDetails: DiscogsRelease = await db.getRelease(id);
      console.log(
        `✅ API - Successfully fetched RELEASE details for ID: ${id}`,
        {
          title: albumDetails.title,
          master_id: albumDetails.master_id,
          id: albumDetails.id,
        }
      );

      const album: Album = mapDiscogsReleaseToAlbum(albumDetails);
      return NextResponse.json(album);
    } catch (releaseError) {
      console.error(
        `💥 API - Both master and release fetch failed for ID ${id}:`,
        releaseError
      );
      return NextResponse.json({ error: 'Album not found' }, { status: 404 });
    }
  }
}
