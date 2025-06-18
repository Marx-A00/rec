import { Client, DiscogsImage } from 'disconnect';
import { NextRequest, NextResponse } from 'next/server';

import { artistParamsSchema } from '@/lib/validations/params';
import {
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/validations/api';
import { ArtistRouteContext } from '@/types/api';

// Create a client with consumer key and secret from environment variables
const db = new Client({
  userAgent: 'RecProject/1.0 +http://localhost:3000',
  consumerKey: process.env.CONSUMER_KEY,
  consumerSecret: process.env.CONSUMER_SECRET,
}).database();

// Default placeholder image for artists without images
const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/400x400?text=No+Image';

export async function GET(
  request: NextRequest,
  { params }: ArtistRouteContext
): Promise<NextResponse> {
  const rawParams = await params;

  // Validate parameters
  const paramsResult = artistParamsSchema.safeParse(rawParams);
  if (!paramsResult.success) {
    console.error('Invalid artist parameters:', paramsResult.error);
    const { response, status } = createErrorResponse(
      'Invalid artist ID format',
      400,
      paramsResult.error.errors.map(e => e.message).join(', '),
      'INVALID_ARTIST_PARAMS'
    );
    return NextResponse.json(response, { status });
  }

  const { id } = paramsResult.data;

  try {
    console.log(`Fetching artist details for ID: ${id}`);

    // Try to get the artist details
    let artistDetails;
    try {
      artistDetails = await db.getArtist(id);
      console.log(`Found artist: ${artistDetails.name}`);
    } catch (artistError) {
      console.error('Error fetching artist details:', artistError);
      const { response, status } = createErrorResponse(
        'Artist not found',
        404,
        `Artist with ID ${id} does not exist`,
        'ARTIST_NOT_FOUND'
      );
      return NextResponse.json(response, { status });
    }

    console.log('Raw artist data:', JSON.stringify(artistDetails, null, 2));

    // Get the best image URL
    let imageUrl = PLACEHOLDER_IMAGE;
    if (artistDetails.images && artistDetails.images.length > 0) {
      // Find the largest image or use the first one
      const bestImage = artistDetails.images.reduce(
        (best: DiscogsImage, current: DiscogsImage) => {
          if (!best) return current;
          const bestSize = (best.width || 0) * (best.height || 0);
          const currentSize = (current.width || 0) * (current.height || 0);
          return currentSize > bestSize ? current : best;
        }
      );
      imageUrl = bestImage.uri || bestImage.uri150 || PLACEHOLDER_IMAGE;
    }

    // Format the artist data
    const artist = {
      id: id.toString(),
      title: artistDetails.name || 'Unknown Artist',
      subtitle: artistDetails.realname || '',
      type: 'artist' as const,
      image: {
        url: imageUrl,
        width: 400,
        height: 400,
        alt: `${artistDetails.name || 'Artist'} photo`,
      },
      // Additional artist-specific data
      realname: artistDetails.realname || '',
      profile: artistDetails.profile || '',
      urls: artistDetails.urls || [],
      aliases: artistDetails.aliases || [],
      members: artistDetails.members || [],
      groups: artistDetails.groups || [],
      namevariations: artistDetails.namevariations || [],
      _discogs: {
        type: 'artist',
        uri: artistDetails.uri || '',
        resource_url: artistDetails.resource_url || '',
      },
    };

    console.log(`Successfully formatted artist: ${artist.title}`);

    const { response, status } = createSuccessResponse(
      'Artist details retrieved successfully',
      { artist },
      200
    );
    return NextResponse.json(response, { status });
  } catch (error) {
    console.error('Unexpected error in artist details API:', error);
    const { response, status } = createErrorResponse(
      'Failed to fetch artist details',
      500,
      error instanceof Error ? error.message : 'Unknown error',
      'ARTIST_FETCH_FAILED'
    );
    return NextResponse.json(response, { status });
  }
}
