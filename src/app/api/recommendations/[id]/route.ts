import { NextRequest, NextResponse } from 'next/server';

import { withApiLogging } from '@/lib/api-utils';

// GET /api/recommendations/[id] - Get single recommendation
export const GET = withApiLogging(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> => {
  // Temporary stub while migrating to GraphQL
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { error: 'Recommendation ID required' },
      { status: 400 }
    );
  }
  return NextResponse.json({ recommendation: null, success: true });
});

// PATCH /api/recommendations/[id] - Update recommendation
export const PATCH = withApiLogging(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> => {
  // Temporary stub: accept but do nothing
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { error: 'Recommendation ID required' },
      { status: 400 }
    );
  }
  return NextResponse.json({ success: true });
});

// DELETE /api/recommendations/[id] - Delete recommendation
export const DELETE = withApiLogging(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> => {
  // Temporary stub: accept but do nothing
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { error: 'Recommendation ID required' },
      { status: 400 }
    );
  }
  return NextResponse.json({ success: true });
});
