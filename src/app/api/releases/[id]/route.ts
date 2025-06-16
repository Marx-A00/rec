import { Client } from 'disconnect';
import { NextResponse } from 'next/server';

import { mapDiscogsReleaseToAlbum } from '@/lib/discogs/mappers';
import { DiscogsRelease } from '@/types/discogs/release';

// Create a client with consumer key and secret from environment variables
const db = new Client({
  userAgent: 'RecProject/1.0 +http://localhost:3000',
  consumerKey: process.env.CONSUMER_KEY,
  consumerSecret: process.env.CONSUMER_SECRET,
}).database();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: 'Release ID is required' },
      { status: 400 }
    );
  }

  try {
    console.log(`Fetching release details for ID: ${id}`);

    // Get the release details from Discogs
    const releaseDetails: DiscogsRelease = await db.getRelease(id);
    console.log(`Found release: ${releaseDetails.title}`);
    console.log(
      'Full Release Details: ',
      JSON.stringify(releaseDetails, null, 2)
    );

    // Use the mapper to convert DiscogsRelease to Album
    const album = mapDiscogsReleaseToAlbum(releaseDetails);

    return NextResponse.json({
      album,
      success: true,
    });
  } catch (error) {
    console.error('Error fetching release details:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch release details',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
