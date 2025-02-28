import { NextResponse } from 'next/server';
var Discogs = require('disconnect').Client;

// Create a client with a user token for authentication
// Using a personal access token is the simplest way to authenticate
// For a real app, you would store this in an environment variable
var db = new Discogs({
  userAgent: 'RecProject/1.0 +http://localhost:3000',
  // This is a dummy token - Discogs will still rate limit but should allow basic search
  userToken: 'QJRXBuUbvTQccgvYSRgKPPjJEPHAZoRJVkRQSRXW'
}).database();

// Default placeholder image for albums without images
const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/400x400?text=No+Image';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;

  if (!id) {
    return NextResponse.json({ error: 'Album ID is required' }, { status: 400 });
  }

  try {
    console.log(`Fetching album details for ID: ${id}`);
    
    // Try to get the release details
    let albumDetails;
    try {
      // Try as a master release first
      albumDetails = await db.getMaster(id);
      console.log(`Found master release: ${albumDetails.title}`);
    } catch (masterError) {
      console.log(`Not a master release, trying as regular release`);
      try {
        // If not a master, try as a regular release
        albumDetails = await db.getRelease(id);
        console.log(`Found regular release: ${albumDetails.title}`);
      } catch (releaseError) {
        console.error('Error fetching album details:', releaseError);
        return NextResponse.json({ error: 'Album not found' }, { status: 404 });
      }
    }

    // Extract tracks if available
    const tracks = albumDetails.tracklist 
      ? albumDetails.tracklist.map((track: any, index: number) => ({
          id: `${id}-${index}`,
          title: track.title || `Track ${index + 1}`,
          duration: convertDurationToSeconds(track.duration),
          trackNumber: index + 1,
        }))
      : [];

    // Calculate total duration
    const totalDuration = tracks.reduce((sum: number, track: any) => sum + (track.duration || 0), 0);

    // Format the album data to match our Album interface
    const album = {
      id: id.toString(),
      title: albumDetails.title.split(' - ')[1] || albumDetails.title,
      artist: albumDetails.artists?.[0]?.name || albumDetails.title.split(' - ')[0] || 'Unknown Artist',
      releaseDate: albumDetails.released || albumDetails.year || '',
      genre: albumDetails.genres || [],
      label: albumDetails.labels?.[0]?.name || '',
      image: {
        url: albumDetails.images?.[0]?.uri || PLACEHOLDER_IMAGE,
        width: 400,
        height: 400,
        alt: albumDetails.title,
      },
      tracks,
      metadata: {
        totalDuration,
        numberOfTracks: tracks.length,
        format: albumDetails.formats?.[0]?.name || 'Digital',
        barcode: albumDetails.identifiers?.find((id: any) => id.type === 'Barcode')?.value || '',
      },
    };

    return NextResponse.json({ album });
  } catch (error) {
    console.error('Error fetching album details:', error);
    return NextResponse.json({ error: 'Failed to fetch album details' }, { status: 500 });
  }
}

// Helper function to convert duration string (MM:SS) to seconds
function convertDurationToSeconds(durationStr: string): number {
  if (!durationStr) return 0;
  
  const parts = durationStr.split(':');
  if (parts.length === 2) {
    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);
    return minutes * 60 + seconds;
  }
  return 0;
} 