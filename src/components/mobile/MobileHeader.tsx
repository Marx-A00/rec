'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSearchStore, SearchType } from '@/stores/useSearchStore';

export default function MobileHeader() {
  const [query, setQuery] = useState('');
  const router = useRouter();

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

  return (
    <header className='sticky top-0 z-40 bg-zinc-900/95 backdrop-blur-lg border-b border-zinc-800 pt-[env(safe-area-inset-top)]'>
      <div className='flex items-center gap-2 px-3 py-2'>
        {/* Search Type Dropdown */}
        <Select value={searchType} onValueChange={handleSearchTypeChange}>
          <SelectTrigger className='h-10 w-[90px] border-zinc-700 bg-zinc-800 text-white text-sm focus:ring-1 focus:ring-emeraled-green'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className='bg-zinc-800 border-zinc-700 text-white'>
            <SelectItem value='albums'>Albums</SelectItem>
            <SelectItem value='artists'>Artists</SelectItem>
            <SelectItem value='tracks'>Tracks</SelectItem>
            <SelectItem value='users'>Users</SelectItem>
          </SelectContent>
        </Select>

        {/* Search Input */}
        <div className='flex-1 relative'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500' />
          <input
            type='text'
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Search...'
            className='w-full h-10 pl-9 pr-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-emeraled-green transition-colors'
          />
        </div>
      </div>
    </header>
  );
}
