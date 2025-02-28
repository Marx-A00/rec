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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  
  if (!query) {
    console.log('Missing query parameter');
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
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
    const albums = searchResults.results.map((result: any) => {
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
      
      return {
        id: result.id.toString(),
        title: title,
        artist: artist,
        releaseDate: result.year || '',
        genre: result.genre || [],
        label: result.label?.[0] || '',
        image: {
          url: result.cover_image || result.thumb || PLACEHOLDER_IMAGE,
          width: 400,
          height: 400,
          alt: result.title,
        },
        tracks: [],
        metadata: {
          totalDuration: 0,
          numberOfTracks: 0,
        },
      };
    });

    return NextResponse.json({ albums });
  } catch (error: any) {
    console.error('Error searching Discogs:', error);
    // Include the error message in the response for debugging
    return NextResponse.json({ 
      error: 'Failed to search albums', 
      details: error.message 
    }, { status: 500 });
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