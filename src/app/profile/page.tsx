import { redirect } from 'next/navigation';

import { auth } from '@/../auth';
import prisma from '@/lib/prisma';
import { CollectionAlbum } from '@/types/collection';
import { Recommendation } from '@/types/recommendation';

import Profile from './profile';

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

  // Transform Prisma data to match CollectionAlbum type
  return collections.flatMap(collection =>
    collection.albums.map(album => ({
      id: album.id,
      albumId: album.albumDiscogsId,
      album: {
        id: album.albumDiscogsId,
        title: album.albumTitle,
        artist: album.albumArtist,
        releaseDate: album.albumYear || undefined,
        genre: [],
        image: {
          url: album.albumImageUrl || '/placeholder.svg?height=400&width=400',
          width: 400,
          height: 400,
          alt: `${album.albumTitle} cover`,
        },
      },
      addedAt: album.addedAt.toISOString(),
      addedBy: collection.userId,
      personalRating: album.personalRating || undefined,
      personalNotes: album.personalNotes || undefined,
      position: album.position,
    }))
  );
}

export default async function ProfilePage() {
  const session = await auth();
  const userData = session?.user;

  if (!userData || !userData.id) {
    redirect('/');
  }

  const [collection, recommendations] = await Promise.all([
    getUserCollections(userData.id),
    getUserRecommendations(userData.id),
  ]);

  // Minimal user object
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
    />
  );
}
