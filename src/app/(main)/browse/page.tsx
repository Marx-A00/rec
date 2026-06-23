import { Suspense } from 'react';
import { TrendingUp } from 'lucide-react';

import {
  TopRecommendedAlbums,
  TopRecommendedArtists,
  ContentRow,
  LoadingCards,
  LatestReleasesSection,
  PersonalizedSimilarArtists,
  RecentRecommendations,
  TasteMatchedUsers,
} from '@/components/browse';

// Force dynamic rendering - don't prerender at build time
export const dynamic = 'force-dynamic';

export default async function BrowsePage() {
  return (
    <div className='py-8'>
      {/* Page Header */}
      <div className='px-4 md:px-8 lg:px-12 mb-16'>
        <div id='browse-page-header' data-tour-step='browse-header'>
          <h1 className='text-4xl font-bold text-white mb-4'>
            Discover Music & Community
          </h1>
          <p className='text-zinc-400 text-lg max-w-3xl leading-relaxed'>
            Explore new music, connect with fellow music lovers, and discover
            your next favorite album
          </p>
        </div>
      </div>

      {/* Content Sections */}
      <div className='space-y-14'>
        {/* Personalized sections — each handles own conditional rendering */}
        <div className='px-4 md:px-8 lg:px-12'>
          <PersonalizedSimilarArtists />
        </div>

        <div className='px-4 md:px-8 lg:px-12'>
          <RecentRecommendations />
        </div>

        <div className='px-4 md:px-8 lg:px-12'>
          <TasteMatchedUsers />
        </div>

        {/* Latest Releases — always shown, has its own header */}
        <div className='px-4 md:px-8 lg:px-12'>
          <Suspense fallback={<LoadingCards count={8} />}>
            <LatestReleasesSection />
          </Suspense>
        </div>

        {/* Fallback sections — visible for everyone, personalized sections return null when not applicable */}
        <ContentRow
          title='Top Recommended Artists'
          subtitle='Artists with the most album recommendations'
          icon={<TrendingUp className='w-5 h-5' />}
        >
          <TopRecommendedArtists limit={12} />
        </ContentRow>

        <ContentRow
          title='Most Recommended Albums'
          subtitle='Albums the community loves recommending'
          icon={<TrendingUp className='w-5 h-5' />}
        >
          <TopRecommendedAlbums limit={12} />
        </ContentRow>
      </div>
    </div>
  );
}
