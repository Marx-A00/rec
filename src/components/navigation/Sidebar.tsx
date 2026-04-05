'use client';

import React, { FC, useMemo, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';

import {
  NavItem,
  NavigationContext,
  filterNavigationItems,
  getDefaultNavItems,
  getSidebarUserItems,
} from '@/config/navigation';
import { useRecommendationDrawerContext } from '@/contexts/RecommendationDrawerContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import NavigationItem from './NavigationItem';
import HelpMenu from './HelpMenu';

interface SidebarProps {
  items?: NavItem[];
  position?: 'left' | 'right';
  variant?: 'floating' | 'docked';
  className?: string;
}

export const Sidebar: FC<SidebarProps> = ({ items, className }) => {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { openDrawer } = useRecommendationDrawerContext();
  const { isExpanded, closeSidebar } = useSidebar();
  const user = session?.user;

  // Build navigation context
  const navigationContext: NavigationContext = useMemo(
    () => ({
      isAuthenticated: !!session?.user,
      isEditMode: false,
      userRole: (session?.user as { role?: string })?.role,
      currentPath: pathname,
      openRecommendationDrawer: openDrawer,
      openTileLibrary: () => {
        console.log('Open tile library');
      },
      saveMosaicLayout: () => {
        console.log('Save mosaic layout');
      },
    }),
    [session, pathname, openDrawer]
  );

  // Get and filter navigation items
  const navigationItems = useMemo(() => {
    const baseItems = items || getDefaultNavItems();
    return filterNavigationItems(baseItems, navigationContext);
  }, [items, navigationContext]);

  // Get and filter user menu items (for expanded sidebar)
  const userMenuItems = useMemo(() => {
    const userItems = getSidebarUserItems().map(item =>
      item.id === 'sidebar-profile' && user?.id
        ? { ...item, href: `/profile/${user.id}` }
        : item
    );
    return filterNavigationItems(userItems, navigationContext);
  }, [navigationContext, user?.id]);

  // Close sidebar on route change
  useEffect(() => {
    if (isExpanded) {
      closeSidebar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Close sidebar on Escape key
  useEffect(() => {
    if (!isExpanded) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSidebar();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isExpanded, closeSidebar]);

  return (
    <nav
      className={cn(
        'fixed left-0 top-16 bottom-0 z-40 overflow-y-auto overflow-x-hidden',
        'bg-black border-r border-zinc-800',
        'flex flex-col',
        'transition-all duration-300 ease-in-out',
        isExpanded ? 'w-64' : 'w-20',
        className
      )}
      aria-label='Main navigation'
    >
      {/* Navigation Items */}
      <TooltipProvider>
        <div
          className={cn(
            'flex-1 flex flex-col space-y-2',
            isExpanded
              ? 'items-stretch px-3 pt-4'
              : 'items-center justify-center'
          )}
        >
          {navigationItems.map(item => (
            <NavigationItem
              key={item.id}
              item={item}
              context={navigationContext}
              isCollapsed={!isExpanded}
              onItemClick={isExpanded ? () => closeSidebar() : undefined}
              data-tour-step={
                item.id === 'recommend' ? 'create-recommendation' : undefined
              }
            />
          ))}
        </div>
      </TooltipProvider>

      {/* Expanded: User section */}
      {isExpanded && user && (
        <div className='border-t border-zinc-700 px-3 py-4 space-y-2'>
          {/* User info */}
          <Link
            href={`/profile/${user.id}`}
            onClick={closeSidebar}
            className='flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors'
          >
            <Avatar className='h-10 w-10'>
              <AvatarImage
                src={user.image || undefined}
                alt={user.username || 'User'}
              />
              <AvatarFallback className='bg-zinc-800 text-white'>
                {user.username?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div className='flex-1 min-w-0'>
              <p className='text-sm font-medium text-cosmic-latte truncate'>
                {user.username}
              </p>
              <p className='text-xs text-zinc-400 truncate'>{user.email}</p>
            </div>
          </Link>

          {/* User menu items */}
          <TooltipProvider>
            {userMenuItems.map(item => (
              <NavigationItem
                key={item.id}
                item={item}
                context={navigationContext}
                isCollapsed={false}
                onItemClick={() => closeSidebar()}
              />
            ))}
          </TooltipProvider>

          {/* Sign out */}
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className='flex items-center gap-3 w-full px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors'
          >
            <LogOut className='h-5 w-5' />
            <span>Sign Out</span>
          </button>
        </div>
      )}

      {/* Help Menu at bottom */}
      <div className={cn('pb-6', isExpanded ? 'px-3' : 'flex justify-center')}>
        <HelpMenu isExpanded={isExpanded} />
      </div>
    </nav>
  );
};

export default Sidebar;
