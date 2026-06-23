import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/../auth';
import { isAdmin } from '@/lib/permissions';
import prisma from '@/lib/prisma';

interface TasteProfileFavorite {
  position: number;
  artist: {
    id: string;
    name: string;
    imageUrl: string | null;
  };
}

function formatFavorites(
  favorites: Array<{
    position: number;
    artist: { id: string; name: string; imageUrl: string | null };
  }>
): TasteProfileFavorite[] {
  return favorites.map(f => ({
    position: f.position,
    artist: {
      id: f.artist.id,
      name: f.artist.name,
      imageUrl: f.artist.imageUrl,
    },
  }));
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !isAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;

    const favorites = await prisma.userFavoriteArtist.findMany({
      where: { userId },
      orderBy: { position: 'asc' },
      include: {
        artist: {
          select: { id: true, name: true, imageUrl: true },
        },
      },
    });

    // Check browse section thresholds

    // Recent recs: 3+ where both albums have cover art
    const recentRecsCount = await prisma.recommendation.count({
      where: {
        basisAlbum: {
          OR: [
            { coverArtUrl: { not: null } },
            { cloudflareImageId: { not: null } },
          ],
        },
        recommendedAlbum: {
          OR: [
            { coverArtUrl: { not: null } },
            { cloudflareImageId: { not: null } },
          ],
        },
      },
    });

    // Taste matches: read from precomputed TasteMatch table
    const tasteMatchCount = await prisma.tasteMatch.count({
      where: { userId },
    });

    // Similar artists: check if any taste profile artist has cached similar artists
    let similarArtistsAvailable = false;
    if (favorites.length > 0) {
      const { cache } = await import('@/lib/cache/redis-cache');
      for (const fav of favorites) {
        const artist = await prisma.artist.findUnique({
          where: { id: fav.artistId },
          select: { musicbrainzId: true },
        });
        if (artist?.musicbrainzId) {
          const cached = await cache.get(`cache:similar:${artist.musicbrainzId}`);
          if (cached && !cache.isMiss(cached)) {
            similarArtistsAvailable = true;
            break;
          }
        }
      }
    }

    return NextResponse.json({
      favorites: formatFavorites(favorites),
      thresholds: {
        hasTasteProfile: favorites.length > 0,
        recentRecsCount,
        recentRecsMet: recentRecsCount >= 3,
        tasteMatchCount,
        tasteMatchesMet: tasteMatchCount >= 2,
        similarArtistsAvailable,
      },
    });
  } catch (error) {
    console.error('Error fetching taste profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch taste profile' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !isAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;
    const body = (await request.json()) as {
      action?: string;
      count?: number;
      artistIds?: string[];
    };

    // Generate random taste profile
    if (body.action === 'generate') {
      const count = Math.min(body.count ?? 3, 5);

      const artists = await prisma.$queryRaw<
        Array<{ id: string; name: string; imageUrl: string | null }>
      >`
        SELECT id, name, "imageUrl"
        FROM artists
        WHERE "imageUrl" IS NOT NULL
        ORDER BY RANDOM()
        LIMIT ${count}
      `;

      if (artists.length === 0) {
        return NextResponse.json(
          { error: 'No artists with images found' },
          { status: 404 }
        );
      }

      await prisma.$transaction(async tx => {
        await tx.userFavoriteArtist.deleteMany({ where: { userId } });
        await tx.userFavoriteArtist.createMany({
          data: artists.map((artist, index) => ({
            userId,
            artistId: artist.id,
            position: index + 1,
          })),
        });
      });

      const newFavorites = await prisma.userFavoriteArtist.findMany({
        where: { userId },
        orderBy: { position: 'asc' },
        include: {
          artist: {
            select: { id: true, name: true, imageUrl: true },
          },
        },
      });

      return NextResponse.json({ favorites: formatFavorites(newFavorites) });
    }

    // Set specific artist IDs (or clear with empty array)
    const artistIds = body.artistIds ?? [];
    if (artistIds.length > 5) {
      return NextResponse.json(
        { error: 'Maximum 5 favorite artists allowed' },
        { status: 400 }
      );
    }

    await prisma.$transaction(async tx => {
      await tx.userFavoriteArtist.deleteMany({ where: { userId } });
      if (artistIds.length > 0) {
        await tx.userFavoriteArtist.createMany({
          data: artistIds.map((artistId, index) => ({
            userId,
            artistId,
            position: index + 1,
          })),
        });
      }
    });

    const newFavorites = await prisma.userFavoriteArtist.findMany({
      where: { userId },
      orderBy: { position: 'asc' },
      include: {
        artist: {
          select: { id: true, name: true, imageUrl: true },
        },
      },
    });

    return NextResponse.json({ favorites: formatFavorites(newFavorites) });
  } catch (error) {
    console.error('Error updating taste profile:', error);
    return NextResponse.json(
      { error: 'Failed to update taste profile' },
      { status: 500 }
    );
  }
}
