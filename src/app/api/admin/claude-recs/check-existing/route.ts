import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/../auth';
import { isAdmin } from '@/lib/permissions';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !isAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as { musicbrainzIds: string[] };

    if (
      !body.musicbrainzIds ||
      !Array.isArray(body.musicbrainzIds) ||
      body.musicbrainzIds.length === 0
    ) {
      return NextResponse.json(
        { error: 'musicbrainzIds array is required' },
        { status: 400 }
      );
    }

    const albums = await prisma.album.findMany({
      where: {
        musicbrainzId: { in: body.musicbrainzIds },
      },
      select: {
        id: true,
        musicbrainzId: true,
        gameStatus: true,
      },
    });

    const existing: Record<string, { albumId: string; gameStatus: string }> =
      {};
    for (const album of albums) {
      if (album.musicbrainzId) {
        existing[album.musicbrainzId] = {
          albumId: album.id,
          gameStatus: album.gameStatus,
        };
      }
    }

    return NextResponse.json({ existing });
  } catch (error) {
    console.error('Check existing albums error:', error);
    return NextResponse.json(
      { error: 'Failed to check existing albums' },
      { status: 500 }
    );
  }
}
