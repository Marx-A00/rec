import { NextResponse } from 'next/server';

// GET /api/recommendations/[id] - Get single recommendation
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Temporary stub while migrating to GraphQL
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Recommendation ID required' }, { status: 400 });
  }
  return NextResponse.json({ recommendation: null, success: true });
}

// PATCH /api/recommendations/[id] - Update recommendation
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Temporary stub: accept but do nothing
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Recommendation ID required' }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}

// DELETE /api/recommendations/[id] - Delete recommendation
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Temporary stub: accept but do nothing
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Recommendation ID required' }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
