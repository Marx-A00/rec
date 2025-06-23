import { notFound } from 'next/navigation';

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
    },
  });

  return recs.map(rec => ({
    id: rec.id,
    score: rec.score,
    createdAt: rec.createdAt.toISOString(),
    updatedAt: rec.updatedAt.toISOString(),
    userId: rec.userId,
    basisAlbumDiscogsId: rec.basisAlbumDiscogsId,
    recommendedAlbumDiscogsId: rec.recommendedAlbumDiscogsId,
    basisAlbumTitle: rec.basisAlbumTitle,
    basisAlbumArtist: rec.basisAlbumArtist,
    basisAlbumImageUrl: rec.basisAlbumImageUrl || null,
    basisAlbumYear: rec.basisAlbumYear || null,
    recommendedAlbumTitle: rec.recommendedAlbumTitle,
    recommendedAlbumArtist: rec.recommendedAlbumArtist,
    recommendedAlbumImageUrl: rec.recommendedAlbumImageUrl || null,
    recommendedAlbumYear: rec.recommendedAlbumYear || null,
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
  params: { userId: string };
}

export default async function UserProfilePage({ params }: ProfilePageProps) {
  const session = await auth();
  const rawParams = params;

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
  const userData = await prisma.user.findUnique({
    where: { id: userId },
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
    image: userData.image || '/placeholder.svg?height=100&width=100',
    username: userData.email ? `@${userData.email.split('@')[0]}` : '@user',
    bio:
      (userData as any).bio ||
      'Music enthusiast | Sharing vibes and discovering new sounds',
    followersCount: (userData as any).followersCount || 0,
    followingCount: (userData as any).followingCount || 0,
    recommendationsCount: (userData as any).recommendationsCount || 0,
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
