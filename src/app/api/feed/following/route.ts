import { NextRequest, NextResponse } from 'next/server';
import { Prisma, Recommendation } from '@prisma/client';

import { auth } from '@/../auth';
import prisma from '@/lib/prisma';

type RecommendationWithUser = Recommendation & {
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
};

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const cursor = searchParams.get('cursor');

    // Get users that the current user follows
    const followedUsers = await prisma.userFollow.findMany({
      where: { followerId: session.user.id },
      select: { followedId: true },
    });

    const followedUserIds = followedUsers.map(f => f.followedId);

    if (followedUserIds.length === 0) {
      return NextResponse.json({
        recommendations: [],
        hasMore: false,
        nextCursor: null,
      });
    }

    // Build where clause for pagination
    const whereClause: Prisma.RecommendationWhereInput = {
      userId: { in: followedUserIds },
    };

    // Add cursor-based pagination
    if (cursor) {
      whereClause.createdAt = {
        lt: new Date(cursor),
      };
    }

    // Fetch recommendations from followed users
    const recommendations = await prisma.recommendation.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // Take one extra to check if there are more results
    });

    // Check if there are more results
    const hasMore = recommendations.length > limit;
    const results = hasMore ? recommendations.slice(0, limit) : recommendations;

    // Get next cursor
    const nextCursor = hasMore
      ? results[results.length - 1]?.createdAt.toISOString()
      : null;

    // Transform the data for the response
    const recommendationsData = results.map((rec: RecommendationWithUser) => ({
      id: rec.id,
      score: rec.score,
      createdAt: rec.createdAt.toISOString(),
      updatedAt: rec.updatedAt.toISOString(),
      userId: rec.userId,
      basisAlbumDiscogsId: rec.basisAlbumDiscogsId,
      recommendedAlbumDiscogsId: rec.recommendedAlbumDiscogsId,
      basisAlbumTitle: rec.basisAlbumTitle,
      basisAlbumArtist: rec.basisAlbumArtist,
      basisAlbumImageUrl: rec.basisAlbumImageUrl,
      basisAlbumYear: rec.basisAlbumYear,
      recommendedAlbumTitle: rec.recommendedAlbumTitle,
      recommendedAlbumArtist: rec.recommendedAlbumArtist,
      recommendedAlbumImageUrl: rec.recommendedAlbumImageUrl,
      recommendedAlbumYear: rec.recommendedAlbumYear,
      user: rec.user,
    }));

    return NextResponse.json({
      recommendations: recommendationsData,
      hasMore,
      nextCursor,
      total: recommendationsData.length,
      followedUsersCount: followedUserIds.length,
    });
  } catch (error) {
    console.error('Error fetching following recommendations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
