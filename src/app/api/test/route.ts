import { NextResponse } from 'next/server';
var Discogs = require('disconnect').Client;

// Create a client with consumer key and secret from environment variables
var db = new Discogs({
  userAgent: 'RecProject/1.0 +http://localhost:3000',
  consumerKey: process.env.CONSUMER_KEY,
  consumerSecret: process.env.CONSUMER_SECRET
}).database();

export async function GET() {
  try {
    // Test with the same release ID as your working curl request
    const release = await db.getRelease(249504);
    return NextResponse.json(release);
  } catch (error: any) {
    console.error('Discogs Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const data = await request.json();
  return NextResponse.json({ message: 'Data received', data });
}