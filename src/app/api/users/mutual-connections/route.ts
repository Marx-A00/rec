import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/../auth';
import prisma from '@/lib/prisma';

interface MutualConnection {
  id: string;
  username: string | null;
  email: string | null;
  image: string | null;
  bio: string | null;
  followersCount: number;
  followingCount: number;
  recommendationsCount: number;
  connectionType: 'mutual_following' | 'follows_you' | 'you_follow';
  connectionDate: string;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const currentUserId = session.user.id;

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'userId parameter is required' },
        { status: 400 }
      );
    }

    if (targetUserId === currentUserId) {
      return NextResponse.json(
        { error: 'Cannot get mutual connections with yourself' },
        { status: 400 }
      );
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, username: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      );
    }

    // Get users that both current user and target user follow
    const mutualFollowing = await prisma.user.findMany({
      where: {
        AND: [
          {
            followers: {
              some: { followerId: currentUserId },
            },
          },
          {
            followers: {
              some: { followerId: targetUserId },
            },
          },
        ],
        id: {
          notIn: [currentUserId, targetUserId],
        },
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
            OR: [{ followerId: currentUserId }, { followerId: targetUserId }],
          },
          select: {
            followerId: true,
            createdAt: true,
          },
        },
      },
      take: limit,
      orderBy: {
        followers: {
          _count: 'desc',
        },
      },
    });

    const mutualConnections: MutualConnection[] = mutualFollowing.map(user => {
      // Find the most recent connection date between current user and target user
      const connections = user.followers.filter(
        f => f.followerId === currentUserId || f.followerId === targetUserId
      );
      const mostRecentConnection = connections.reduce((latest, current) =>
        current.createdAt > latest.createdAt ? current : latest
      );

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        image: user.image,
        bio: (user as any).bio || null,
        followersCount: user._count.followers,
        followingCount: user._count.following,
        recommendationsCount: user._count.recommendations,
        connectionType: 'mutual_following' as const,
        connectionDate: mostRecentConnection.createdAt.toISOString(),
      };
    });

    // Also get users who follow the target user but not the current user (potential connections)
    const targetUserFollowers = await prisma.user.findMany({
      where: {
        AND: [
          {
            followers: {
              some: { followerId: targetUserId },
            },
          },
          {
            followers: {
              none: { followerId: currentUserId },
            },
          },
        ],
        id: {
          notIn: [
            currentUserId,
            targetUserId,
            ...mutualConnections.map(mc => mc.id),
          ],
        },
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
          where: { followerId: targetUserId },
          select: { createdAt: true },
          take: 1,
        },
      },
      take: Math.max(limit - mutualConnections.length, 5),
      orderBy: {
        followers: {
          _count: 'desc',
        },
      },
    });

    const potentialConnections: MutualConnection[] = targetUserFollowers.map(
      user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        image: user.image,
        bio: (user as any).bio || null,
        followersCount: user._count.followers,
        followingCount: user._count.following,
        recommendationsCount: user._count.recommendations,
        connectionType: 'follows_you' as const,
        connectionDate:
          user.followers[0]?.createdAt.toISOString() ||
          new Date().toISOString(),
      })
    );

    const allConnections = [
      ...mutualConnections,
      ...potentialConnections,
    ].slice(0, limit);

    return NextResponse.json({
      connections: allConnections,
      total: allConnections.length,
      targetUser: {
        id: targetUser.id,
        username: targetUser.username,
      },
      stats: {
        mutual_following: mutualConnections.length,
        potential_connections: potentialConnections.length,
      },
    });
  } catch (error) {
    console.error('Error fetching mutual connections:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
