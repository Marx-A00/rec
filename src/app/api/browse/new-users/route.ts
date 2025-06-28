import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '15');

    // Since User model doesn't have createdAt, we'll fetch users with low follower counts
    // and recent activity as a proxy for "new" users
    const users = await prisma.user.findMany({
      where: {
        followersCount: {
          lte: 10, // Users with 10 or fewer followers (likely newer users)
        },
      },
      select: {
        id: true,
        name: true,
        image: true,
        bio: true,
        followersCount: true,
        followingCount: true,
        recommendationsCount: true,
        profileUpdatedAt: true,
      },
      orderBy: [
        {
          profileUpdatedAt: 'desc',
        },
        {
          followersCount: 'asc',
        },
      ],
      take: limit,
    });

    // Transform the data to match expected format
    const transformedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      image: user.image,
      bio: user.bio,
      followersCount: user.followersCount,
      followingCount: user.followingCount,
      recommendationsCount: user.recommendationsCount,
      profileUpdatedAt: user.profileUpdatedAt?.toISOString() || null,
    }));

    return NextResponse.json({
      users: transformedUsers,
      total: transformedUsers.length,
      criteria: 'Users with low follower count (likely newer members)',
    });
  } catch (error) {
    console.error('Error fetching new users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch new users' },
      { status: 500 }
    );
  }
}
