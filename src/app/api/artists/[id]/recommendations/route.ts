// src/app/api/artists/[id]/recommendations/route.ts
import { NextResponse } from 'next/server';

// Temporary stub endpoint while migrating to GraphQL. Returns empty payload
// with the same shape the client expects, to avoid type errors.
export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const artistId = params?.id;

  if (!artistId) {
    return NextResponse.json(
      { error: 'Artist ID is required' },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '12', 10);

  return NextResponse.json({
    recommendations: [],
    pagination: {
      page,
      limit,
      total: 0,
      totalPages: 0,
      hasMore: false,
    },
  });
}
