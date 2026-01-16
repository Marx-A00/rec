// @ts-nocheck - Schema migration broke API routes, needs GraphQL rewrite
import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/../auth';
import prisma from '@/lib/prisma';

interface TrendingUser {
  id: string;
  username: string | null;
  email: string | null;
  image: string | null;
  bio: string | null;
  followersCount: number;
  followingCount: number;
  recommendationsCount: number;
  followerGrowthRate: number;
  recentActivityScore: number;
  trendingScore: number;
  recentActivity: {
    newFollowers: number;
    newRecommendations: number;
    timeframe: string;
  };
  topGenres: string[];
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const timeframe = searchParams.get('timeframe') || '7d'; // 7d, 30d
    const excludeUserId = session.user.id;

    // Calculate date ranges for trending analysis
    const now = new Date();
    const timeframeDays = timeframe === '30d' ? 30 : 7;
    const startDate = new Date(
      now.getTime() - timeframeDays * 24 * 60 * 60 * 1000
    );
    const midDate = new Date(
      now.getTime() - (timeframeDays / 2) * 24 * 60 * 60 * 1000
    );

    // Get users with recent activity and follower data
    const usersWithActivity = await prisma.user.findMany({
      where: {
        id: { not: excludeUserId },
        OR: [
          {
            followers: {
              some: {
                createdAt: { gte: startDate },
              },
            },
          },
          {
            recommendations: {
              some: {
                createdAt: { gte: startDate },
              },
            },
          },
        ],
      },
      include: {
        _count: {
          select: {
            followers: true,
            following: true,
            recommendations: true,
          },
        },
        followers: {
          where: {
            createdAt: { gte: startDate },
          },
          select: {
            createdAt: true,
          },
        },
        recommendations: {
          where: {
            createdAt: { gte: startDate },
          },
          select: {
            createdAt: true,
            basisAlbumArtist: true,
            recommendedAlbumArtist: true,
            score: true,
          },
          take: 20, // Limit for genre analysis
        },
      },
      take: limit * 3, // Get more to filter and sort
    });

    const trendingUsers: TrendingUser[] = [];

    for (const user of usersWithActivity) {
      // Calculate follower growth rate
      const recentFollowers = user.followers.length;
      const firstHalfFollowers = user.followers.filter(
        f => f.createdAt >= startDate && f.createdAt <= midDate
      ).length;
      const secondHalfFollowers = user.followers.filter(
        f => f.createdAt > midDate
      ).length;

      const followerGrowthRate =
        firstHalfFollowers > 0
          ? (secondHalfFollowers / Math.max(firstHalfFollowers, 1)) * 100
          : secondHalfFollowers > 0
            ? 200
            : 0; // Boost for new users with followers

      // Calculate recent activity score
      const recentRecommendations = user.recommendations.length;
      const avgRecommendationScore =
        recentRecommendations > 0
          ? user.recommendations.reduce((sum, rec) => sum + rec.score, 0) /
            recentRecommendations
          : 0;

      const recentActivityScore =
        recentRecommendations * 10 + avgRecommendationScore * 2;

      // Extract top genres from recommendations
      const artistCounts = new Map<string, number>();
      user.recommendations.forEach(rec => {
        if (rec.basisAlbumArtist) {
          artistCounts.set(
            rec.basisAlbumArtist,
            (artistCounts.get(rec.basisAlbumArtist) || 0) + 1
          );
        }
        if (rec.recommendedAlbumArtist) {
          artistCounts.set(
            rec.recommendedAlbumArtist,
            (artistCounts.get(rec.recommendedAlbumArtist) || 0) + 1
          );
        }
      });

      const topGenres = Array.from(artistCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([artist]) => artist);

      // Calculate overall trending score
      const baseScore = Math.log(Math.max(user._count.followers, 1)) * 10; // Base popularity
      const growthBonus = followerGrowthRate * 2; // Growth multiplier
      const activityBonus = recentActivityScore; // Recent activity
      const qualityBonus = avgRecommendationScore * 5; // Quality of recommendations

      const trendingScore =
        baseScore + growthBonus + activityBonus + qualityBonus;

      // Only include users with meaningful activity or growth
      if (
        trendingScore > 20 ||
        recentFollowers > 0 ||
        recentRecommendations > 0
      ) {
        trendingUsers.push({
          id: user.id,
          username: user.username,
          email: user.email,
          image: user.image,
          bio: user.bio,
          followersCount: user._count.followers,
          followingCount: user._count.following,
          recommendationsCount: user._count.recommendations,
          followerGrowthRate: Math.round(followerGrowthRate),
          recentActivityScore: Math.round(recentActivityScore),
          trendingScore: Math.round(trendingScore),
          recentActivity: {
            newFollowers: recentFollowers,
            newRecommendations: recentRecommendations,
            timeframe: timeframe,
          },
          topGenres,
        });
      }
    }

    // Sort by trending score and take the limit
    const sortedTrendingUsers = trendingUsers
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, limit);

    return NextResponse.json({
      users: sortedTrendingUsers,
      total: sortedTrendingUsers.length,
      timeframe,
      algorithm: {
        description:
          'Trending score based on follower growth, recent activity, and recommendation quality',
        factors: [
          'follower_growth_rate',
          'recent_recommendations',
          'recommendation_quality',
          'base_popularity',
        ],
      },
    });
  } catch (error) {
    console.error('Error fetching trending users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
