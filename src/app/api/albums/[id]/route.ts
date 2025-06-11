import { Client } from 'disconnect';
import { NextResponse } from 'next/server';

import { mapDiscogsMasterToAlbum } from '@/lib/discogs/mappers';
import { DiscogsMaster } from '@/types/discogs/master';

const log = console.log;

// Create a client with consumer key and secret from environment variables
const db = new Client({
  userAgent: 'RecProject/1.0 +http://localhost:3000',
  consumerKey: process.env.CONSUMER_KEY,
  consumerSecret: process.env.CONSUMER_SECRET,
}).database();

// Default placeholder image for albums without images
const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/400x400?text=No+Image';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Ensure params is awaited before accessing properties
  const { id } = await Promise.resolve(params);

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

// Helper function to convert duration string (MM:SS) to seconds
function convertDurationToSeconds(duration: string | number): number {
  if (typeof duration === 'number') return duration;
  if (!duration) return 0;

  const parts = duration.split(':');
  if (parts.length === 2) {
    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);
    return minutes * 60 + seconds;
  }
  return 0;
}
