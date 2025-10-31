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
      followedId: userId,
    };

    // Add search filter if provided
    if (search) {
      whereClause.follower = {
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

    // Determine sort order
    const orderBy =
      sort === 'alphabetical'
        ? { follower: { name: 'asc' as const } }
        : { createdAt: 'desc' as const };

    // Fetch followers with user details
    const followers = await prisma.userFollow.findMany({
      where: whereClause,
      include: {
        follower: {
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
      orderBy,
      take: limit + 1, // Take one extra to check if there are more results
    });

    // Check if there are more results
    const hasMore = followers.length > limit;
    const results = hasMore ? followers.slice(0, limit) : followers;

    // Get next cursor
    const nextCursor = hasMore ? results[results.length - 1]?.id : null;

    // Get the IDs of users that the current user follows
    const currentUserFollowing = await prisma.userFollow.findMany({
      where: { followerId: session.user.id },
      select: { followedId: true },
    });
    const followedIds = new Set(
      currentUserFollowing.map(f => f.followedId)
    );

    // Transform the data for the response
    const followersData = results.map((follow: any) => ({
      id: follow.follower.id,
      name: follow.follower.name,
      email: follow.follower.email,
      image: follow.follower.image,
      bio: follow.follower.bio,
      followersCount: follow.follower.followersCount,
      followingCount: follow.follower.followingCount,
      recommendationsCount: follow.follower.recommendationsCount,
      followedAt: follow.createdAt.toISOString(),
      isFollowing: followedIds.has(follow.follower.id),
    }));

    return NextResponse.json({
      followers: followersData,
      hasMore,
      nextCursor,
      total: followers.length,
    });
  } catch (error) {
    console.error('Error fetching followers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
