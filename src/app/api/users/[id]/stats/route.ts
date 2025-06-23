import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import prisma from '@/lib/prisma';

interface UserStats {
  userId: string;
  overview: {
    followersCount: number;
    followingCount: number;
    recommendationsCount: number;
    profileViews: number;
    joinedAt: string;
  };
  growth: {
    followersGrowth: {
      daily: number;
      weekly: number;
      monthly: number;
      percentageChange: number;
    };
    recommendationsGrowth: {
      daily: number;
      weekly: number;
      monthly: number;
    };
  };
  engagement: {
    avgRecommendationScore: number;
    totalRecommendationViews: number;
    followersFromRecommendations: number;
    mostPopularRecommendation: {
      id: string;
      title: string;
      artist: string;
      score: number;
      views: number;
    } | null;
  };
  socialReach: {
    uniqueFollowersReached: number;
    totalRecommendationImpressions: number;
    engagementRate: number;
  };
  activityPatterns: {
    mostActiveDay: string;
    mostActiveHour: number;
    avgRecommendationsPerWeek: number;
    streakDays: number;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    const targetUserId = params.id;

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        name: true,
        followersCount: true,
        followingCount: true,
        recommendationsCount: true,
        profileUpdatedAt: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Privacy check - only allow access to own stats or public stats
    const isOwnProfile = session?.user?.id === targetUserId;

    // For now, allow all stats to be public. In the future, add privacy settings
    // if (!isOwnProfile && !targetUser.statsPublic) {
    //   return NextResponse.json({ error: 'Stats are private' }, { status: 403 });
    // }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('range') || '30d'; // 7d, 30d, 90d, all

    // Calculate date ranges
    const now = new Date();
    const getDaysAgo = (days: number) =>
      new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const ranges = {
      '7d': getDaysAgo(7),
      '30d': getDaysAgo(30),
      '90d': getDaysAgo(90),
      all: new Date('2020-01-01'), // Far back date
    };

    const startDate = ranges[timeRange as keyof typeof ranges] || ranges['30d'];
    const weekAgo = getDaysAgo(7);
    const monthAgo = getDaysAgo(30);

    // Get follower growth data
    const followersGrowthData = await prisma.userFollow.groupBy({
      by: ['createdAt'],
      where: {
        followedId: targetUserId,
        createdAt: { gte: startDate },
      },
      _count: {
        id: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Calculate growth metrics
    const recentFollowers = await prisma.userFollow.count({
      where: {
        followedId: targetUserId,
        createdAt: { gte: weekAgo },
      },
    });

    const weeklyFollowers = await prisma.userFollow.count({
      where: {
        followedId: targetUserId,
        createdAt: { gte: weekAgo },
      },
    });

    const monthlyFollowers = await prisma.userFollow.count({
      where: {
        followedId: targetUserId,
        createdAt: { gte: monthAgo },
      },
    });

    const previousMonthFollowers = await prisma.userFollow.count({
      where: {
        followedId: targetUserId,
        createdAt: {
          gte: getDaysAgo(60),
          lt: monthAgo,
        },
      },
    });

    const percentageChange =
      previousMonthFollowers > 0
        ? ((monthlyFollowers - previousMonthFollowers) /
            previousMonthFollowers) *
          100
        : monthlyFollowers > 0
          ? 100
          : 0;

    // Get recommendation data
    const recommendations = await prisma.recommendation.findMany({
      where: {
        userId: targetUserId,
        createdAt: { gte: startDate },
      },
      select: {
        id: true,
        score: true,
        createdAt: true,
        basisAlbumTitle: true,
        basisAlbumArtist: true,
        recommendedAlbumTitle: true,
        recommendedAlbumArtist: true,
      },
    });

    // Calculate recommendation metrics
    const avgScore =
      recommendations.length > 0
        ? recommendations.reduce((sum, rec) => sum + rec.score, 0) /
          recommendations.length
        : 0;

    const recentRecommendations = recommendations.filter(
      r => r.createdAt >= weekAgo
    ).length;
    const weeklyRecommendations = recommendations.filter(
      r => r.createdAt >= weekAgo
    ).length;
    const monthlyRecommendations = recommendations.filter(
      r => r.createdAt >= monthAgo
    ).length;

    // Find most popular recommendation (highest score as proxy for popularity)
    const mostPopularRec =
      recommendations.length > 0
        ? recommendations.reduce((max, rec) =>
            rec.score > max.score ? rec : max
          )
        : null;

    // Calculate activity patterns
    const activityByDay = new Map<string, number>();
    const activityByHour = new Map<number, number>();

    recommendations.forEach(rec => {
      const date = rec.createdAt;
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      const hour = date.getHours();

      activityByDay.set(dayName, (activityByDay.get(dayName) || 0) + 1);
      activityByHour.set(hour, (activityByHour.get(hour) || 0) + 1);
    });

    const mostActiveDay =
      Array.from(activityByDay.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      'Monday';

    const mostActiveHour =
      Array.from(activityByHour.entries()).sort(
        (a, b) => b[1] - a[1]
      )[0]?.[0] || 12;

    // Calculate streak (consecutive days with activity)
    const sortedDates = recommendations
      .map(r => r.createdAt.toDateString())
      .filter((date, index, arr) => arr.indexOf(date) === index)
      .sort();

    let currentStreak = 0;
    let maxStreak = 0;
    let lastDate = null;

    for (const dateStr of sortedDates) {
      const date = new Date(dateStr);
      if (lastDate) {
        const daysDiff = Math.floor(
          (date.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysDiff === 1) {
          currentStreak++;
        } else {
          maxStreak = Math.max(maxStreak, currentStreak);
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }
      lastDate = date;
    }
    maxStreak = Math.max(maxStreak, currentStreak);

    // Calculate social reach metrics
    const followersReached = targetUser.followersCount; // All followers see recommendations
    const totalImpressions = recommendations.length * followersReached; // Rough estimate
    const engagementRate =
      followersReached > 0
        ? (weeklyRecommendations / Math.max(followersReached, 1)) * 100
        : 0;

    // Find earliest activity for join date estimation
    const earliestActivity = await prisma.recommendation.findFirst({
      where: { userId: targetUserId },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });

    const joinedAt =
      earliestActivity?.createdAt || targetUser.profileUpdatedAt || new Date();

    const userStats: UserStats = {
      userId: targetUserId,
      overview: {
        followersCount: targetUser.followersCount,
        followingCount: targetUser.followingCount,
        recommendationsCount: targetUser.recommendationsCount,
        profileViews: 0, // TODO: Implement profile view tracking
        joinedAt: joinedAt.toISOString(),
      },
      growth: {
        followersGrowth: {
          daily: Math.floor(recentFollowers / 7), // Average daily
          weekly: weeklyFollowers,
          monthly: monthlyFollowers,
          percentageChange: Math.round(percentageChange * 100) / 100,
        },
        recommendationsGrowth: {
          daily: Math.floor(recentRecommendations / 7),
          weekly: weeklyRecommendations,
          monthly: monthlyRecommendations,
        },
      },
      engagement: {
        avgRecommendationScore: Math.round(avgScore * 100) / 100,
        totalRecommendationViews: totalImpressions,
        followersFromRecommendations: 0, // TODO: Track conversion metrics
        mostPopularRecommendation: mostPopularRec
          ? {
              id: mostPopularRec.id,
              title: `${mostPopularRec.basisAlbumTitle} → ${mostPopularRec.recommendedAlbumTitle}`,
              artist: `${mostPopularRec.basisAlbumArtist} / ${mostPopularRec.recommendedAlbumArtist}`,
              score: mostPopularRec.score,
              views: followersReached, // Estimate
            }
          : null,
      },
      socialReach: {
        uniqueFollowersReached: followersReached,
        totalRecommendationImpressions: totalImpressions,
        engagementRate: Math.round(engagementRate * 100) / 100,
      },
      activityPatterns: {
        mostActiveDay,
        mostActiveHour,
        avgRecommendationsPerWeek:
          Math.round(
            (recommendations.length /
              Math.max(
                1,
                (now.getTime() - startDate.getTime()) /
                  (1000 * 60 * 60 * 24 * 7)
              )) *
              100
          ) / 100,
        streakDays: maxStreak,
      },
    };

    return NextResponse.json({
      stats: userStats,
      timeRange,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
