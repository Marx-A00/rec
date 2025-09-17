'use client';

import React, { FC } from 'react';
import { useHeader } from '@/contexts/HeaderContext';
import UserAvatar from './UserAvatar';
import UniversalSearchBar from '@/components/ui/UniversalSearchBar';
import { cn } from '@/lib/utils';

interface TopBarProps {
  className?: string;
  showSearch?: boolean;
  showAvatar?: boolean;
}

export const TopBar: FC<TopBarProps> = ({
  className,
  showSearch = true,
  showAvatar = true
}) => {
  const { state } = useHeader();
  const { leftContent, centerContent, rightContent, isVisible } = state;

  if (!isVisible) {
    return null;
  }

  return (
    <header className={cn(
      'sticky top-0 z-50 backdrop-blur-sm bg-black/80 border-b border-zinc-800/50',
      className
    )}>
      <div className="flex items-center h-16 px-4">
        {/* Left Section - Avatar/Logo */}
        <div className="flex items-center flex-shrink-0 w-48">
          {leftContent || (showAvatar && <UserAvatar />)}
        </div>

        {/* Center Section - Search/Title */}
        <div className="flex-1 flex justify-center px-4">
          {centerContent || (showSearch && <UniversalSearchBar />)}
        </div>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-2 flex-shrink-0 w-48 justify-end">
          {rightContent}
        </div>
      </div>
    </header>
  );
};

export default TopBar;