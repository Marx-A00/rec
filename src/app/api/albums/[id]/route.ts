import { Client } from 'disconnect';
import { NextResponse } from 'next/server';

import { Track } from '@/types/album';

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

    // Try to get the release details
    let albumDetails;
    try {
      // Try as a master release first
      albumDetails = await db.getMaster(id);
      console.log(`Found master release: ${albumDetails.title}`);
      console.log(`Master artists:`, albumDetails.artists);
    } catch {
      console.log(`Not a master release, trying as regular release`);
      try {
        // If not a master, try as a regular release
        albumDetails = await db.getRelease(id);
        console.log(`Found regular release: ${albumDetails.title}`);
        console.log(`Release artists:`, albumDetails.artists);
      } catch (releaseError) {
        console.error('Error fetching album details:', releaseError);
        return NextResponse.json({ error: 'Album not found' }, { status: 404 });
      }
    }

    // Extract tracks if available
    const tracks = albumDetails.tracklist
      ? albumDetails.tracklist.map((track: Track, index: number) => ({
          id: `${id}-${index}`,
          title: track.title || `Track ${index + 1}`,
          duration: convertDurationToSeconds(track.duration),
          trackNumber: index + 1,
        }))
      : [];

    // Calculate total duration
    const totalDuration = tracks.reduce(
      (sum: number, track: Track) => sum + (track.duration || 0),
      0
    );

    // Get the image URL from the album details
    const imageUrl =
      albumDetails.images && albumDetails.images.length > 0
        ? albumDetails.images[0].uri
        : PLACEHOLDER_IMAGE;

    // Extract title and artist properly
    let title = albumDetails.title;
    let artist = 'Unknown Artist';

    // If we have artists array, use the first artist
    if (albumDetails.artists && albumDetails.artists.length > 0) {
      // Add console.log to see the artist data structure
      console.log('=== ARTIST DATA FROM DISCOGS ===');
      console.log(
        'Full artists array:',
        JSON.stringify(albumDetails.artists, null, 2)
      );
      console.log(
        'First artist object:',
        JSON.stringify(albumDetails.artists[0], null, 2)
      );
      console.log('================================');

      artist = albumDetails.artists[0].name;
    } else if (albumDetails.title && albumDetails.title.includes(' - ')) {
      // Fallback: try to parse from title if no artists array
      const parts = albumDetails.title.split(' - ');
      if (parts.length >= 2) {
        artist = parts[0];
        title = parts.slice(1).join(' - '); // In case there are multiple " - " in the title
      }
    }

    // Format the album data to match our Album interface
    // TODO: extend album type or change base type
    const album = {
      id: id.toString(),
      title: title,
      artist: artist,
      releaseDate: albumDetails.released || albumDetails.year || '',
      genre: albumDetails.genres || [],
      label: albumDetails.labels?.[0]?.name || '',
      image: {
        url: imageUrl,
        width: 400, // Consistent width
        height: 400, // Consistent height
        alt: title || 'Album cover',
      },
      tracks,
      metadata: {
        totalDuration,
        numberOfTracks: tracks.length,
        format: albumDetails.formats?.[0]?.name || 'Digital',
      },
    };

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
