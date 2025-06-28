import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const days = parseInt(searchParams.get('days') || '7');

    // Calculate the date threshold (default: last 7 days)
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    // Fetch recently recommended albums with aggregated data
    const albumRecommendations = await prisma.recommendation.findMany({
      where: {
        createdAt: {
          gte: dateThreshold,
        },
      },
      select: {
        id: true,
        score: true,
        createdAt: true,
        recommendedAlbumDiscogsId: true,
        recommendedAlbumTitle: true,
        recommendedAlbumArtist: true,
        recommendedAlbumImageUrl: true,
        recommendedAlbumYear: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Group by album and calculate stats
    const albumsMap = new Map();

    albumRecommendations.forEach(rec => {
      const albumKey = rec.recommendedAlbumDiscogsId;

      if (!albumsMap.has(albumKey)) {
        albumsMap.set(albumKey, {
          albumId: rec.recommendedAlbumDiscogsId,
          title: rec.recommendedAlbumTitle,
          artist: rec.recommendedAlbumArtist,
          imageUrl: rec.recommendedAlbumImageUrl,
          year: rec.recommendedAlbumYear,
          recommendationCount: 0,
          totalScore: 0,
          averageScore: 0,
          recentRecommendations: [],
          latestRecommendationDate: rec.createdAt,
        });
      }

      const album = albumsMap.get(albumKey);
      album.recommendationCount++;
      album.totalScore += rec.score;
      album.averageScore =
        Math.round((album.totalScore / album.recommendationCount) * 10) / 10;

      // Keep track of recent recommendations (up to 3)
      if (album.recentRecommendations.length < 3) {
        album.recentRecommendations.push({
          id: rec.id,
          score: rec.score,
          user: rec.user,
          createdAt: rec.createdAt,
        });
      }

      // Update latest recommendation date
      if (rec.createdAt > album.latestRecommendationDate) {
        album.latestRecommendationDate = rec.createdAt;
      }
    });

    // Convert to array and sort by recommendation count, then by latest recommendation
    const trendingAlbums = Array.from(albumsMap.values())
      .sort((a, b) => {
        // Primary sort: recommendation count (descending)
        if (b.recommendationCount !== a.recommendationCount) {
          return b.recommendationCount - a.recommendationCount;
        }
        // Secondary sort: latest recommendation date (descending)
        return (
          new Date(b.latestRecommendationDate).getTime() -
          new Date(a.latestRecommendationDate).getTime()
        );
      })
      .slice(0, limit)
      .map(album => ({
        ...album,
        latestRecommendationDate: album.latestRecommendationDate.toISOString(),
        recentRecommendations: album.recentRecommendations.map((rec: any) => ({
          ...rec,
          createdAt: rec.createdAt.toISOString(),
        })),
      }));

    return NextResponse.json({
      albums: trendingAlbums,
      total: trendingAlbums.length,
      dateRange: {
        from: dateThreshold.toISOString(),
        to: new Date().toISOString(),
      },
      stats: {
        totalRecommendations: albumRecommendations.length,
        uniqueAlbums: albumsMap.size,
      },
    });
  } catch (error) {
    console.error('Error fetching trending albums:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending albums' },
      { status: 500 }
    );
  }
}
