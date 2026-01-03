import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/../auth';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: userId } = await params;
    const { searchParams } = new URL(request.url);

    // Pagination parameters
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const cursor = searchParams.get('cursor');
    const search = searchParams.get('search')?.trim();
    const sort = searchParams.get('sort') || 'recent'; // recent, alphabetical

    // Check if the user exists
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!userExists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build where clause for search
    const whereClause: any = {
      followerId: userId,
    };

    // Add search filter if provided
    if (search) {
      whereClause.followed = {
        name: {
          contains: search,
          mode: 'insensitive',
        },
      };
    }

    // Add cursor-based pagination
    if (cursor) {
      whereClause.id = {
        lt: cursor,
      };
    }

    // Fetch following with user details
    const following = await prisma.userFollow.findMany({
      where: whereClause,
      include: {
        followed: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            bio: true,
            followersCount: true,
            followingCount: true,
            recommendationsCount: true,
          },
        },
      },
      orderBy:
        sort === 'alphabetical'
          ? { followed: { name: 'asc' } }
          : { createdAt: 'desc' },
      take: limit + 1, // Take one extra to check if there are more results
    });

    // Check if there are more results
    const hasMore = following.length > limit;
    const results = hasMore ? following.slice(0, limit) : following;

    // Get next cursor
    const nextCursor = hasMore ? results[results.length - 1]?.id : null;

    // Get the IDs of users that the current user follows
    const currentUserFollowing = await prisma.userFollow.findMany({
      where: { followerId: session.user.id },
      select: { followedId: true },
    });
    const followedIds = new Set(currentUserFollowing.map(f => f.followedId));

    // Transform the data for the response
    const followingData = results.map((follow: any) => ({
      id: follow.followed.id,
      name: follow.followed.name,
      email: follow.followed.email,
      image: follow.followed.image,
      bio: follow.followed.bio,
      followersCount: follow.followed.followersCount,
      followingCount: follow.followed.followingCount,
      recommendationsCount: follow.followed.recommendationsCount,
      followedAt: follow.createdAt.toISOString(),
      isFollowing: followedIds.has(follow.followed.id),
    }));

    return NextResponse.json({
      following: followingData,
      hasMore,
      nextCursor,
      total: following.length,
    });
  } catch (error) {
    console.error('Error fetching following:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
