import { notFound } from 'next/navigation';
import { auth } from '@/../auth';
import prisma from '@/lib/prisma';

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
    basisAlbumImageUrl: rec.basisAlbumImageUrl || undefined,
    basisAlbumYear: rec.basisAlbumYear || undefined,
    recommendedAlbumTitle: rec.recommendedAlbumTitle,
    recommendedAlbumArtist: rec.recommendedAlbumArtist,
    recommendedAlbumImageUrl: rec.recommendedAlbumImageUrl || undefined,
    recommendedAlbumYear: rec.recommendedAlbumYear || undefined,
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
      albumImageUrl: album.albumImageUrl || undefined,
      albumYear: album.albumYear || undefined,
      addedAt: album.addedAt.toISOString(),
      addedBy: collection.userId,
      personalRating: album.personalRating || undefined,
      personalNotes: album.personalNotes || undefined,
      position: album.position,
    }))
  );
}

interface ProfilePageProps {
  params: {
    userId: string;
  };
}

export default async function UserProfilePage({ params }: ProfilePageProps) {
  const session = await auth();
  const { userId } = params;

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
    name: userData.name || 'User',
    email: userData.email || null,
    image: userData.image || '/placeholder.svg?height=100&width=100',
    username: userData.email ? `@${userData.email.split('@')[0]}` : '@user',
    bio: 'Music enthusiast | Sharing vibes and discovering new sounds',
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
