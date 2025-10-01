// src/app/api/albums/[id]/recommendations/route.ts
import { NextResponse } from 'next/server';

// Temporary stub endpoint while migrating to GraphQL. Returns empty payload
// to prevent type errors from legacy REST logic.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const perPage = parseInt(searchParams.get('per_page') || '12', 10);

  return NextResponse.json({
    recommendations: [],
    pagination: {
      page,
      per_page: perPage,
      total: 0,
      has_more: false,
    },
    success: true,
  });
}
