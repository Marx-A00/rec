'use client';

import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { useUsers } from '@/hooks/useUsers';
import type { Recommendation } from '@/types';

async function getRecommendations(): Promise<Recommendation[]> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/recommendations`,
      {
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch recommendations');
    }

    const data = await response.json();
    return data.recommendations || [];
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return [];
  }
}

export default function BrowsePage() {
  const {
    data: users = [],
    isLoading: usersLoading,
    error: usersError,
  } = useUsers();
  // TODO: Convert recommendations to useQuery hook as well
  const [recommendations, setRecommendations] = React.useState<
    Recommendation[]
  >([]);

  React.useEffect(() => {
    getRecommendations().then(setRecommendations);
  }, []);

  if (usersLoading) {
    return (
      <div className='min-h-screen bg-black text-white flex items-center justify-center'>
        <div className='text-cosmic-latte'>Loading users...</div>
      </div>
    );
  }

  if (usersError) {
    return (
      <div className='min-h-screen bg-black text-white flex items-center justify-center'>
        <div className='text-red-400'>
          Error loading users: {usersError.message}
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-black text-white'>
      <div className='container mx-auto px-4 py-8'>
        {/* Header */}
        <div className='mb-8'>
          <Link
            href='/'
            className='inline-flex items-center text-cosmic-latte hover:text-emeraled-green transition-colors mb-4'
          >
            ← Back to Home
          </Link>
          <h1 className='text-4xl font-bold text-cosmic-latte mb-2'>Browse</h1>
          <p className='text-zinc-400'>
            Discover users and their music recommendations
          </p>
        </div>

        {/* Users Section */}
        <section className='mb-12'>
          <h2 className='text-2xl font-semibold text-cosmic-latte mb-6 border-b border-zinc-800 pb-2'>
            Music Enthusiasts
          </h2>
          <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6'>
            {users.map(user => (
              <HoverCard key={user.id}>
                <HoverCardTrigger asChild>
                  <Link href={`/profile/${user.id}`}>
                    <div className='bg-zinc-900 rounded-lg p-4 hover:bg-zinc-800 transition-colors cursor-pointer border border-zinc-800'>
                      <div className='flex flex-col items-center text-center'>
                        <Avatar className='h-16 w-16 mb-3'>
                          <AvatarImage
                            src={user.image || undefined}
                            alt={user.name || 'User'}
                          />
                          <AvatarFallback className='bg-zinc-700 text-zinc-200'>
                            {user.name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <h3 className='font-medium text-white mb-1'>
                          {user.name || 'Anonymous User'}
                        </h3>
                        <p className='text-sm text-zinc-400'>
                          {user.email || 'No email'}
                        </p>
                      </div>
                    </div>
                  </Link>
                </HoverCardTrigger>
                <HoverCardContent className='w-64 bg-zinc-900 border-zinc-800 text-white'>
                  <div className='flex space-x-3'>
                    <Avatar className='h-12 w-12'>
                      <AvatarImage
                        src={user.image || undefined}
                        alt={user.name || 'User'}
                      />
                      <AvatarFallback className='bg-zinc-700 text-zinc-200'>
                        {user.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className='space-y-1'>
                      <h4 className='text-sm font-semibold text-zinc-100'>
                        {user.name || 'Anonymous User'}
                      </h4>
                      <p className='text-sm text-zinc-300'>
                        {user.email || 'No email'}
                      </p>
                      <div className='flex items-center pt-1'>
                        <span className='text-xs text-zinc-400'>
                          Music enthusiast
                        </span>
                      </div>
                      <div className='mt-2'>
                        <Link
                          href={`/profile/${user.id}`}
                          className='text-xs text-blue-400 hover:text-blue-300 hover:underline inline-block'
                        >
                          View Profile
                        </Link>
                      </div>
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            ))}
          </div>
        </section>

        {/* Recommendations Section */}
        <section>
          <h2 className='text-2xl font-semibold text-cosmic-latte mb-6 border-b border-zinc-800 pb-2'>
            Latest Recommendations
          </h2>
          {recommendations.length > 0 ? (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
              {recommendations.map(recommendation => (
                <div
                  key={recommendation.id}
                  className='bg-zinc-900 rounded-lg p-6 border border-zinc-800 hover:border-zinc-700 transition-colors'
                >
                  {/* User info */}
                  {recommendation.user && (
                    <div className='flex items-center mb-4'>
                      <Avatar className='h-8 w-8 mr-3'>
                        <AvatarImage
                          src={recommendation.user.image || undefined}
                          alt={recommendation.user.name || 'User'}
                        />
                        <AvatarFallback className='bg-zinc-700 text-zinc-200 text-xs'>
                          {recommendation.user.name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className='text-sm font-medium text-white'>
                          {recommendation.user.name || 'Anonymous User'}
                        </p>
                        <p className='text-xs text-zinc-400'>recommended</p>
                      </div>
                    </div>
                  )}

                  {/* Albums */}
                  <div className='space-y-4'>
                    <div className='flex items-center space-x-3'>
                      <Image
                        src={
                          recommendation.basisAlbumImageUrl ||
                          'https://via.placeholder.com/48x48?text=No+Image'
                        }
                        alt={recommendation.basisAlbumTitle}
                        width={48}
                        height={48}
                        className='w-12 h-12 rounded object-cover'
                      />
                      <div className='flex-1 min-w-0'>
                        <p className='text-sm font-medium text-white truncate'>
                          {recommendation.basisAlbumTitle}
                        </p>
                        <p className='text-xs text-zinc-400 truncate'>
                          by {recommendation.basisAlbumArtist}
                        </p>
                      </div>
                    </div>

                    <div className='flex items-center justify-center'>
                      <div className='text-emeraled-green text-sm font-medium'>
                        ↓ If you like this, try ↓
                      </div>
                    </div>

                    <div className='flex items-center space-x-3'>
                      <Image
                        src={
                          recommendation.recommendedAlbumImageUrl ||
                          'https://via.placeholder.com/48x48?text=No+Image'
                        }
                        alt={recommendation.recommendedAlbumTitle}
                        width={48}
                        height={48}
                        className='w-12 h-12 rounded object-cover'
                      />
                      <div className='flex-1 min-w-0'>
                        <p className='text-sm font-medium text-white truncate'>
                          {recommendation.recommendedAlbumTitle}
                        </p>
                        <p className='text-xs text-zinc-400 truncate'>
                          by {recommendation.recommendedAlbumArtist}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Score */}
                  <div className='mt-4 pt-4 border-t border-zinc-800'>
                    <div className='flex items-center justify-between'>
                      <span className='text-xs text-zinc-400'>
                        Similarity Score
                      </span>
                      <div className='flex items-center space-x-1'>
                        <div className='w-16 h-2 bg-zinc-700 rounded-full overflow-hidden'>
                          <div
                            className='h-full bg-emeraled-green rounded-full'
                            style={{
                              width: `${(recommendation.score / 10) * 100}%`,
                            }}
                          />
                        </div>
                        <span className='text-xs text-emeraled-green font-medium'>
                          {recommendation.score}/10
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className='text-center py-12'>
              <p className='text-zinc-400 mb-4'>
                No recommendations available yet.
              </p>
              <Link
                href='/recommend'
                className='inline-block bg-cosmic-latte hover:bg-emeraled-green text-black font-medium py-2 px-4 rounded-full transition-colors'
              >
                Create the first recommendation
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
