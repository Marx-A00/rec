'use client';

import React, { FC } from 'react';
import { Menu, X } from 'lucide-react';

import { useHeader } from '@/contexts/HeaderContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { useIsHomePage } from '@/hooks/useIsHomePage';
import SimpleSearchBar from '@/components/ui/SimpleSearchBar';
import { cn } from '@/lib/utils';

import UserAvatar from './UserAvatar';

interface TopBarProps {
  className?: string;
  showSearch?: boolean;
  showAvatar?: boolean;
}

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
  const { isExpanded, toggleSidebar } = useSidebar();
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
          {/* Left Section - Hamburger + Avatar */}
          <div className='flex items-center flex-shrink-0 w-48'>
            <button
              onClick={toggleSidebar}
              className='p-2 mr-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors'
              aria-label={isExpanded ? 'Close sidebar' : 'Open sidebar'}
              aria-expanded={isExpanded}
            >
              {isExpanded ? (
                <X className='h-5 w-5' />
              ) : (
                <Menu className='h-5 w-5' />
              )}
            </button>
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
          </div>
        </div>
      </header>
    </>
  );
};

export default TopBar;
