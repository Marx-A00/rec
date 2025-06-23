'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

import RecommendationsList from '@/components/recommendations/RecommendationsList';
import SocialActivityFeed from '@/components/feed/SocialActivityFeed';

export default function HomeFeedTabs() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'recommendations' | 'social'>(
    'social'
  );

  if (!session) {
    return null;
  }

  return (
    <div className='space-y-6'>
      {/* Tab Navigation */}
      <div className='flex space-x-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800'>
        <button
          onClick={() => setActiveTab('social')}
          className={`px-6 py-3 rounded-md text-sm font-medium transition-colors flex-1 ${
            activeTab === 'social'
              ? 'bg-emeraled-green text-black'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          Social Feed
        </button>
        <button
          onClick={() => setActiveTab('recommendations')}
          className={`px-6 py-3 rounded-md text-sm font-medium transition-colors flex-1 ${
            activeTab === 'recommendations'
              ? 'bg-emeraled-green text-black'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          All Recommendations
        </button>
      </div>

      {/* Tab Content */}
      <div className='min-h-[400px]'>
        {activeTab === 'social' ? (
          <div>
            <SocialActivityFeed className='max-w-4xl mx-auto' />
          </div>
        ) : (
          <div>
            <div className='mb-6'>
              <h2 className='text-2xl font-semibold text-cosmic-latte border-b border-zinc-800 pb-2 mb-4'>
                All Recommendations
              </h2>
              <p className='text-zinc-400'>
                Discover the latest music recommendations from the entire
                community.
              </p>
            </div>
            <RecommendationsList />
          </div>
        )}
      </div>
    </div>
  );
}
