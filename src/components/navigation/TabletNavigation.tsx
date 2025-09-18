'use client';

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TabletNavigationProps {
  children: React.ReactNode;
  className?: string;
}

export default function TabletNavigation({
  children,
  className
}: TabletNavigationProps) {
  const [sidebarVisible, setSidebarVisible] = useState(false);

  return (
    <div className={cn('flex h-screen overflow-hidden', className)}>
      {/* Collapsible Sidebar with Overlay */}
      {sidebarVisible && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarVisible(false)}
        />
      )}

      <div className={cn(
        'fixed left-0 top-0 z-50 h-full transition-transform duration-300',
        sidebarVisible ? 'translate-x-0' : '-translate-x-full'
      )}>
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Condensed Top Bar */}
        <TopBar
          showSearch={true}
          showAvatar={false}
          className="relative"
        />

        {/* Hamburger Menu Button */}
        <button
          onClick={() => setSidebarVisible(!sidebarVisible)}
          className="fixed top-4 left-4 z-30 p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors"
        >
          <Menu className="h-5 w-5 text-white" />
        </button>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-zinc-950 pt-2">
          {children}
        </main>
      </div>
    </div>
  );
}