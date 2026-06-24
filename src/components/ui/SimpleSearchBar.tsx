'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Disc3, Music, Search, User } from 'lucide-react';

import { Command, CommandInput } from '@/components/ui/command';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import AlbumImage from '@/components/ui/AlbumImage';
import { useSearchStore, SearchType } from '@/stores/useSearchStore';
import ContextualHint from '@/components/ui/ContextualHint';

// ========================================
// Suggest API types
// ========================================

interface SuggestResult {
  id: string;
  name: string;
  type: 'artist' | 'album';
  imageUrl?: string | null;
  cloudflareImageId?: string | null;
  artistName?: string;
}

// ========================================
// Component
// ========================================

export interface SimpleSearchBarProps {
  placeholder?: string;
  className?: string;
  minQueryLength?: number;
}

export default function SimpleSearchBar({
  placeholder = 'Search albums, artists, tracks, and users...',
  className = '',
  minQueryLength = 2,
}: SimpleSearchBarProps) {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

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
  const recentSearches = useSearchStore(state => state.recentSearches);
  const clearRecentSearches = useSearchStore(
    state => state.clearRecentSearches
  );

  // Local state
  const [searchType, setSearchType] = useState<SearchType>(preferredSearchType);
  const [showDropdown, setShowDropdown] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestResult[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [focused, setFocused] = useState(false);

  // Fetch suggestions from local DB
  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 1) {
      setSuggestions([]);
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const res = await fetch(
        `/api/search/suggest?q=${encodeURIComponent(q)}&limit=6`
      );
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.results || []);
      }
    } catch {
      // Silently fail — suggestions are non-critical
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  // Debounced suggest on query change
  useEffect(() => {
    if (!focused) return;

    if (query.trim().length >= 1) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        fetchSuggestions(query.trim());
      }, 200);
    } else {
      setSuggestions([]);
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, focused, fetchSuggestions]);

  // Show dropdown when focused and there's content to show
  useEffect(() => {
    if (!focused) {
      // Small delay to allow click events on dropdown items to fire
      const timeout = setTimeout(() => setShowDropdown(false), 150);
      return () => clearTimeout(timeout);
    }

    const hasContent =
      suggestions.length > 0 ||
      (query.trim().length === 0 && recentSearches.length > 0);
    setShowDropdown(hasContent);
  }, [focused, suggestions, query, recentSearches]);

  // Handle clear button click
  const handleClear = useCallback(() => {
    setQuery('');
    setSuggestions([]);
  }, [setQuery]);

  // Navigate to search results page
  const executeSearch = useCallback(() => {
    if (query.length >= minQueryLength) {
      addRecentSearch(query.trim());
      setShowDropdown(false);
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
      if (event.key === 'Escape') {
        setShowDropdown(false);
        (event.target as HTMLInputElement).blur();
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

  // Handle suggestion click — fill bar and navigate to search page
  const handleSuggestionClick = useCallback(
    (suggestion: SuggestResult) => {
      const q = suggestion.name;
      setQuery(q);
      addRecentSearch(q);
      setShowDropdown(false);
      setSuggestions([]);
      router.push(
        `/search?q=${encodeURIComponent(q)}&type=${searchType}`
      );
    },
    [router, setQuery, addRecentSearch, searchType]
  );

  // Handle recent search click
  const handleRecentSearchClick = useCallback(
    (recentQuery: string) => {
      setQuery(recentQuery);
      addRecentSearch(recentQuery);
      setShowDropdown(false);
      router.push(
        `/search?q=${encodeURIComponent(recentQuery)}&type=${searchType}`
      );
    },
    [router, searchType, setQuery, addRecentSearch]
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showRecentSearches =
    focused && query.trim().length === 0 && recentSearches.length > 0;
  const showSuggestions = focused && suggestions.length > 0;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
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
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
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

      {/* Typeahead Dropdown */}
      {showDropdown && (showRecentSearches || showSuggestions) && (
        <div className='absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden'>
          {/* Recent Searches */}
          {showRecentSearches && (
            <div>
              <div className='flex items-center justify-between px-3 py-2 border-b border-zinc-800'>
                <span className='text-xs text-zinc-500 uppercase tracking-wider'>
                  Recent Searches
                </span>
                <button
                  onClick={clearRecentSearches}
                  className='text-xs text-zinc-500 hover:text-zinc-300 transition-colors'
                >
                  Clear
                </button>
              </div>
              {recentSearches.slice(0, 5).map(recent => (
                <button
                  key={recent}
                  onMouseDown={e => {
                    e.preventDefault();
                    handleRecentSearchClick(recent);
                  }}
                  className='w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-800 transition-colors text-left'
                >
                  <Clock className='w-3.5 h-3.5 text-zinc-500 shrink-0' />
                  <span className='text-sm text-zinc-300 truncate'>
                    {recent}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Suggestions */}
          {showSuggestions && (
            <div>
              {suggestions.map(suggestion => (
                <button
                  key={`${suggestion.type}-${suggestion.id}`}
                  onMouseDown={e => {
                    e.preventDefault();
                    handleSuggestionClick(suggestion);
                  }}
                  className='w-full flex items-center gap-3 px-3 py-2 hover:bg-zinc-800 transition-colors text-left'
                >
                  {/* Thumbnail */}
                  <div className='w-8 h-8 shrink-0 rounded overflow-hidden bg-zinc-800'>
                    {suggestion.imageUrl || suggestion.cloudflareImageId ? (
                      <AlbumImage
                        src={suggestion.imageUrl}
                        alt={suggestion.name}
                        cloudflareImageId={suggestion.cloudflareImageId}
                        width={32}
                        height={32}
                        className='w-full h-full object-cover'
                        showSkeleton={false}
                      />
                    ) : (
                      <div className='w-full h-full flex items-center justify-center'>
                        {suggestion.type === 'artist' ? (
                          <User className='w-4 h-4 text-zinc-600' />
                        ) : (
                          <Disc3 className='w-4 h-4 text-zinc-600' />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Text */}
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm text-white truncate'>
                      {suggestion.name}
                    </p>
                    <p className='text-xs text-zinc-500 truncate'>
                      {suggestion.type === 'artist'
                        ? 'Artist'
                        : suggestion.artistName || 'Album'}
                    </p>
                  </div>

                  {/* Type badge */}
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${
                      suggestion.type === 'artist'
                        ? 'bg-green-900/50 text-green-400'
                        : 'bg-blue-900/50 text-blue-400'
                    }`}
                  >
                    {suggestion.type === 'artist' ? (
                      <User className='w-3 h-3' />
                    ) : (
                      <Music className='w-3 h-3' />
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Loading indicator */}
          {isLoadingSuggestions && suggestions.length === 0 && (
            <div className='px-3 py-3 text-center text-xs text-zinc-500'>
              Searching...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
