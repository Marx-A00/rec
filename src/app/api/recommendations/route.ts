import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Temporary stub while migrating to GraphQL
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const perPage = parseInt(searchParams.get('per_page') || '10', 10);
  return NextResponse.json({
    recommendations: [],
    pagination: { page, per_page: perPage, total: 0, has_more: false },
    success: true,
  });
}

export async function POST(request: Request) {
  // Temporary stub: accept but do nothing
  return NextResponse.json({ success: true }, { status: 201 });
}
