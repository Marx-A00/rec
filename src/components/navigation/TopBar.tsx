'use client';

import React, { FC, Suspense } from 'react';

import { useHeader } from '@/contexts/HeaderContext';
import { useIsHomePage } from '@/hooks/useIsHomePage';
import UniversalSearchBar from '@/components/ui/UniversalSearchBar';
import { cn } from '@/lib/utils';

import UserAvatar from './UserAvatar';

interface TopBarProps {
  className?: string;
  showSearch?: boolean;
  showAvatar?: boolean;
}

// Lazy-load heavy dashboard bits to avoid ESM require usage
const LazyMosaicHeaderControls = React.lazy(
  () => import('@/components/dashboard/MosaicHeaderControls')
);
const LazyWidgetLibrary = React.lazy(
  () => import('@/components/dashboard/WidgetLibrary')
);

// Separate component for mosaic controls that uses SplitMosaicContext
const MosaicControls: FC = () => {
  const { useSplitMosaic } = require('@/contexts/SplitMosaicContext');
  const { createPortal } = require('react-dom');

  const [showWidgetLibrary, setShowWidgetLibrary] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);
  const { state: mosaicState, actions: mosaicActions } = useSplitMosaic();

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <LazyMosaicHeaderControls
          isEditMode={mosaicState.isEditMode}
          onToggleEditMode={mosaicActions.toggleEditMode}
          onShowWidgetLibrary={() => setShowWidgetLibrary(true)}
        />
      </Suspense>

      {isMounted &&
        showWidgetLibrary &&
        createPortal(
          <Suspense fallback={null}>
            <LazyWidgetLibrary
              isOpen={showWidgetLibrary}
              onClose={() => setShowWidgetLibrary(false)}
            />
          </Suspense>,
          document.body
        )}
    </>
  );
};

export const TopBar: FC<TopBarProps> = ({
  className,
  showSearch = true,
  showAvatar = true,
}) => {
  const { state } = useHeader();
  const { leftContent, centerContent, rightContent, isVisible } = state;
  const isHomePage = useIsHomePage();

  if (!isVisible) {
    return null;
  }

  return (
    <>
      {/* Skip to content link for keyboard navigation */}
      <a
        href='#main-content'
        className='sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[60] focus:bg-emeraled-green focus:text-black focus:px-4 focus:py-2 focus:rounded-md focus:outline-none'
      >
        Skip to main content
      </a>

      <header
        className={cn(
          'sticky top-0 z-50 backdrop-blur-sm bg-black/80 border-b border-zinc-800/50',
          className
        )}
        role='banner'
      >
        <div className='flex items-center h-16 px-4'>
          {/* Left Section - Avatar/Logo */}
          <div className='flex items-center flex-shrink-0 w-48'>
            {leftContent || (showAvatar && <UserAvatar />)}
          </div>

          {/* Center Section - Search/Title */}
          <div className='flex-1 flex justify-center px-4'>
            {centerContent ||
              (showSearch && (
                <div className='w-full max-w-2xl'>
                  <UniversalSearchBar className='w-full' />
                </div>
              ))}
          </div>

          {/* Right Section - Actions */}
          <div className='flex items-center gap-2 flex-shrink-0 w-48 justify-end'>
            {isHomePage ? <MosaicControls /> : rightContent}
          </div>
        </div>
      </header>
    </>
  );
};

export default TopBar;
