'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Search } from 'lucide-react';
import { Command, CommandInput } from '@/components/ui/command';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSearchStore, SearchType } from '@/stores/useSearchStore';
import ContextualHint from '@/components/ui/ContextualHint';

export interface SimpleSearchBarProps {
  placeholder?: string;
  className?: string;
  minQueryLength?: number;
}

export default function SimpleSearchBar({
  placeholder = 'Search albums, artists, and labels...',
  className = '',
  minQueryLength = 2,
}: SimpleSearchBarProps) {
  const router = useRouter();

  // Use Zustand store for query and search type persistence
  const query = useSearchStore(state => state.query);
  const setQuery = useSearchStore(state => state.setQuery);
  const preferredSearchType = useSearchStore(
    state => state.preferredSearchType
  );
  const setPreferredSearchType = useSearchStore(
    state => state.setPreferredSearchType
  );
  const addRecentSearch = useSearchStore(state => state.addRecentSearch);

  // Initialize local search type from store
  // TODO: Re-add 'all' when we figure out the "ALL" search
  const [searchType, setSearchType] = useState<SearchType>(preferredSearchType);

  // Handle clear button click
  const handleClear = useCallback(() => {
    setQuery('');
  }, [setQuery]);

  // Navigate to search results page
  const executeSearch = useCallback(() => {
    if (query.length >= minQueryLength) {
      addRecentSearch(query.trim());
      router.push(
        `/search?q=${encodeURIComponent(query.trim())}&type=${searchType}`
      );
    }
  }, [query, minQueryLength, router, searchType, addRecentSearch]);

  // Handle Enter key to navigate to search page with type parameter
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        executeSearch();
      }
    },
    [executeSearch]
  );

  // Handle search type change and persist to store
  const handleSearchTypeChange = useCallback(
    (value: SearchType) => {
      setSearchType(value);
      setPreferredSearchType(value);
    },
    [setPreferredSearchType]
  );

  // Handle Escape key to unfocus
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Unfocus the search input
        const searchInput = document.querySelector(
          '[cmdk-input]'
        ) as HTMLInputElement;
        if (searchInput) {
          searchInput.blur();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className='flex items-stretch border border-zinc-700 rounded-lg shadow-lg bg-zinc-900 overflow-hidden'>
        {/* Search Type Dropdown */}
        <div className='border-r border-zinc-700'>
          <Select value={searchType} onValueChange={handleSearchTypeChange}>
            <SelectTrigger className='h-full border-0 bg-zinc-800 text-white rounded-none rounded-l-lg focus:ring-2 focus:ring-inset focus:ring-cosmic-latte w-[110px]'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className='bg-zinc-800 border-zinc-700 text-white'>
              {/* TODO: Re-enable when we figure out the "ALL" search */}
              {/* <SelectItem value='all'>All</SelectItem> */}
              <SelectItem value='albums'>Albums</SelectItem>
              <SelectItem value='artists'>Artists</SelectItem>
              <SelectItem value='tracks'>Tracks</SelectItem>
              <SelectItem value='users'>Users</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Search Input */}
        <ContextualHint
          id='search-bar'
          title='Search'
          description='Find albums, artists, tracks, and users across the platform.'
          side='bottom'
        >
          <Command
            className='border-0 shadow-none bg-transparent flex-1'
            shouldFilter={false}
          >
            <div className='[&_.border-b]:border-0 **:[[cmdk-input-wrapper]]:border-0 [&_[cmdk-input-wrapper]>svg]:hidden'>
              <CommandInput
                id='main-search-bar'
                data-tour-step='main-search'
                placeholder={placeholder}
                value={query}
                onValueChange={setQuery}
                onKeyDown={handleKeyDown}
                onClear={handleClear}
                className='h-9 text-white placeholder:text-zinc-400'
              />
            </div>
          </Command>
        </ContextualHint>

        {/* Search Button */}
        <div className='border-l border-zinc-700'>
          <button
            onClick={executeSearch}
            disabled={query.length < minQueryLength}
            className='h-full px-3 bg-zinc-800 rounded-none rounded-r-lg hover:bg-zinc-700 transition-colors disabled:cursor-not-allowed focus:outline-hidden focus:ring-2 focus:ring-inset focus:ring-cosmic-latte'
          >
            <Search className='w-4 h-4 text-cosmic-latte' />
          </button>
        </div>
      </div>
    </div>
  );
}
