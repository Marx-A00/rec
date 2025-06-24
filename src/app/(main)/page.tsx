import Link from 'next/link';
import { Suspense } from 'react';

import { auth } from '@/../auth';
import NavigationSidebar from '@/components/NavigationSidebar';
import SignInButton from '@/components/auth/SignInButton';
import SignOutButton from '@/components/auth/SignOutButton';
import RecommendationsList from '@/components/recommendations/RecommendationsList';
import SocialActivityFeed from '@/components/feed/SocialActivityFeed';
import AlbumSearch from '@/components/ui/AlbumSearch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';

export default async function Home() {
  const session = await auth();
  const user = session?.user;

  return (
    <div className='flex flex-col min-h-screen bg-black'>
      {/* Search Bar at the top */}
      <div className='w-full px-4 pt-6 pb-4 md:pl-20'>
        <div className='max-w-2xl mx-auto'>
          <AlbumSearch placeholder='Search for albums, artists, or genres...' />
        </div>
      </div>

      <div className='absolute top-4 left-4'>
        <HoverCard>
          <HoverCardTrigger asChild>
            <button className='rounded-full h-8 w-8 overflow-hidden'>
              <Avatar className='h-full w-full'>
                {user ? (
                  <AvatarImage
                    src={user.image || '/placeholder.svg?height=100&width=100'}
                    alt={user.name || 'User'}
                  />
                ) : (
                  <AvatarImage
                    src='/placeholder.svg?height=100&width=100'
                    alt='User'
                  />
                )}
                <AvatarFallback className='bg-zinc-800 text-zinc-200'>
                  {user ? user.name?.charAt(0) || 'U' : '?'}
                </AvatarFallback>
              </Avatar>
            </button>
          </HoverCardTrigger>
          <HoverCardContent
            className='w-64 bg-zinc-900 border-zinc-800 text-white'
            side='right'
            align='start'
            sideOffset={12}
          >
            {user ? (
              <div className='flex flex-col space-y-3'>
                <div className='flex space-x-3'>
                  <Avatar className='h-8 w-8'>
                    <AvatarImage
                      src={
                        user.image || '/placeholder.svg?height=100&width=100'
                      }
                      alt={user.name || 'User'}
                    />
                    <AvatarFallback className='bg-zinc-800 text-zinc-200'>
                      {user.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className='space-y-1'>
                    <h4 className='text-xs font-semibold text-zinc-100'>
                      {user.name || 'Authenticated User'}
                    </h4>
                    <p className='text-xs text-zinc-300'>{user.email}</p>
                    <div className='flex items-center pt-1'>
                      <span className='text-xs text-zinc-400'>
                        Signed in with Google
                      </span>
                    </div>
                    <div className='mt-2'>
                      <Link
                        href='/profile'
                        className='text-xs text-blue-400 hover:text-blue-300 hover:underline inline-block'
                      >
                        View Profile
                      </Link>
                    </div>
                  </div>
                </div>

                <div className='pt-2 border-t border-zinc-800'>
                  <SignOutButton />
                </div>
              </div>
            ) : (
              <div className='py-2'>
                <h4 className='text-xs font-semibold text-zinc-100 mb-3 text-center'>
                  Sign in to access your account
                </h4>
                <SignInButton />
              </div>
            )}
          </HoverCardContent>
        </HoverCard>
      </div>

      {/* Navigation Sidebar */}
      <NavigationSidebar />

      {/* Main Content Section */}
      <div className='flex-1 px-4 pb-8 md:pl-20'>
        <div className='max-w-6xl mx-auto'>
          {user ? (
            // Authenticated user sees social feed directly without tabs
            <Suspense
              fallback={
                <div className='text-center py-8 text-zinc-400'>
                  Loading feed...
                </div>
              }
            >
              <SocialActivityFeed className='max-w-4xl mx-auto' />
            </Suspense>
          ) : (
            // Non-authenticated user sees recommendations only
            <>
              <div className='mb-6'>
                <h2 className='text-2xl font-semibold text-cosmic-latte border-b border-zinc-800 pb-2 mb-6'>
                  Latest Recommendations
                </h2>
                <p className='text-zinc-400 mb-4'>
                  Discover the latest music recommendations from our community.{' '}
                  <Link
                    href='/signin'
                    className='text-emeraled-green hover:underline'
                  >
                    Sign in
                  </Link>{' '}
                  to see personalized content and social activities.
                </p>
              </div>
              <RecommendationsList />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
