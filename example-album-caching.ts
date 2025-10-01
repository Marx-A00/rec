// @ts-nocheck
/* example-album-caching.ts - example script not part of production build */

import prisma from '@/lib/prisma';

export interface CachedAlbumData {
  albums: Array<{
    id: string;
    title: string;
    artistNames: string;
    coverArtUrl: string;
    releaseDate: string;
    averageRating?: number;
    totalRecommendations?: number;
  }>;
  total: number;
  fetchedAt: string;
}

export async function getCachedPopularAlbums(): Promise<CachedAlbumData | null> {
  try {
    const cached = await prisma.cacheData.findUnique({
      where: { key: 'albums_popular' },
    });

    if (cached && cached.expires > new Date()) {
      return cached.data as CachedAlbumData;
    }

    return null;
  } catch (error) {
    console.error('Error fetching cached albums:', error);
    return null;
  }
}

export async function cachePopularAlbums(albumsData: CachedAlbumData) {
  try {
    await prisma.cacheData.upsert({
      where: { key: 'albums_popular' },
      create: {
        key: 'albums_popular',
        data: albumsData,
        expires: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
      },
      update: {
        data: albumsData,
        expires: new Date(Date.now() + 2 * 60 * 60 * 1000),
      },
    });
  } catch (error) {
    console.error('Error caching albums:', error);
  }
}

// src/app/api/albums/popular/route.ts
export async function GET() {
  try {
    // 1. Check cache first
    const cached = await getCachedPopularAlbums();
    if (cached) {
      return NextResponse.json({
        success: true,
        source: 'cache',
        data: cached,
        expires: cached.fetchedAt,
      });
    }

    // 2. If not cached, fetch from database (expensive query)
    const albums = await prisma.album.findMany({
      select: {
        id: true,
        title: true,
        coverArtUrl: true,
        releaseDate: true,
        artists: {
          select: { artist: { select: { name: true } } },
        },
        basisRecommendations: { select: { score: true } },
        targetRecommendations: { select: { score: true } },
      },
      where: {
        // Complex filtering logic
        releaseDate: { gte: new Date('2020-01-01') },
        basisRecommendations: { some: {} },
      },
      orderBy: [
        { basisRecommendations: { _count: 'desc' } },
        { targetRecommendations: { _count: 'desc' } },
      ],
      take: 50,
    });

    // 3. Process and transform data
    const albumsData: CachedAlbumData = {
      albums: albums.map(album => ({
        id: album.id,
        title: album.title,
        artistNames: album.artists.map(a => a.artist.name).join(', '),
        coverArtUrl: album.coverArtUrl,
        releaseDate: album.releaseDate?.toISOString() || '',
        totalRecommendations:
          album.basisRecommendations.length +
          album.targetRecommendations.length,
      })),
      total: albums.length,
      fetchedAt: new Date().toISOString(),
    };

    // 4. Cache the results
    await cachePopularAlbums(albumsData);

    return NextResponse.json({
      success: true,
      source: 'fresh',
      data: albumsData,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch popular albums' },
      { status: 500 }
    );
  }
}

// src/hooks/usePopularAlbums.ts
import { useQuery } from '@tanstack/react-query';

export function usePopularAlbums() {
  return useQuery({
    queryKey: ['albums', 'popular'],
    queryFn: async () => {
      const response = await fetch('/api/albums/popular');
      if (!response.ok) throw new Error('Failed to fetch popular albums');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes (let React Query handle short-term caching)
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
}
