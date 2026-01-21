'use client';

import React, { FC } from 'react';
import { Play, X, Trash2 } from 'lucide-react';

import { useHeader } from '@/contexts/HeaderContext';
import { useIsHomePage } from '@/hooks/useIsHomePage';
import SimpleSearchBar from '@/components/ui/SimpleSearchBar';
import { cn } from '@/lib/utils';
import { useTour } from '@/contexts/TourContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import UserAvatar from './UserAvatar';

interface TopBarProps {
  className?: string;
  showSearch?: boolean;
  showAvatar?: boolean;
}

// Tour Debug Controls - Only shows in development
const TourDebugControls: FC = () => {
  const { startTour, stopTour, resetOnboarding, currentStep, isTourActive } =
    useTour();

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const handleCheckOnboardingStatus = async () => {
    try {
      const response = await fetch('/api/users/onboarding-status');
      const data = await response.json();

      if (response.ok) {
        // eslint-disable-next-line no-alert -- Dev-only debug control
        window.alert(
          `📊 Onboarding Status\n\n` +
            `Is New User: ${data.isNewUser ? 'Yes ✅' : 'No ❌'}\n` +
            `User ID: ${data.userId}\n` +
            `Profile Updated: ${data.profileUpdatedAt || 'Never'}\n` +
            `Created: ${data.createdAt}`
        );
      } else {
        // eslint-disable-next-line no-alert -- Dev-only debug control
        window.alert(`❌ Error: ${data.error || 'Failed to check status'}`);
      }
    } catch (error) {
      console.error('❌ Error checking status:', error);
      // eslint-disable-next-line no-alert -- Dev-only debug control
      window.alert('❌ Network error. Check console for details.');
    }
  };

  return (
    <TooltipProvider>
      <div className='flex items-center gap-2 border-l border-zinc-700 pl-2 ml-2'>
        {/* Tour Step Indicator */}
        {isTourActive && currentStep !== null && (
          <span className='text-xs text-emerald-400 font-medium px-2 py-1 bg-emerald-500/10 rounded'>
            Step {currentStep + 1}
          </span>
        )}

        {/* Start Tour Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={startTour}
              disabled={isTourActive}
              className='p-2 text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <Play className='w-4 h-4' />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Start Tour</p>
          </TooltipContent>
        </Tooltip>

        {/* Stop Tour Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={stopTour}
              disabled={!isTourActive}
              className='p-2 text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <X className='w-4 h-4' />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Stop Tour</p>
          </TooltipContent>
        </Tooltip>

        {/* Check Status Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleCheckOnboardingStatus}
              className='p-2 text-zinc-400 hover:bg-zinc-700/50 rounded transition-colors'
            >
              📊
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Check Onboarding Status</p>
          </TooltipContent>
        </Tooltip>

        {/* Reset & Restart Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={resetOnboarding}
              className='p-2 text-orange-400 hover:bg-orange-500/10 rounded transition-colors'
            >
              <Trash2 className='w-4 h-4' />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Reset & Restart Tour</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};

// Separate component for mosaic controls that uses SplitMosaicContext
const MosaicControls: FC = () => {
  /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */
  const { useSplitMosaic } = require('@/contexts/SplitMosaicContext');
  const MosaicHeaderControls =
    require('@/components/dashboard/MosaicHeaderControls').default;
  const WidgetLibrary = require('@/components/dashboard/WidgetLibrary').default;
  const { createPortal } = require('react-dom');
  /* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */

  const [showWidgetLibrary, setShowWidgetLibrary] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);
  const { state: mosaicState, actions: mosaicActions } = useSplitMosaic();

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Feature flag check - don't render controls in production
  const isMosaicEditorEnabled =
    process.env.NEXT_PUBLIC_ENABLE_MOSAIC_EDITOR === 'true';

  if (!isMosaicEditorEnabled) {
    return null;
  }

  return (
    <>
      <MosaicHeaderControls
        isEditMode={mosaicState.isEditMode}
        onToggleEditMode={mosaicActions.toggleEditMode}
        onShowWidgetLibrary={() => setShowWidgetLibrary(true)}
      />

      {isMounted &&
        showWidgetLibrary &&
        createPortal(
          <WidgetLibrary
            isOpen={showWidgetLibrary}
            onClose={() => setShowWidgetLibrary(false)}
          />,
          document.body
        )}
    </>
  );
};

// Hook to safely get edit mode state from SplitMosaicContext
const useEditModeState = (isHomePage: boolean): boolean => {
  const [isEditMode, setIsEditMode] = React.useState(false);

  React.useEffect(() => {
    if (!isHomePage) {
      setIsEditMode(false);
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const { useSplitMosaicStore } = require('@/contexts/SplitMosaicContext');
      if (useSplitMosaicStore) {
        const unsubscribe = useSplitMosaicStore.subscribe(
          (state: { isEditMode: boolean }) => setIsEditMode(state.isEditMode)
        );
        return unsubscribe;
      }
    } catch {
      // Context not available, not in edit mode
    }
  }, [isHomePage]);

  return isEditMode;
};

export const TopBar: FC<TopBarProps> = ({
  className,
  showSearch = true,
  showAvatar = true,
}) => {
  const { state } = useHeader();
  const { leftContent, centerContent, rightContent, isVisible } = state;
  const isHomePage = useIsHomePage();

  // Get edit mode state without conditionally calling hooks
  const isEditMode = useEditModeState(isHomePage);

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

          {/* Center Section - Search/Title (hidden in edit mode) */}
          <div className='flex-1 flex justify-center px-4'>
            {centerContent ||
              (showSearch && !isEditMode && (
                <div className='w-full max-w-2xl'>
                  <SimpleSearchBar className='w-full' />
                </div>
              ))}
          </div>

          {/* Right Section - Actions */}
          <div className='flex items-center gap-2 flex-shrink-0 w-48 justify-end'>
            {isHomePage ? <MosaicControls /> : rightContent}
            <TourDebugControls />
          </div>
        </div>
      </header>
    </>
  );
};

export default TopBar;
