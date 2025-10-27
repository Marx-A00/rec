import { notFound } from 'next/navigation';
import type { User } from '@prisma/client';

import { auth } from '@/../auth';
import prisma from '@/lib/prisma';
import { userProfileParamsSchema } from '@/lib/validations/params';
import type { CollectionAlbum } from '@/types/collection';

import Profile from '../profile';

// Helper function to get user recommendations
async function getUserRecommendations(userId: string) {
  const recs = await prisma.recommendation.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, name: true, image: true } },
      basisAlbum: {
        select: {
          id: true,
          title: true,
          coverArtUrl: true,
          releaseDate: true,
          artists: {
            select: {
              artist: { select: { id: true, name: true } },
            },
          },
        },
      },
      recommendedAlbum: {
        select: {
          id: true,
          title: true,
          coverArtUrl: true,
          releaseDate: true,
          artists: {
            select: {
              artist: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  // Shape to match RecommendationFieldsFragment expected by the client
  return recs.map(rec => ({
    id: rec.id,
    score: rec.score,
    createdAt: rec.createdAt,
    user: rec.user,
    basisAlbum: {
      id: rec.basisAlbum.id,
      title: rec.basisAlbum.title,
      coverArtUrl: rec.basisAlbum.coverArtUrl,
      artists: rec.basisAlbum.artists.map(ac => ({
        artist: { id: ac.artist.id, name: ac.artist.name },
      })),
    },
    recommendedAlbum: {
      id: rec.recommendedAlbum.id,
      title: rec.recommendedAlbum.title,
      coverArtUrl: rec.recommendedAlbum.coverArtUrl,
      artists: rec.recommendedAlbum.artists.map(ac => ({
        artist: { id: ac.artist.id, name: ac.artist.name },
      })),
    },
  }));
}

// Helper function to get user collections
async function getUserCollections(userId: string): Promise<CollectionAlbum[]> {
  const collections = await prisma.collection.findMany({
    where: { userId },
    include: {
      albums: {
        orderBy: { addedAt: 'desc' },
        include: {
          album: {
            select: {
              title: true,
              coverArtUrl: true,
              releaseDate: true,
              artists: {
                select: {
                  artist: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return collections.flatMap(collection =>
    collection.albums.map(
      (album): CollectionAlbum => ({
        id: album.id,
        albumId: String(album.albumId ?? album.discogsId ?? ''),
        albumTitle: album.album.title,
        albumArtist: album.album.artists.map(a => a.artist.name).join(', '),
        albumImageUrl: album.album.coverArtUrl ?? null,
        albumYear: album.album.releaseDate
          ? String(new Date(album.album.releaseDate).getFullYear())
          : null,
        addedAt: album.addedAt.toISOString(),
        addedBy: collection.userId,
        personalRating: album.personalRating ?? null,
        personalNotes: album.personalNotes ?? null,
        position: album.position,
      })
    )
  );
}

interface ProfilePageProps {
  params: Promise<{ userId: string }>;
}

export default async function UserProfilePage({ params }: ProfilePageProps) {
  const session = await auth();
  const rawParams = await params;

  // Validate parameters
  const paramsResult = userProfileParamsSchema.safeParse(rawParams);
  if (!paramsResult.success) {
    console.error('Invalid user profile parameters:', paramsResult.error);
    notFound();
  }

  const { userId } = paramsResult.data;

  // Check if viewing own profile
  const isOwnProfile = session?.user?.id === userId;

  // Fetch user data from database with calculated counts
  const userData = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: {
        select: {
          followers: true,
          following: true,
          recommendations: true,
        },
      },
    },
  });

  if (!userData) {
    notFound();
  }

  // Get collections and recommendations
  const [collection, recommendations] = await Promise.all([
    getUserCollections(userId),
    getUserRecommendations(userId),
  ]);

  // Create user object for Profile component
  const user = {
    id: userData.id,
    name: userData.name || 'User',
    email: userData.email || null,
    image: userData.image || '/placeholder.svg',
    username: userData.email ? `@${userData.email.split('@')[0]}` : '@user',
    bio:
      userData.bio ||
      'Music enthusiast | Sharing vibes and discovering new sounds',
    followersCount: userData._count.followers,
    followingCount: userData._count.following,
    recommendationsCount: userData._count.recommendations,
    role: userData.role,
  };

  return (
    <Profile
      user={user}
      collection={collection}
      recommendations={recommendations}
      isOwnProfile={isOwnProfile}
    />
  );
}
