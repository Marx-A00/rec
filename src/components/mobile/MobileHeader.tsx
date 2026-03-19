'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Search, X, Menu, Bell } from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSearchStore, SearchType } from '@/stores/useSearchStore';
import { MobileSideDrawer } from '@/components/mobile/MobileSideDrawer';
import { cn } from '@/lib/utils';

export default function MobileHeader() {
  const [query, setQuery] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Collapse search on game pages by default, expand everywhere else
  const isGameRoute = pathname.startsWith('/m/game');
  const [searchExpanded, setSearchExpanded] = useState(!isGameRoute);

  // Sync search bar visibility when navigating between routes
  useEffect(() => {
    setSearchExpanded(!pathname.startsWith('/m/game'));
  }, [pathname]);

  // Use Zustand store for search type persistence
  const preferredSearchType = useSearchStore(
    state => state.preferredSearchType
  );
  const setPreferredSearchType = useSearchStore(
    state => state.setPreferredSearchType
  );
  const addRecentSearch = useSearchStore(state => state.addRecentSearch);

  const [searchType, setSearchType] = useState<SearchType>(preferredSearchType);

  // Handle search type change and persist to store
  const handleSearchTypeChange = useCallback(
    (value: SearchType) => {
      setSearchType(value);
      setPreferredSearchType(value);
    },
    [setPreferredSearchType]
  );

  // Handle Enter key to navigate to search page
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' && query.trim().length >= 2) {
        event.preventDefault();
        addRecentSearch(query.trim());
        router.push(
          `/m/search?q=${encodeURIComponent(query.trim())}&type=${searchType}`
        );
      }
    },
    [query, router, searchType, addRecentSearch]
  );

  const toggleSearch = useCallback(() => {
    setSearchExpanded(prev => !prev);
  }, []);

  // Hide header on auth and onboarding pages (must be after all hooks)
  const isAuthPage =
    pathname.startsWith('/m/auth') ||
    pathname.startsWith('/m/complete-profile');
  if (isAuthPage) return null;

  return (
    <>
      <header
        id='mobile-header'
        className='shrink-0 bg-zinc-900/95 backdrop-blur-lg border-b border-zinc-800 pt-[env(safe-area-inset-top)]'
      >
        {/* Top Row: Hamburger | Logo | Search Toggle + Bell */}
        <div className='flex items-center justify-between px-4 py-3'>
          <button
            type='button'
            onClick={() => setDrawerOpen(true)}
            className='flex items-center justify-center h-10 w-10 -ml-1 rounded-lg active:bg-zinc-800 transition-colors'
            aria-label='Open menu'
          >
            <Menu className='h-6 w-6 text-white' strokeWidth={2} />
          </button>

          <span className='text-2xl font-bold text-white font-serif tracking-tight select-none'>
            rec
          </span>

          <div className='flex items-center gap-1'>
            {/* Search toggle button */}
            <button
              type='button'
              onClick={toggleSearch}
              className={cn(
                'relative flex items-center justify-center h-10 w-10 rounded-full transition-colors',
                searchExpanded
                  ? 'bg-emerald-500/15 active:bg-emerald-500/25'
                  : 'bg-zinc-800 active:bg-zinc-700'
              )}
              aria-label={
                searchExpanded ? 'Hide search bar' : 'Show search bar'
              }
              aria-expanded={searchExpanded}
            >
              <Search
                className={cn(
                  'h-5 w-5',
                  searchExpanded ? 'text-emerald-400' : 'text-zinc-400'
                )}
                strokeWidth={2}
              />
            </button>

            {/* Notifications */}
            <button
              type='button'
              className='relative flex items-center justify-center h-10 w-10 rounded-full bg-zinc-800 active:bg-zinc-700 transition-colors'
              aria-label='Notifications'
            >
              <Bell className='h-5 w-5 text-white' strokeWidth={2} />
              {/* Notification dot */}
              <span className='absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-zinc-900' />
            </button>
          </div>
        </div>

        {/* Collapsible Search Row: Type Selector + Search Input */}
        <div
          className={cn(
            'overflow-hidden transition-all duration-200 ease-in-out',
            searchExpanded ? 'max-h-16 opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <div className='flex items-center gap-2 px-3 pb-3'>
            <Select value={searchType} onValueChange={handleSearchTypeChange}>
              <SelectTrigger className='h-10 w-[90px] border-zinc-700 bg-zinc-800 text-white text-sm focus:ring-1 focus:ring-emerald-500'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className='bg-zinc-800 border-zinc-700 text-white'>
                <SelectItem value='albums'>Albums</SelectItem>
                <SelectItem value='artists'>Artists</SelectItem>
                <SelectItem value='tracks'>Tracks</SelectItem>
                <SelectItem value='users'>Users</SelectItem>
              </SelectContent>
            </Select>

            <div className='flex-1 relative'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500' />
              <input
                type='text'
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='Search...'
                className='w-full h-10 pl-9 pr-9 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors'
              />
              {query && (
                <button
                  type='button'
                  onClick={() => setQuery('')}
                  className='absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300 transition-colors'
                  aria-label='Clear search'
                >
                  <X className='h-4 w-4' />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Side Drawer */}
      <MobileSideDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  );
}
