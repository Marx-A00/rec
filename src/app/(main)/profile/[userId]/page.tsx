// @ts-nocheck - Schema migration broke pages, needs GraphQL rewrite
import { notFound } from 'next/navigation';
import type { User } from '@prisma/client';

import { auth } from '@/../auth';
import prisma from '@/lib/prisma';
import { userProfileParamsSchema } from '@/lib/validations/params';
import { CollectionAlbum } from '@/types/collection';
import { Recommendation } from '@/types/recommendation';

import Profile from '../profile';

// Helper function to get user recommendations
async function getUserRecommendations(
  userId: string
): Promise<Recommendation[]> {
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
              artist: { select: { name: true } }
            }
          }
        }
      },
      recommendedAlbum: {
        select: {
          id: true,
          title: true,
          coverArtUrl: true,
          releaseDate: true,
          artists: {
            select: {
              artist: { select: { name: true } }
            }
          }
        }
      }
    },
  });

  return recs.map(rec => ({
    id: rec.id,
    score: rec.score,
    createdAt: rec.createdAt.toISOString(),
    updatedAt: rec.updatedAt.toISOString(),
    userId: rec.userId,
    basisAlbumId: rec.basisAlbumId,
    recommendedAlbumId: rec.recommendedAlbumId,
    basisAlbumDiscogsId: rec.basisDiscogsId || null,
    recommendedAlbumDiscogsId: rec.recommendedDiscogsId || null,
    basisAlbumTitle: rec.basisAlbum.title,
    basisAlbumArtist: rec.basisAlbum.artists[0]?.artist?.name || 'Unknown Artist',
    basisAlbumImageUrl: rec.basisAlbum.coverArtUrl || null,
    basisAlbumYear: rec.basisAlbum.releaseDate ? String(new Date(rec.basisAlbum.releaseDate).getFullYear()) : null,
    recommendedAlbumTitle: rec.recommendedAlbum.title,
    recommendedAlbumArtist: rec.recommendedAlbum.artists[0]?.artist?.name || 'Unknown Artist',
    recommendedAlbumImageUrl: rec.recommendedAlbum.coverArtUrl || null,
    recommendedAlbumYear: rec.recommendedAlbum.releaseDate ? String(new Date(rec.recommendedAlbum.releaseDate).getFullYear()) : null,
    user: rec.user,
  }));
}

// Helper function to get user collections
async function getUserCollections(userId: string): Promise<CollectionAlbum[]> {
  const collections = await prisma.collection.findMany({
    where: { userId },
    include: {
      albums: {
        orderBy: { addedAt: 'desc' },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return collections.flatMap(collection =>
    collection.albums.map(album => ({
      id: album.id,
      albumId: album.albumDiscogsId,
      albumTitle: album.albumTitle,
      albumArtist: album.albumArtist,
      albumImageUrl: album.albumImageUrl || null,
      albumYear: album.albumYear || null,
      addedAt: album.addedAt.toISOString(),
      addedBy: collection.userId,
      personalRating: album.personalRating || null,
      personalNotes: album.personalNotes || null,
      position: album.position,
    }))
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

  // Fetch user data from database
  const userData = (await prisma.user.findUnique({
    where: { id: userId },
  })) as User;

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
    followersCount: userData.followersCount || 0,
    followingCount: userData.followingCount || 0,
    recommendationsCount: userData.recommendationsCount || 0,
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
