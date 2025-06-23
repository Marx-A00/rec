'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

import AlbumImage from '@/components/ui/AlbumImage';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import FeedTabs from '@/components/feed/FeedTabs';
import DiscoveryTabs from '@/components/discovery/DiscoveryTabs';
import { useRecommendationsQuery } from '@/hooks/useRecommendationsQuery';
import type { Recommendation } from '@/types';

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  bio: string | null;
  followersCount: number;
  followingCount: number;
  recommendationsCount: number;
}

interface BrowsePageClientProps {
  initialUsers: User[];
  initialRecommendations: Recommendation[];
}

export default function BrowsePageClient({
  initialUsers,
  initialRecommendations,
}: BrowsePageClientProps) {
  const { data: session } = useSession();
  const [feedTab, setFeedTab] = useState<'all' | 'following'>('all');

  // Use the existing recommendations query hook for the "following" tab
  const { data: followingRecommendationsData, isLoading: isLoadingFollowing } =
    useRecommendationsQuery({
      enabled: feedTab === 'following',
    });

  const displayedRecommendations =
    feedTab === 'following'
      ? followingRecommendationsData?.recommendations || []
      : initialRecommendations;

  return (
    <div className='space-y-8'>
      {/* Discovery Content */}
      <DiscoveryTabs
        initialUsers={initialUsers}
        currentUserId={session?.user?.id}
        className='mb-12'
      />

      {/* Recommendations Section with Tabs */}
      <section>
        <div className='flex items-center justify-between mb-6'>
          <h2 className='text-2xl font-semibold text-cosmic-latte border-b border-zinc-800 pb-2'>
            Latest Recommendations
          </h2>
          {session && (
            <FeedTabs
              activeTab={feedTab}
              onTabChange={setFeedTab}
              className='ml-4'
            />
          )}
        </div>

        {isLoadingFollowing && feedTab === 'following' ? (
          <div className='text-center py-8'>
            <div className='flex items-center justify-center gap-2'>
              <div className='w-4 h-4 border-2 border-emeraled-green border-t-transparent rounded-full animate-spin' />
              <span className='text-zinc-400'>
                Loading recommendations from people you follow...
              </span>
            </div>
          </div>
        ) : (
          <RecommendationsSection recommendations={displayedRecommendations} />
        )}
      </section>
    </div>
  );
}

function RecommendationsSection({
  recommendations,
}: {
  recommendations: Recommendation[];
}) {
  if (recommendations.length === 0) {
    return (
      <div className='text-center py-8'>
        <div className='bg-zinc-900 rounded-lg p-8 border border-zinc-800'>
          <div className='text-6xl mb-4'>🎵</div>
          <h3 className='text-xl font-semibold text-cosmic-latte mb-2'>
            No Recommendations Yet
          </h3>
          <p className='text-zinc-400'>
            Be the first to share your music discoveries!
          </p>
        </div>
      </div>
    );
  }

  return (
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
              <AlbumImage
                src={recommendation.basisAlbumImageUrl}
                alt={`${recommendation.basisAlbumTitle} by ${recommendation.basisAlbumArtist}`}
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
              <AlbumImage
                src={recommendation.recommendedAlbumImageUrl}
                alt={`${recommendation.recommendedAlbumTitle} by ${recommendation.recommendedAlbumArtist}`}
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
              <span className='text-xs text-zinc-400'>Similarity Score</span>
              <div className='flex items-center space-x-1'>
                <div className='w-16 h-2 bg-zinc-700 rounded-full overflow-hidden'>
                  <div
                    className='h-full bg-emeraled-green transition-all duration-300'
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
  );
}
