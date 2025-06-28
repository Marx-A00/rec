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

    // Fetch recent recommendations to extract trending artists
    const recommendations = await prisma.recommendation.findMany({
      where: {
        createdAt: {
          gte: dateThreshold,
        },
      },
      select: {
        id: true,
        score: true,
        createdAt: true,
        recommendedAlbumArtist: true,
        recommendedAlbumTitle: true,
        recommendedAlbumImageUrl: true,
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

    // Group by artist and calculate stats
    const artistsMap = new Map();

    recommendations.forEach(rec => {
      const artistName = rec.recommendedAlbumArtist;

      if (!artistsMap.has(artistName)) {
        artistsMap.set(artistName, {
          name: artistName,
          recommendationCount: 0,
          totalScore: 0,
          averageScore: 0,
          albumsRecommended: new Set(),
          recentRecommendations: [],
          latestRecommendationDate: rec.createdAt,
          // Use the first album image as artist image (could be improved with artist API)
          imageUrl: rec.recommendedAlbumImageUrl,
        });
      }

      const artist = artistsMap.get(artistName);
      artist.recommendationCount++;
      artist.totalScore += rec.score;
      artist.averageScore =
        Math.round((artist.totalScore / artist.recommendationCount) * 10) / 10;
      artist.albumsRecommended.add(rec.recommendedAlbumTitle);

      // Keep track of recent recommendations (up to 3)
      if (artist.recentRecommendations.length < 3) {
        artist.recentRecommendations.push({
          id: rec.id,
          score: rec.score,
          albumTitle: rec.recommendedAlbumTitle,
          user: rec.user,
          createdAt: rec.createdAt,
        });
      }

      // Update latest recommendation date
      if (rec.createdAt > artist.latestRecommendationDate) {
        artist.latestRecommendationDate = rec.createdAt;
      }

      // Update artist image if we don't have one or if this is more recent
      if (!artist.imageUrl && rec.recommendedAlbumImageUrl) {
        artist.imageUrl = rec.recommendedAlbumImageUrl;
      }
    });

    // Convert to array and sort by recommendation count, then by latest recommendation
    const trendingArtists = Array.from(artistsMap.values())
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
      .map(artist => ({
        name: artist.name,
        imageUrl: artist.imageUrl,
        recommendationCount: artist.recommendationCount,
        averageScore: artist.averageScore,
        uniqueAlbumsCount: artist.albumsRecommended.size,
        latestRecommendationDate: artist.latestRecommendationDate.toISOString(),
        recentRecommendations: artist.recentRecommendations.map((rec: any) => ({
          ...rec,
          createdAt: rec.createdAt.toISOString(),
        })),
      }));

    return NextResponse.json({
      artists: trendingArtists,
      total: trendingArtists.length,
      dateRange: {
        from: dateThreshold.toISOString(),
        to: new Date().toISOString(),
      },
      stats: {
        totalRecommendations: recommendations.length,
        uniqueArtists: artistsMap.size,
      },
    });
  } catch (error) {
    console.error('Error fetching trending artists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending artists' },
      { status: 500 }
    );
  }
}
