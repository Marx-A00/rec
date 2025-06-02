import { NextResponse } from 'next/server';

// This would eventually come from your database
const albums = [
  {
    id: '1',
    title: 'BRAT',
    artist: 'Charli XCX',
    // ... other album data
  },
];

export async function GET() {
  return NextResponse.json(albums);
}

export async function POST(request: Request) {
  const album = await request.json();
  // Here you would typically save to a database
  albums.push(album);
  return NextResponse.json(album);
}
