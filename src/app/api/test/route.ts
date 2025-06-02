import { Client, DiscogsSearchResult } from 'disconnect';
import { NextResponse } from 'next/server';

// Test endpoint to verify Discogs API connectivity
export async function GET() {
  try {
    // Create a Discogs client
    const db = new Client({
      userAgent: 'RecProject/1.0 +http://localhost:3000',
      consumerKey: process.env.CONSUMER_KEY,
      consumerSecret: process.env.CONSUMER_SECRET,
    }).database();

    // Test search to verify API connectivity
    const searchResults = await db.search({
      query: 'The Beatles Abbey Road',
      per_page: 1,
    });

    const testData: DiscogsSearchResult = searchResults.results?.[0] || null;
    console.log('Test search successful:', testData);

    return NextResponse.json({
      success: true,
      message: 'Discogs API connection successful',
      testData,
    });
  } catch (error) {
    console.error('Error in test route:', error);
    return NextResponse.json(
      {
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const data = await request.json();
  return NextResponse.json({ message: 'Data received', data });
}
