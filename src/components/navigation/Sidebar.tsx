'use client';

import React, { FC, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { NavItem, NavigationContext, filterNavigationItems, getDefaultNavItems } from '@/config/navigation';
import NavigationItem from './NavigationItem';
import { useRecommendationDrawerContext } from '@/contexts/RecommendationDrawerContext';
import { useMosaic } from '@/contexts/MosaicContext';
import { cn } from '@/lib/utils';

interface SidebarProps {
  items?: NavItem[];
  position?: 'left' | 'right';
  variant?: 'floating' | 'docked';
  className?: string;
}

export const Sidebar: FC<SidebarProps> = ({
  items,
  position = 'left',
  variant = 'floating',
  className
}) => {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { openDrawer } = useRecommendationDrawerContext();
  const { state: mosaicState, actions: mosaicActions } = useMosaic();

  // Build navigation context
  const navigationContext: NavigationContext = useMemo(() => ({
    isAuthenticated: !!session?.user,
    isEditMode: mosaicState.isEditMode,
    userRole: session?.user?.role,
    currentPath: pathname,
    openRecommendationDrawer: openDrawer,
    openTileLibrary: () => {
      // TODO: Implement tile library opening
      console.log('Open tile library');
    },
    saveMosaicLayout: () => {
      // TODO: Implement save layout
      console.log('Save mosaic layout');
    }
  }), [session, pathname, mosaicState.isEditMode, openDrawer]);

  // Get and filter navigation items
  const navigationItems = useMemo(() => {
    const baseItems = items || getDefaultNavItems();
    return filterNavigationItems(baseItems, navigationContext);
  }, [items, navigationContext]);

  return (
    <nav className={cn(
      'fixed left-0 top-16 bottom-0 z-40 w-20',
      'bg-black border-r border-zinc-800',
      'flex flex-col',
      className
    )}
    aria-label="Main navigation"
    >
      {/* Navigation Items */}
      <div className="flex-1 flex flex-col items-center py-4 space-y-2">
        {navigationItems.map(item => (
          <NavigationItem
            key={item.id}
            item={item}
            context={navigationContext}
            isCollapsed={true}
          />
        ))}
      </div>
    </nav>
  );
};

export default Sidebar;