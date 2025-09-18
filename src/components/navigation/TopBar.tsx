'use client';

import React, { FC } from 'react';
import { useHeader } from '@/contexts/HeaderContext';
import { useIsHomePage } from '@/hooks/useIsHomePage';
import UserAvatar from './UserAvatar';
import UniversalSearchBar from '@/components/ui/UniversalSearchBar';
import { cn } from '@/lib/utils';

interface TopBarProps {
  className?: string;
  showSearch?: boolean;
  showAvatar?: boolean;
}

// Separate component for mosaic controls that uses MosaicContext
const MosaicControls: FC = () => {
  const { useMosaic } = require('@/contexts/MosaicContext');
  const MosaicHeaderControls = require('@/components/dashboard/MosaicHeaderControls').default;
  const WidgetLibrary = require('@/components/dashboard/WidgetLibrary').default;
  const { createPortal } = require('react-dom');

  const [showWidgetLibrary, setShowWidgetLibrary] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);
  const { state: mosaicState, actions: mosaicActions } = useMosaic();

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <>
      <MosaicHeaderControls
        isEditMode={mosaicState.isEditMode}
        onToggleEditMode={mosaicActions.toggleEditMode}
        onShowWidgetLibrary={() => setShowWidgetLibrary(true)}
      />

      {isMounted && showWidgetLibrary && createPortal(
        <WidgetLibrary
          isOpen={showWidgetLibrary}
          onClose={() => setShowWidgetLibrary(false)}
        />,
        document.body
      )}
    </>
  );
};

export const TopBar: FC<TopBarProps> = ({
  className,
  showSearch = true,
  showAvatar = true
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
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[60] focus:bg-emeraled-green focus:text-black focus:px-4 focus:py-2 focus:rounded-md focus:outline-none"
    >
      Skip to main content
    </a>

    <header
      className={cn(
        'sticky top-0 z-50 backdrop-blur-sm bg-black/80 border-b border-zinc-800/50',
        className
      )}
      role="banner"
    >
      <div className="flex items-center h-16 px-4">
        {/* Left Section - Avatar/Logo */}
        <div className="flex items-center flex-shrink-0 w-48">
          {leftContent || (showAvatar && <UserAvatar />)}
        </div>

        {/* Center Section - Search/Title */}
        <div className="flex-1 flex justify-center px-4">
          {centerContent || (showSearch && (
            <div className="w-full max-w-2xl">
              <UniversalSearchBar className="w-full" />
            </div>
          ))}
        </div>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-2 flex-shrink-0 w-48 justify-end">
          {isHomePage ? <MosaicControls /> : rightContent}
        </div>
      </div>
    </header>
  </>
  );
};

export default TopBar;