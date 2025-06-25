import Link from 'next/link';
import { Suspense } from 'react';

import { auth } from '@/../auth';
import SignInButton from '@/components/auth/SignInButton';
import SignOutButton from '@/components/auth/SignOutButton';
import RecommendationsList from '@/components/recommendations/RecommendationsList';
import SocialActivityFeed from '@/components/feed/SocialActivityFeed';
import AlbumSearch from '@/components/ui/AlbumSearch';

export default async function Home() {
  const session = await auth();
  const user = session?.user;

  return (
    <div className='flex flex-col min-h-screen bg-black'>
      {/* Search Bar at the top */}
      <div className='w-full p-4'>
        <AlbumSearch />
      </div>

      <div className='flex-1 flex gap-8 p-4'>
        {/* Left column - Main content */}
        <div className='flex-1 space-y-8'>
          {/* Welcome and auth section */}
          <div className='bg-zinc-900/50 rounded-lg p-6 border border-zinc-800'>
            <h1 className='text-3xl font-bold text-white mb-4'>
              Welcome to Album Recommendations
            </h1>
            <p className='text-zinc-300 mb-6'>
              Discover new music and share your favorite albums with the
              community.
            </p>
            <div className='flex gap-4'>
              {user ? (
                <div className='flex items-center gap-4'>
                  <span className='text-zinc-300'>
                    Welcome back, {user.name}!
                  </span>
                  <SignOutButton />
                </div>
              ) : (
                <SignInButton />
              )}
            </div>
          </div>

          {/* Recommendations Section */}
          <div className='bg-zinc-900/50 rounded-lg p-6 border border-zinc-800'>
            <div className='flex justify-between items-center mb-6'>
              <h2 className='text-2xl font-semibold text-white'>
                Recent Recommendations
              </h2>
              <Link
                href='/recommend'
                className='px-4 py-2 bg-cosmic-latte text-black rounded-lg hover:bg-cosmic-latte/90 transition-colors'
              >
                Create Recommendation
              </Link>
            </div>
            <Suspense
              fallback={
                <div className='text-zinc-400'>Loading recommendations...</div>
              }
            >
              <RecommendationsList />
            </Suspense>
          </div>
        </div>

        {/* Right column - Social Activity Feed */}
        <div className='w-80 hidden lg:block'>
          <div className='bg-zinc-900/50 rounded-lg p-6 border border-zinc-800 h-fit'>
            <h3 className='text-xl font-semibold text-white mb-4'>
              Recent Activity
            </h3>
            <Suspense
              fallback={
                <div className='text-zinc-400'>Loading activity...</div>
              }
            >
              <SocialActivityFeed />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
