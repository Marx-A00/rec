import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/../auth';
import prisma from '@/lib/prisma';

interface NewUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  bio: string | null;
  followersCount: number;
  followingCount: number;
  recommendationsCount: number;
  joinedAt: string;
  daysSinceJoined: number;
  hasRecommendations: boolean;
  hasFollowers: boolean;
  activityLevel: 'new' | 'getting_started' | 'active';
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const maxDays = Math.min(
      parseInt(searchParams.get('max_days') || '30'),
      90
    );
    const excludeUserId = session.user.id;

    // Calculate cutoff date for "new" users
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxDays);

    // Find users who joined recently
    // Note: Using createdAt from the first recommendation or follow as a proxy for account activity
    // since we don't have a direct "joinedAt" field in the User model
    const newUsers = await prisma.user.findMany({
      where: {
        id: { not: excludeUserId },
        OR: [
          {
            recommendations: {
              some: {
                createdAt: { gte: cutoffDate },
              },
            },
          },
          {
            followers: {
              some: {
                createdAt: { gte: cutoffDate },
              },
            },
          },
          {
            following: {
              some: {
                createdAt: { gte: cutoffDate },
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
        recommendations: {
          select: {
            createdAt: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
          take: 1,
        },
        followers: {
          select: {
            createdAt: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
          take: 1,
        },
        following: {
          select: {
            createdAt: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
          take: 1,
        },
      },
      orderBy: [
        { recommendations: { _count: 'desc' } }, // Prioritize users with recommendations
        { followers: { _count: 'desc' } }, // Then by follower count
      ],
      take: limit * 2, // Get more to filter properly
    });

    const processedNewUsers: NewUser[] = [];

    for (const user of newUsers) {
      // Find the earliest activity date as a proxy for "joined date"
      const activityDates = [
        ...(user.recommendations.length > 0
          ? [user.recommendations[0].createdAt]
          : []),
        ...(user.followers.length > 0 ? [user.followers[0].createdAt] : []),
        ...(user.following.length > 0 ? [user.following[0].createdAt] : []),
      ].filter(Boolean);

      if (activityDates.length === 0) continue;

      const earliestActivity = new Date(
        Math.min(...activityDates.map(d => d.getTime()))
      );
      const daysSinceJoined = Math.floor(
        (Date.now() - earliestActivity.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Only include users who are truly "new" within our timeframe
      if (daysSinceJoined > maxDays) continue;

      // Determine activity level
      let activityLevel: 'new' | 'getting_started' | 'active' = 'new';
      if (user._count.recommendations > 0 || user._count.followers > 2) {
        activityLevel = 'getting_started';
      }
      if (user._count.recommendations > 3 && user._count.followers > 5) {
        activityLevel = 'active';
      }

      processedNewUsers.push({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        bio: (user as any).bio || null,
        followersCount: user._count.followers,
        followingCount: user._count.following,
        recommendationsCount: user._count.recommendations,
        joinedAt: earliestActivity.toISOString(),
        daysSinceJoined,
        hasRecommendations: user._count.recommendations > 0,
        hasFollowers: user._count.followers > 0,
        activityLevel,
      });
    }

    // Sort by activity level and recent activity
    const sortedNewUsers = processedNewUsers
      .sort((a, b) => {
        // Prioritize by activity level
        const activityOrder = { active: 3, getting_started: 2, new: 1 };
        const activityDiff =
          activityOrder[b.activityLevel] - activityOrder[a.activityLevel];
        if (activityDiff !== 0) return activityDiff;

        // Then by days since joined (newer first)
        return a.daysSinceJoined - b.daysSinceJoined;
      })
      .slice(0, limit);

    return NextResponse.json({
      users: sortedNewUsers,
      total: sortedNewUsers.length,
      maxDays,
      stats: {
        new: sortedNewUsers.filter(u => u.activityLevel === 'new').length,
        getting_started: sortedNewUsers.filter(
          u => u.activityLevel === 'getting_started'
        ).length,
        active: sortedNewUsers.filter(u => u.activityLevel === 'active').length,
      },
    });
  } catch (error) {
    console.error('Error fetching new users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
