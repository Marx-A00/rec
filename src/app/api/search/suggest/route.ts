import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { cache } from '@/lib/cache';

interface SuggestResult {
  id: string;
  name: string;
  type: 'artist' | 'album';
  imageUrl?: string | null;
  cloudflareImageId?: string | null;
  artistName?: string;
}

interface SuggestResponse {
  results: SuggestResult[];
  cached: boolean;
}

const SUGGEST_TTL = 60; // 1 minute

function suggestCacheKey(query: string): string {
  return `cache:suggest:${query.toLowerCase().trim()}`;
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim();
  const limit = Math.min(
    parseInt(request.nextUrl.searchParams.get('limit') || '8', 10),
    20
  );

  if (!q || q.length < 1) {
    return NextResponse.json({ results: [], cached: false });
  }

  const cacheKey = suggestCacheKey(q);
  const cached = await cache.get<SuggestResponse>(cacheKey);
  if (cached !== null) {
    return NextResponse.json({ ...cached, cached: true });
  }

  const results: SuggestResult[] = [];

  // Query artists and albums in parallel — local DB only, fast prefix match
  const [artists, albums] = await Promise.all([
    prisma.artist.findMany({
      where: {
        name: { startsWith: q, mode: 'insensitive' },
      },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        cloudflareImageId: true,
      },
      orderBy: { name: 'asc' },
      take: Math.ceil(limit / 2),
    }),
    prisma.album.findMany({
      where: {
        title: { startsWith: q, mode: 'insensitive' },
      },
      include: {
        artists: {
          include: { artist: { select: { name: true } } },
          take: 1,
        },
      },
      orderBy: { title: 'asc' },
      take: Math.ceil(limit / 2),
    }),
  ]);

  for (const artist of artists) {
    results.push({
      id: artist.id,
      name: artist.name,
      type: 'artist',
      imageUrl: artist.imageUrl,
      cloudflareImageId: artist.cloudflareImageId,
    });
  }

  for (const album of albums) {
    results.push({
      id: album.id,
      name: album.title,
      type: 'album',
      imageUrl: album.coverArtUrl,
      cloudflareImageId: album.cloudflareImageId ?? undefined,
      artistName: album.artists[0]?.artist?.name,
    });
  }

  const response: SuggestResponse = { results, cached: false };

  if (results.length > 0) {
    await cache.set(cacheKey, response, SUGGEST_TTL);
  }

  return NextResponse.json(response);
}
