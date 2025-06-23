import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/../auth';
import prisma from '@/lib/prisma';

interface RecommendationMetadata {
  score: number;
  basisAlbumTitle: string;
  basisAlbumArtist: string;
}

interface CollectionAddMetadata {
  collectionName: string;
  personalRating: number | null;
}

interface ActivityItem {
  id: string;
  type: 'follow' | 'recommendation' | 'profile_update' | 'collection_add';
  actorId: string;
  actorName: string;
  actorImage: string | null;
  targetId?: string;
  targetName?: string;
  targetImage?: string | null;
  albumId?: string;
  albumTitle?: string;
  albumArtist?: string;
  albumImage?: string | null;
  createdAt: string;
  metadata?: RecommendationMetadata | CollectionAddMetadata;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const cursor = searchParams.get('cursor');
    const activityType = searchParams.get('type'); // filter by activity type

    // Get users that the current user follows
    const followedUsers = await prisma.userFollow.findMany({
      where: { followerId: session.user.id },
      select: { followedId: true },
    });

    const followedUserIds = followedUsers.map(f => f.followedId);

    if (followedUserIds.length === 0) {
      return NextResponse.json({
        activities: [],
        hasMore: false,
        nextCursor: null,
      });
    }

    const activities: ActivityItem[] = [];

    // Build cursor condition for pagination
    const cursorCondition = cursor
      ? { createdAt: { lt: new Date(cursor) } }
      : {};

    // 1. Get follow activities (User A followed User B)
    if (!activityType || activityType === 'follow') {
      const followActivities = await prisma.userFollow.findMany({
        where: {
          followerId: { in: followedUserIds },
          ...cursorCondition,
        },
        include: {
          follower: {
            select: { id: true, name: true, image: true },
          },
          followed: {
            select: { id: true, name: true, image: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: Math.floor(limit / 3), // Distribute among activity types
      });

      followActivities.forEach(follow => {
        activities.push({
          id: `follow-${follow.id}`,
          type: 'follow',
          actorId: follow.follower.id,
          actorName: follow.follower.name || 'Unknown User',
          actorImage: follow.follower.image,
          targetId: follow.followed.id,
          targetName: follow.followed.name || 'Unknown User',
          targetImage: follow.followed.image,
          createdAt: follow.createdAt.toISOString(),
        });
      });
    }

    // 2. Get recommendation activities (User A recommended Album B)
    if (!activityType || activityType === 'recommendation') {
      const recommendationActivities = await prisma.recommendation.findMany({
        where: {
          userId: { in: followedUserIds },
          ...cursorCondition,
        },
        include: {
          user: {
            select: { id: true, name: true, image: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: Math.floor(limit / 3),
      });

      recommendationActivities.forEach(rec => {
        activities.push({
          id: `recommendation-${rec.id}`,
          type: 'recommendation',
          actorId: rec.user.id,
          actorName: rec.user.name || 'Unknown User',
          actorImage: rec.user.image,
          albumId: rec.recommendedAlbumDiscogsId,
          albumTitle: rec.recommendedAlbumTitle,
          albumArtist: rec.recommendedAlbumArtist,
          albumImage: rec.recommendedAlbumImageUrl,
          createdAt: rec.createdAt.toISOString(),
          metadata: {
            score: rec.score,
            basisAlbumTitle: rec.basisAlbumTitle,
            basisAlbumArtist: rec.basisAlbumArtist,
          },
        });
      });
    }

    // 3. Get collection activities (User A added Album B to collection)
    if (!activityType || activityType === 'collection_add') {
      const collectionActivities = await prisma.collectionAlbum.findMany({
        where: {
          collection: {
            userId: { in: followedUserIds },
            isPublic: true, // Only show public collections
          },
          addedAt: cursorCondition.createdAt
            ? { lt: cursorCondition.createdAt.lt }
            : undefined,
        },
        include: {
          collection: {
            include: {
              user: {
                select: { id: true, name: true, image: true },
              },
            },
          },
        },
        orderBy: { addedAt: 'desc' },
        take: Math.floor(limit / 3),
      });

      collectionActivities.forEach(album => {
        activities.push({
          id: `collection-${album.id}`,
          type: 'collection_add',
          actorId: album.collection.user.id,
          actorName: album.collection.user.name || 'Unknown User',
          actorImage: album.collection.user.image,
          albumId: album.albumDiscogsId,
          albumTitle: album.albumTitle,
          albumArtist: album.albumArtist,
          albumImage: album.albumImageUrl,
          createdAt: album.addedAt.toISOString(),
          metadata: {
            collectionName: album.collection.name,
            personalRating: album.personalRating,
          },
        });
      });
    }

    // Sort all activities by creation date
    activities.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Take only the requested limit
    const limitedActivities = activities.slice(0, limit);
    const hasMore = activities.length > limit;
    const nextCursor = hasMore
      ? limitedActivities[limitedActivities.length - 1]?.createdAt
      : null;

    return NextResponse.json({
      activities: limitedActivities,
      hasMore,
      nextCursor,
      total: limitedActivities.length,
    });
  } catch (error) {
    console.error('Error fetching social feed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
