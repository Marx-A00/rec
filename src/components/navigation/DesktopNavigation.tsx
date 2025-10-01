'use client';

import React from 'react';

import { cn } from '@/lib/utils';

import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface DesktopNavigationProps {
  children: React.ReactNode;
  className?: string;
}

export default function DesktopNavigation({
  children,
  className,
}: DesktopNavigationProps) {
  return (
    <div className={cn('flex h-screen overflow-hidden', className)}>
      {/* Floating Sidebar */}
      <Sidebar className='relative' />

      {/* Main Content Area */}
      <div className='flex-1 flex flex-col overflow-hidden'>
        {/* Full Top Bar */}
        <TopBar showSearch={true} showAvatar={true} />

        {/* Page Content */}
        <main className='flex-1 overflow-y-auto bg-zinc-950'>{children}</main>
      </div>
    </div>
  );
}
