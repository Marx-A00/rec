'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Command, CommandInput } from '@/components/ui/command';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  const [query, setQuery] = useState('');
  // TODO: Re-add 'all' when we figure out the "ALL" search
  const [searchType, setSearchType] = useState<'albums' | 'artists' | 'tracks'>(
    'albums'
  );
  const router = useRouter();

  // Handle search input changes
  const handleValueChange = useCallback((value: string) => {
    setQuery(value);
  }, []);

  // Handle Enter key to navigate to search page with type parameter
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' && query.length >= minQueryLength) {
        event.preventDefault();
        // Navigate to dedicated search page with type filter
        router.push(
          `/search?q=${encodeURIComponent(query.trim())}&type=${searchType}`
        );
      }
    },
    [query, minQueryLength, router, searchType]
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
      <div className='flex border border-zinc-700 rounded-lg shadow-lg bg-zinc-900 overflow-hidden'>
        {/* Search Type Dropdown */}
        <div className='border-r border-zinc-700'>
          <Select
            value={searchType}
            onValueChange={value => setSearchType(value as any)}
          >
            <SelectTrigger className='h-9 border-0 bg-zinc-800 text-white rounded-none rounded-l-lg focus:ring-2 focus:ring-inset focus:ring-cosmic-latte w-[110px]'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className='bg-zinc-800 border-zinc-700 text-white'>
              {/* TODO: Re-enable when we figure out the "ALL" search */}
              {/* <SelectItem value='all'>All</SelectItem> */}
              <SelectItem value='albums'>Albums</SelectItem>
              <SelectItem value='artists'>Artists</SelectItem>
              <SelectItem value='tracks'>Tracks</SelectItem>
              {/** Users option temporarily disabled */}
            </SelectContent>
          </Select>
        </div>

        {/* Search Input */}
        <Command
          className='border-0 shadow-none bg-transparent flex-1'
          shouldFilter={false}
        >
          <div className='[&_.border-b]:border-0 [&_[cmdk-input-wrapper]]:border-0 [&_svg]:text-cosmic-latte [&_svg]:opacity-100'>
            <CommandInput
              id='main-search-bar'
              placeholder={placeholder}
              value={query}
              onValueChange={handleValueChange}
              onKeyDown={handleKeyDown}
              className='h-9 text-white placeholder:text-zinc-400'
            />
          </div>
        </Command>
      </div>
    </div>
  );
}
