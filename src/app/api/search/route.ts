import { Client, DiscogsSearchResult } from 'disconnect';
import { NextResponse } from 'next/server';

// Create a client with consumer key and secret from environment variables
const db = new Client({
  userAgent: 'RecProject/1.0 +http://localhost:3000',
  consumerKey: process.env.CONSUMER_KEY,
  consumerSecret: process.env.CONSUMER_SECRET,
}).database();

// Default placeholder image for albums without images
const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/400x400?text=No+Image';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const type = searchParams.get('type') || 'all'; // 'albums', 'artists', 'tracks', 'all'

  if (!query) {
    console.log('Missing query parameter');
    return NextResponse.json(
      { error: 'Query parameter is required' },
      { status: 400 }
    );
  }

  try {
    console.log(`Searching Discogs for: "${query}" (type: ${type})`);

    // Search for content on Discogs with flexible parameters
    const searchResults = await db.search({
      query,
      type: type === 'all' ? undefined : type, // Let Discogs handle type filtering
      per_page: 15,
    });

    console.log(`Found ${searchResults.results?.length || 0} results`);

    if (!searchResults.results || searchResults.results.length === 0) {
      console.log('No results found');
      return NextResponse.json({ results: [] });
    }

    // Process the results and categorize them
    const processedResults = searchResults.results.map(
      (result: DiscogsSearchResult) => {
        // Determine the type of result from resource_url or URI patterns
        let resultType = 'unknown';
        const url = result.resource_url || result.uri || '';

        if (url.includes('/releases/') || url.includes('/masters/')) {
          resultType = 'album';
        } else if (url.includes('/artists/')) {
          resultType = 'artist';
        } else if (url.includes('/labels/')) {
          resultType = 'label';
        } else if (result.type) {
          // Fallback to type field if it exists
          if (result.type === 'release' || result.type === 'master') {
            resultType = 'album';
          } else if (result.type === 'artist') {
            resultType = 'artist';
          } else if (result.type === 'label') {
            resultType = 'label';
          }
        }

        // Extract title and artist from the result
        let title = result.title;
        let artist = 'Unknown Artist';
        let subtitle = '';

        // Handle different result types
        if (resultType === 'album') {
          // Handle album results
          if (result.title && result.title.includes(' - ')) {
            const parts = result.title.split(' - ');
            artist = parts[0] || 'Unknown Artist';
            title = parts[1] || result.title;
          } else if (result.artist) {
            artist = result.artist;
          }
          subtitle = artist;
        } else if (resultType === 'artist') {
          // Handle artist results
          title = result.title;
          artist = result.title;
          subtitle = 'Artist';
        } else if (resultType === 'label') {
          // Handle label results
          title = result.title;
          subtitle = 'Label';
        }

        // Get the image URL from the result
        const imageUrl =
          result.cover_image || result.thumb || PLACEHOLDER_IMAGE;

        // Create a unified result object
        const unifiedResult = {
          id: result.id.toString(),
          type: resultType,
          title: title,
          subtitle: subtitle,
          artist: artist,
          releaseDate: result.year || '',
          genre: result.genre || [],
          label: result.label?.[0] || '',
          image: {
            url: imageUrl,
            width: 400,
            height: 400,
            alt: title || 'Cover image',
          },
          // Additional data for albums
          ...(resultType === 'album' && {
            tracks: [],
            metadata: {
              totalDuration: 0,
              numberOfTracks: 0,
            },
          }),
          // Store original Discogs data for reference
          _discogs: {
            type: result.type,
            uri: result.uri,
            resource_url: result.resource_url,
          },
        };

        return unifiedResult;
      }
    );

    // Group results by type for easier handling
    const groupedResults = {
      albums: processedResults.filter(r => r.type === 'album'),
      artists: processedResults.filter(r => r.type === 'artist'),
      labels: processedResults.filter(r => r.type === 'label'),
      // TODO: add other types
      other: processedResults.filter(
        r => !['album', 'artist', 'label'].includes(r.type)
      ),
    };

    return NextResponse.json({
      results: processedResults,
      grouped: groupedResults,
      total: processedResults.length,
    });
  } catch (error) {
    console.error('Error in search route:', error);
    return NextResponse.json(
      {
        error: 'Failed to search',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
