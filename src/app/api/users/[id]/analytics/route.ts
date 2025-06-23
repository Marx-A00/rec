import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/../auth';
import prisma from '@/lib/prisma';

interface TimeSeriesPoint {
  date: string;
  value: number;
}

interface AnalyticsData {
  userId: string;
  timeRange: string;
  metrics: {
    followersOverTime: TimeSeriesPoint[];
    recommendationsOverTime: TimeSeriesPoint[];
    engagementOverTime: TimeSeriesPoint[];
    activityHeatmap: {
      day: string;
      hour: number;
      value: number;
    }[];
  };
  summary: {
    totalGrowth: number;
    peakActivity: string;
    mostActiveHour: number;
    consistencyScore: number;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await auth();
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
      select: { id: true, name: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('range') || '30d'; // 7d, 30d, 90d
    const granularity = searchParams.get('granularity') || 'daily'; // daily, weekly

    // Calculate date ranges
    const now = new Date();
    const getDaysAgo = (days: number) =>
      new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const ranges = {
      '7d': getDaysAgo(7),
      '30d': getDaysAgo(30),
      '90d': getDaysAgo(90),
    };

    const startDate = ranges[timeRange as keyof typeof ranges] || ranges['30d'];

    // Helper function to create date buckets
    const createDateBuckets = (start: Date, end: Date, granularity: string) => {
      const buckets: Date[] = [];
      const current = new Date(start);
      const increment = granularity === 'weekly' ? 7 : 1;

      while (current <= end) {
        buckets.push(new Date(current));
        current.setDate(current.getDate() + increment);
      }

      return buckets;
    };

    const dateBuckets = createDateBuckets(startDate, now, granularity);

    // Get follower growth over time
    const followerData = await prisma.userFollow.findMany({
      where: {
        followedId: targetUserId,
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Process follower growth into time series
    const followersOverTime: TimeSeriesPoint[] = [];
    let cumulativeFollowers = 0;

    // Get baseline follower count before the period
    const baselineFollowers = await prisma.userFollow.count({
      where: {
        followedId: targetUserId,
        createdAt: { lt: startDate },
      },
    });

    cumulativeFollowers = baselineFollowers;

    for (const bucket of dateBuckets) {
      const nextBucket = new Date(bucket);
      nextBucket.setDate(
        nextBucket.getDate() + (granularity === 'weekly' ? 7 : 1)
      );

      const newFollowersInPeriod = followerData.filter(
        f => f.createdAt >= bucket && f.createdAt < nextBucket
      ).length;

      cumulativeFollowers += newFollowersInPeriod;

      followersOverTime.push({
        date: bucket.toISOString().split('T')[0],
        value: cumulativeFollowers,
      });
    }

    // Get recommendation activity over time
    const recommendationData = await prisma.recommendation.findMany({
      where: {
        userId: targetUserId,
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
        score: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Process recommendations into time series
    const recommendationsOverTime: TimeSeriesPoint[] = [];
    const engagementOverTime: TimeSeriesPoint[] = [];

    for (const bucket of dateBuckets) {
      const nextBucket = new Date(bucket);
      nextBucket.setDate(
        nextBucket.getDate() + (granularity === 'weekly' ? 7 : 1)
      );

      const recsInPeriod = recommendationData.filter(
        r => r.createdAt >= bucket && r.createdAt < nextBucket
      );

      const recCount = recsInPeriod.length;
      const avgScore =
        recCount > 0
          ? recsInPeriod.reduce((sum, r) => sum + r.score, 0) / recCount
          : 0;

      recommendationsOverTime.push({
        date: bucket.toISOString().split('T')[0],
        value: recCount,
      });

      engagementOverTime.push({
        date: bucket.toISOString().split('T')[0],
        value: Math.round(avgScore * 100) / 100,
      });
    }

    // Create activity heatmap (day of week vs hour of day)
    const activityHeatmap: { day: string; hour: number; value: number }[] = [];
    const days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];

    // Initialize heatmap
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        activityHeatmap.push({
          day: days[day],
          hour,
          value: 0,
        });
      }
    }

    // Fill heatmap with actual data
    recommendationData.forEach(rec => {
      const dayOfWeek = rec.createdAt.getDay();
      const hour = rec.createdAt.getHours();

      const heatmapIndex = dayOfWeek * 24 + hour;
      if (heatmapIndex < activityHeatmap.length) {
        activityHeatmap[heatmapIndex].value++;
      }
    });

    // Calculate summary metrics
    const totalGrowth =
      followersOverTime.length > 1
        ? followersOverTime[followersOverTime.length - 1].value -
          followersOverTime[0].value
        : 0;

    const peakActivityDate = recommendationsOverTime.reduce(
      (max, point) => (point.value > max.value ? point : max),
      { date: '', value: 0 }
    ).date;

    const mostActiveHour = activityHeatmap.reduce((max, point) =>
      point.value > max.value ? point : max
    ).hour;

    // Calculate consistency score (how evenly distributed activity is)
    const nonZeroPoints = recommendationsOverTime.filter(
      p => p.value > 0
    ).length;
    const totalPoints = recommendationsOverTime.length;
    const consistencyScore =
      totalPoints > 0 ? (nonZeroPoints / totalPoints) * 100 : 0;

    const analytics: AnalyticsData = {
      userId: targetUserId,
      timeRange,
      metrics: {
        followersOverTime,
        recommendationsOverTime,
        engagementOverTime,
        activityHeatmap,
      },
      summary: {
        totalGrowth,
        peakActivity: peakActivityDate,
        mostActiveHour,
        consistencyScore: Math.round(consistencyScore * 100) / 100,
      },
    };

    return NextResponse.json({
      analytics,
      generatedAt: new Date().toISOString(),
      granularity,
    });
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
