'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

import SignInButton from '@/components/auth/SignInButton';
import SignOutButton from '@/components/auth/SignOutButton';
import RecommendationsList from '@/components/recommendations/RecommendationsList';
import RecommendationDrawer from '@/components/recommendations/RecommendationDrawer';
import SocialActivityFeed from '@/components/feed/SocialActivityFeed';
import { useRecommendationDrawer } from '@/hooks';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';

export default function Home() {
  const { data: session } = useSession();
  const user = session?.user;
  const { isOpen, openDrawer, closeDrawer, handleSuccess } =
    useRecommendationDrawer();

  // Listen for custom event from navigation sidebar
  useEffect(() => {
    const handleOpenDrawer = () => {
      openDrawer();
    };

    window.addEventListener('open-recommendation-drawer', handleOpenDrawer);

    return () => {
      window.removeEventListener(
        'open-recommendation-drawer',
        handleOpenDrawer
      );
    };
  }, [openDrawer]);

  return (
    <div className='h-[calc(100vh-8rem)] overflow-hidden ml-6'>
      <ResizablePanelGroup direction='vertical' className='h-full'>
        {/* Top section - Welcome */}
        <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
          <div className='bg-zinc-900/50 rounded-lg p-6 border border-zinc-800 h-full overflow-hidden'>
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
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Bottom section - Main content with horizontal split */}
        <ResizablePanel defaultSize={75} minSize={60}>
          <div className='h-full pt-4'>
            <ResizablePanelGroup direction='horizontal' className='h-full'>
              {/* Recommendations panel */}
              <ResizablePanel defaultSize={70} minSize={50}>
                <div className='bg-zinc-900/50 rounded-lg p-6 border border-zinc-800 h-full flex flex-col overflow-hidden'>
                  <div className='flex justify-between items-center mb-6 flex-shrink-0'>
                    <h2 className='text-2xl font-semibold text-white'>
                      Recent Recommendations
                    </h2>
                    <button
                      onClick={openDrawer}
                      className='px-4 py-2 bg-cosmic-latte text-black rounded-lg hover:bg-cosmic-latte/90 transition-colors'
                    >
                      Create Recommendation
                    </button>
                  </div>
                  <div className='flex-1 overflow-y-auto overflow-x-hidden'>
                    <Suspense
                      fallback={
                        <div className='text-zinc-400'>
                          Loading recommendations...
                        </div>
                      }
                    >
                      <RecommendationsList />
                    </Suspense>
                  </div>
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Activity sidebar */}
              <ResizablePanel defaultSize={30} minSize={25} maxSize={50}>
                <div className='bg-zinc-900/50 rounded-lg p-6 border border-zinc-800 h-full flex flex-col overflow-hidden'>
                  <h3 className='text-xl font-semibold text-white mb-4 flex-shrink-0'>
                    Recent Activity
                  </h3>
                  <div className='flex-1 overflow-y-auto overflow-x-hidden'>
                    <Suspense
                      fallback={
                        <div className='text-zinc-400'>Loading activity...</div>
                      }
                    >
                      <SocialActivityFeed />
                    </Suspense>
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Recommendation Drawer */}
      <RecommendationDrawer
        isOpen={isOpen}
        onClose={closeDrawer}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
