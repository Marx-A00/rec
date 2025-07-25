import { Client } from 'disconnect';
import { NextResponse } from 'next/server';

import { mapDiscogsMasterToAlbum } from '@/lib/discogs/mappers';
import { DiscogsMaster } from '@/types/discogs/master';

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
  // Ensure params is awaited before accessing properties
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: 'Album ID is required' },
      { status: 400 }
    );
  }

  try {
    console.log(`Fetching album details for ID: ${id}`);

    // Try to get the master release details
    let albumDetails: DiscogsMaster;
    try {
      albumDetails = await db.getMaster(id);
      console.log(`Found master release: ${albumDetails.title}`);
      console.log(
        'Full Master Details: ',
        JSON.stringify(albumDetails, null, 2)
      );
    } catch {
      console.log(`Not a master release, trying as regular release`);
      try {
        // If not a master, try as a regular release
        // Note: This would need a separate mapper for releases
        const releaseDetails = await db.getRelease(id);
        console.log(`Found regular release: ${releaseDetails.title}`);
        // For now, return error since we haven't implemented release mapping yet
        return NextResponse.json(
          { error: 'Release mapping not implemented yet' },
          { status: 501 }
        );
      } catch (releaseError) {
        console.error('Error fetching album details:', releaseError);
        return NextResponse.json({ error: 'Album not found' }, { status: 404 });
      }
    }

    // Use the mapper to convert DiscogsMaster to Album
    const album = mapDiscogsMasterToAlbum(albumDetails);

    return NextResponse.json({ album });
  } catch (error) {
    console.error('Error fetching album details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch album details' },
      { status: 500 }
    );
  }
}
