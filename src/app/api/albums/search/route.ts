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

  if (!query) {
    console.log('Missing query parameter');
    return NextResponse.json(
      { error: 'Query parameter is required' },
      { status: 400 }
    );
  }

  try {
    console.log(`Searching Discogs for: "${query}"`);

    // Search for albums on Discogs with more flexible parameters
    const searchResults = await db.search({
      query,
      // Don't restrict to master or album to get more results
      per_page: 10,
    });

    console.log(`Found ${searchResults.results?.length || 0} results`);

    if (!searchResults.results || searchResults.results.length === 0) {
      console.log('No results found');
      return NextResponse.json({ albums: [] });
    }

    // Process the results to match our Album interface
    const albums = searchResults.results.map((result: DiscogsSearchResult) => {
      // Extract title and artist from the result
      let title = result.title;
      let artist = 'Unknown Artist';

      // Handle different Discogs result formats
      if (result.title.includes(' - ')) {
        const parts = result.title.split(' - ');
        artist = parts[0] || 'Unknown Artist';
        title = parts[1] || result.title;
      } else if (result.artist) {
        artist = result.artist;
      }

      // Get the image URL from the result
      const imageUrl = result.cover_image || result.thumb || PLACEHOLDER_IMAGE;

      return {
        id: result.id.toString(),
        title: title,
        artist: artist,
        releaseDate: result.year || '',
        genre: result.genre || [],
        label: result.label?.[0] || '',
        image: {
          url: imageUrl,
          width: 400, // Consistent width
          height: 400, // Consistent height
          alt: title || 'Album cover',
        },
        tracks: [],
        metadata: {
          totalDuration: 0,
          numberOfTracks: 0,
        },
      };
    });

    return NextResponse.json({ albums });
  } catch (error) {
    console.error('Error searching Discogs:', error);
    // Include the error message in the response for debugging
    return NextResponse.json(
      {
        error: 'Failed to search albums',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
