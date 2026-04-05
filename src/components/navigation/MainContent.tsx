'use client';

import React, { FC, ReactNode } from 'react';

import { useSidebar } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';

interface MainContentProps {
  children: ReactNode;
}

export const MainContent: FC<MainContentProps> = ({ children }) => {
  const { isExpanded } = useSidebar();

  return (
    <div
      className={cn(
        'transition-all duration-300',
        isExpanded ? 'md:ml-64' : 'md:ml-16'
      )}
      id='main-content'
      role='main'
    >
      <div className='pt-4'>{children}</div>
    </div>
  );
};

export default MainContent;
