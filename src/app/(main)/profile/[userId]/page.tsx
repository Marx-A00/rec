import { notFound } from 'next/navigation';
import { Lock } from 'lucide-react';

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

// Helper function to get user collections (excluding Listen Later)
async function getUserCollections(userId: string): Promise<CollectionAlbum[]> {
  const collections = await prisma.collection.findMany({
    where: {
      userId,
      name: { not: 'Listen Later' }, // Exclude Listen Later
    },
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
        albumArtistId: album.album.artists[0]?.artist.id ?? undefined, // Add first artist ID
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

// Helper function to get Listen Later collection
async function getListenLater(userId: string): Promise<CollectionAlbum[]> {
  const listenLater = await prisma.collection.findFirst({
    where: {
      userId,
      name: 'Listen Later',
    },
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
  });

  if (!listenLater) return [];

  return listenLater.albums
    .filter(album => album.album) // Filter out albums that couldn't be loaded
    .map(
      (album): CollectionAlbum => ({
        id: album.id,
        albumId: String(album.albumId ?? album.discogsId ?? ''),
        albumTitle: album.album.title || 'Loading...', // Handle empty titles from newly created albums
        albumArtist:
          album.album.artists.length > 0
            ? album.album.artists.map(a => a.artist.name).join(', ')
            : 'Unknown Artist', // Handle albums without artists yet
        albumArtistId: album.album.artists[0]?.artist.id ?? undefined, // Add first artist ID
        albumImageUrl: album.album.coverArtUrl ?? null,
        albumYear: album.album.releaseDate
          ? String(new Date(album.album.releaseDate).getFullYear())
          : null,
        addedAt: album.addedAt.toISOString(),
        addedBy: listenLater.userId,
        personalRating: album.personalRating ?? null,
        personalNotes: album.personalNotes ?? null,
        position: album.position,
      })
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

  // Fetch user data from database with calculated counts and settings
  const userData = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      settings: true,
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

  // Check if profile is private (only block for non-owners)
  if (!isOwnProfile && userData.settings?.profileVisibility === 'private') {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] text-center px-4'>
        <div className='bg-zinc-900/60 border border-zinc-800 rounded-2xl p-8 max-w-md'>
          <div className='w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4'>
            <Lock className='w-8 h-8 text-zinc-500' />
          </div>
          <h2 className='text-2xl font-bold text-white mb-2'>
            This Profile is Private
          </h2>
          <p className='text-zinc-400'>
            {userData.name || 'This user'} has chosen to keep their profile
            private.
          </p>
        </div>
      </div>
    );
  }

  // Determine if collections should be shown
  const showCollections =
    isOwnProfile || userData.settings?.showCollections !== false;

  // Get collections, listen later, and recommendations
  const [collection, listenLater, recommendations] = await Promise.all([
    showCollections ? getUserCollections(userId) : Promise.resolve([]),
    showCollections ? getListenLater(userId) : Promise.resolve([]),
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
      listenLater={listenLater}
      recommendations={recommendations}
      isOwnProfile={isOwnProfile}
      showCollections={showCollections}
    />
  );
}
