import { Client } from 'disconnect';
import { NextRequest, NextResponse } from 'next/server';

import { withApiLogging } from '@/lib/api-utils';
import { mapDiscogsMasterToAlbum } from '@/lib/discogs/mappers';
import { DiscogsMaster } from '@/types/discogs/master';

// Create a client with consumer key and secret from environment variables
const db = new Client({
  userAgent: 'RecProject/1.0 +http://localhost:3000',
  consumerKey: process.env.CONSUMER_KEY,
  consumerSecret: process.env.CONSUMER_SECRET,
}).database();

export const GET = withApiLogging(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> => {
  // Ensure params is awaited before accessing properties
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: 'Album ID is required' },
      { status: 400 }
    );
  }

  try {
    // Try to get the master release details
    let albumDetails: DiscogsMaster;
    try {
      albumDetails = await db.getMaster(id);
    } catch {
      try {
        // If not a master, try as a regular release
        // Note: This would need a separate mapper for releases
        await db.getRelease(id);
        // For now, return error since we haven't implemented release mapping yet
        return NextResponse.json(
          { error: 'Release mapping not implemented yet' },
          { status: 501 }
        );
      } catch {
        return NextResponse.json({ error: 'Album not found' }, { status: 404 });
      }
    }

    // Use the mapper to convert DiscogsMaster to Album
    const album = mapDiscogsMasterToAlbum(albumDetails);

    return NextResponse.json({ album });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch album details' },
      { status: 500 }
    );
  }
});
