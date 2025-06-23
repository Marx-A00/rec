import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import prisma from '@/lib/prisma';

interface SuggestionUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  bio: string | null;
  followersCount: number;
  followingCount: number;
  recommendationsCount: number;
  mutualConnectionsCount: number;
  sharedInterests: string[];
  suggestionReason: string;
  suggestionScore: number;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 20);

    const currentUserId = session.user.id;

    // Get users the current user is already following
    const alreadyFollowing = await prisma.userFollow.findMany({
      where: { followerId: currentUserId },
      select: { followedId: true },
    });

    const followingIds = alreadyFollowing.map(f => f.followedId);
    const excludeIds = [...followingIds, currentUserId]; // Exclude self and already following

    // Get current user's recommendation data for analysis
    const userRecommendations = await prisma.recommendation.findMany({
      where: { userId: currentUserId },
      select: {
        basisAlbumArtist: true,
        recommendedAlbumArtist: true,
        basisAlbumTitle: true,
        recommendedAlbumTitle: true,
      },
    });

    // Extract artists and genres from user's recommendations
    const userArtists = new Set<string>();
    userRecommendations.forEach(rec => {
      if (rec.basisAlbumArtist)
        userArtists.add(rec.basisAlbumArtist.toLowerCase());
      if (rec.recommendedAlbumArtist)
        userArtists.add(rec.recommendedAlbumArtist.toLowerCase());
    });

    const suggestions: SuggestionUser[] = [];

    // 1. MUTUAL CONNECTIONS ALGORITHM
    // Find users followed by people the current user follows
    if (followingIds.length > 0) {
      const mutualConnectionSuggestions = await prisma.user.findMany({
        where: {
          id: { notIn: excludeIds },
          followers: {
            some: {
              followerId: { in: followingIds },
            },
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
              followerId: { in: followingIds },
            },
            include: {
              follower: {
                select: { name: true },
              },
            },
            take: 5,
          },
        },
        take: Math.ceil(limit * 0.4), // 40% of suggestions from mutual connections
      });

      mutualConnectionSuggestions.forEach(user => {
        const mutualCount = user.followers.length;
        const mutualNames = user.followers
          .map(f => f.follower.name)
          .filter(Boolean)
          .slice(0, 3);

        suggestions.push({
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          bio: (user as any).bio || null,
          followersCount: user._count.followers,
          followingCount: user._count.following,
          recommendationsCount: user._count.recommendations,
          mutualConnectionsCount: mutualCount,
          sharedInterests: [],
          suggestionReason:
            mutualCount === 1
              ? `Followed by ${mutualNames[0]}`
              : `Followed by ${mutualNames.slice(0, 2).join(', ')}${mutualCount > 2 ? ` and ${mutualCount - 2} others` : ''}`,
          suggestionScore: Math.min(
            mutualCount * 20 + user._count.recommendations * 2,
            100
          ),
        });
      });
    }

    // 2. MUSIC TASTE SIMILARITY ALGORITHM
    // Find users with similar music taste based on recommendation data
    if (userArtists.size > 0) {
      const musicTasteSuggestions = await prisma.user.findMany({
        where: {
          id: { notIn: [...excludeIds, ...suggestions.map(s => s.id)] },
          recommendations: {
            some: {
              OR: [
                {
                  basisAlbumArtist: {
                    in: Array.from(userArtists),
                    mode: 'insensitive',
                  },
                },
                {
                  recommendedAlbumArtist: {
                    in: Array.from(userArtists),
                    mode: 'insensitive',
                  },
                },
              ],
            },
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
          recommendations: {
            select: {
              basisAlbumArtist: true,
              recommendedAlbumArtist: true,
            },
            take: 20,
          },
        },
        take: Math.ceil(limit * 0.4), // 40% from music taste similarity
      });

      musicTasteSuggestions.forEach(user => {
        const userRecArtists = new Set<string>();
        user.recommendations.forEach(rec => {
          if (rec.basisAlbumArtist)
            userRecArtists.add(rec.basisAlbumArtist.toLowerCase());
          if (rec.recommendedAlbumArtist)
            userRecArtists.add(rec.recommendedAlbumArtist.toLowerCase());
        });

        // Find shared artists
        const sharedArtists = Array.from(userArtists).filter(artist =>
          userRecArtists.has(artist)
        );

        if (sharedArtists.length > 0) {
          const displayArtists = sharedArtists.slice(0, 3).map(artist =>
            artist
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')
          );

          suggestions.push({
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            bio: (user as any).bio || null,
            followersCount: user._count.followers,
            followingCount: user._count.following,
            recommendationsCount: user._count.recommendations,
            mutualConnectionsCount: 0,
            sharedInterests: displayArtists,
            suggestionReason:
              sharedArtists.length === 1
                ? `Also likes ${displayArtists[0]}`
                : `Shares taste in ${displayArtists.slice(0, 2).join(', ')}${sharedArtists.length > 2 ? ` and ${sharedArtists.length - 2} others` : ''}`,
            suggestionScore: Math.min(
              sharedArtists.length * 15 + user._count.recommendations * 3,
              100
            ),
          });
        }
      });
    }

    // 3. ACTIVE USERS ALGORITHM
    // Fill remaining slots with active users (recent recommendations)
    const remainingSlots = limit - suggestions.length;
    if (remainingSlots > 0) {
      const activeUsers = await prisma.user.findMany({
        where: {
          id: { notIn: [...excludeIds, ...suggestions.map(s => s.id)] },
          recommendations: {
            some: {
              createdAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
              },
            },
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
        },
        orderBy: {
          recommendations: {
            _count: 'desc',
          },
        },
        take: remainingSlots,
      });

      activeUsers.forEach(user => {
        suggestions.push({
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          bio: (user as any).bio || null,
          followersCount: user._count.followers,
          followingCount: user._count.following,
          recommendationsCount: user._count.recommendations,
          mutualConnectionsCount: 0,
          sharedInterests: [],
          suggestionReason:
            user._count.recommendations > 10
              ? 'Very active music discoverer'
              : 'Active in the community',
          suggestionScore: Math.min(
            user._count.recommendations * 5 + user._count.followers,
            100
          ),
        });
      });
    }

    // Sort by suggestion score (highest first) and take the limit
    const sortedSuggestions = suggestions
      .sort((a, b) => b.suggestionScore - a.suggestionScore)
      .slice(0, limit);

    return NextResponse.json({
      suggestions: sortedSuggestions,
      total: sortedSuggestions.length,
      algorithms: {
        mutualConnections: suggestions.filter(s => s.mutualConnectionsCount > 0)
          .length,
        musicTaste: suggestions.filter(s => s.sharedInterests.length > 0)
          .length,
        activeUsers: suggestions.filter(
          s => s.mutualConnectionsCount === 0 && s.sharedInterests.length === 0
        ).length,
      },
    });
  } catch (error) {
    console.error('Error fetching follow suggestions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
