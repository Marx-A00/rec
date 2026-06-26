import { Client } from 'disconnect';
import { NextRequest, NextResponse } from 'next/server';

import { withApiLogging } from '@/lib/api-utils';
import { mapDiscogsReleaseToAlbum } from '@/lib/discogs/mappers';
import { DiscogsRelease } from '@/types/discogs/release';

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
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: 'Release ID is required' },
      { status: 400 }
    );
  }

  try {
    // Get the release details from Discogs
    const releaseDetails: DiscogsRelease = await db.getRelease(id);

    // Use the mapper to convert DiscogsRelease to Album
    const album = mapDiscogsReleaseToAlbum(releaseDetails);

    return NextResponse.json({
      album,
      success: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch release details',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
