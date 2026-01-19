import { notFound } from 'next/navigation';
import { Lock } from 'lucide-react';

import { auth } from '@/../auth';
import prisma from '@/lib/prisma';
import { userProfileParamsSchema } from '@/lib/validations/params';

import MobileProfileClient from './MobileProfileClient';

// Helper function to get user recommendations
async function getUserRecommendations(userId: string) {
  const recs = await prisma.recommendation.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, username: true, image: true } },
      basisAlbum: {
        select: {
          id: true,
          title: true,
          coverArtUrl: true,
          cloudflareImageId: true,
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
          cloudflareImageId: true,
          artists: {
            select: {
              artist: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  return recs.map(rec => ({
    id: rec.id,
    score: rec.score,
    createdAt: rec.createdAt,
    basisAlbum: {
      id: rec.basisAlbum.id,
      title: rec.basisAlbum.title,
      coverArtUrl: rec.basisAlbum.coverArtUrl,
      cloudflareImageId: rec.basisAlbum.cloudflareImageId,
      artists: rec.basisAlbum.artists.map(ac => ({
        artist: { id: ac.artist.id, name: ac.artist.name },
      })),
    },
    recommendedAlbum: {
      id: rec.recommendedAlbum.id,
      title: rec.recommendedAlbum.title,
      coverArtUrl: rec.recommendedAlbum.coverArtUrl,
      cloudflareImageId: rec.recommendedAlbum.cloudflareImageId,
      artists: rec.recommendedAlbum.artists.map(ac => ({
        artist: { id: ac.artist.id, name: ac.artist.name },
      })),
    },
  }));
}

// Helper function to get user collections (excluding Listen Later)
async function getUserCollections(userId: string) {
  const collections = await prisma.collection.findMany({
    where: {
      userId,
      name: { not: 'Listen Later' },
    },
    include: {
      albums: {
        orderBy: { addedAt: 'desc' },
        include: {
          album: {
            select: {
              id: true,
              title: true,
              coverArtUrl: true,
              cloudflareImageId: true,
            },
          },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // Flatten all albums from all collections
  return collections.flatMap(collection =>
    collection.albums.map(albumEntry => ({
      id: albumEntry.id,
      album: {
        id: albumEntry.album.id,
        title: albumEntry.album.title,
        coverArtUrl: albumEntry.album.coverArtUrl,
        cloudflareImageId: albumEntry.album.cloudflareImageId,
      },
    }))
  );
}

interface ProfilePageProps {
  params: Promise<{ userId: string }>;
}

export default async function MobileProfilePage({ params }: ProfilePageProps) {
  const session = await auth();
  const rawParams = await params;

  // Validate parameters
  const paramsResult = userProfileParamsSchema.safeParse(rawParams);
  if (!paramsResult.success) {
    console.error('Invalid user profile parameters:', paramsResult.error);
    notFound();
  }

  const { userId } = paramsResult.data;
  const isOwnProfile = session?.user?.id === userId;

  // Fetch user data
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

  // Check if profile is private
  if (!isOwnProfile && userData.settings?.profileVisibility === 'private') {
    return (
      <div className='min-h-screen bg-black'>
        <div className='flex flex-col items-center justify-center min-h-[60vh] px-6 text-center'>
          <div className='w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4'>
            <Lock className='h-8 w-8 text-zinc-500' />
          </div>
          <h2 className='text-xl font-bold text-white mb-2'>
            This Profile is Private
          </h2>
          <p className='text-zinc-400 max-w-xs'>
            {userData.username || 'This user'} has chosen to keep their profile
            private.
          </p>
        </div>
      </div>
    );
  }

  // Check if current user is following this profile
  const isFollowingUser =
    !isOwnProfile && session?.user?.id
      ? !!(await prisma.userFollow.findUnique({
          where: {
            followerId_followedId: {
              followerId: session.user.id,
              followedId: userId,
            },
          },
        }))
      : false;

  // Fetch recommendations and collections in parallel
  const [recommendations, collections] = await Promise.all([
    getUserRecommendations(userId),
    getUserCollections(userId),
  ]);

  // Create user object for client component
  const user = {
    id: userData.id,
    username: userData.username,
    email: userData.email,
    image: userData.image,
    bio: userData.bio,
    followersCount: userData._count.followers,
    followingCount: userData._count.following,
    recommendationsCount: userData._count.recommendations,
  };

  return (
    <MobileProfileClient
      user={user}
      recommendations={recommendations}
      collections={collections}
      isOwnProfile={isOwnProfile}
      isFollowingUser={isFollowingUser}
    />
  );
}
