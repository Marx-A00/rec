'use client';

import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  onClear?: () => void;
  className?: string;
  autoFocus?: boolean;
  debounceMs?: number;
  resultsCount?: number;
  highlightedIndex?: number;
  onNavigate?: (direction: 'up' | 'down') => void;
  onSelectHighlighted?: () => void;
  onEscape?: () => void;
}

export default function SearchBar({
  placeholder = 'Search albums, artists, or genres...',
  onSearch,
  onClear,
  className = '',
  autoFocus = false,
  debounceMs = 300,
  resultsCount = 0,
  highlightedIndex = -1,
  onNavigate,
  onSelectHighlighted,
  onEscape,
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const lastSearchedQuery = useRef('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search effect - only search when user stops typing
  useEffect(() => {
    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!onSearch || !query.trim()) {
      // If query is empty, clear the last searched query
      if (!query.trim()) {
        lastSearchedQuery.current = '';
      }
      return;
    }

    const trimmedQuery = query.trim();

    // Only search if query is long enough and different from last search
    if (trimmedQuery.length > 2 && trimmedQuery !== lastSearchedQuery.current) {
      searchTimeoutRef.current = setTimeout(() => {
        lastSearchedQuery.current = trimmedQuery;
        onSearch(trimmedQuery);
      }, debounceMs);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, onSearch, debounceMs]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleClear = () => {
    setQuery('');
    lastSearchedQuery.current = '';
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (onClear) {
      onClear();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      handleClear();
      onEscape?.();
    } else if (
      e.key === 'ArrowDown' ||
      (e.ctrlKey && e.key === 'n') ||
      (e.ctrlKey && e.key === 'j')
    ) {
      e.preventDefault();
      onNavigate?.('down');
    } else if (
      e.key === 'ArrowUp' ||
      (e.ctrlKey && e.key === 'p') ||
      (e.ctrlKey && e.key === 'k')
    ) {
      e.preventDefault();
      onNavigate?.('up');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && resultsCount > 0) {
        onSelectHighlighted?.();
        // Blur the input only when selecting a result with Enter
        if (inputRef.current) {
          inputRef.current.blur();
        }
      }
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div
        className={`relative flex items-center bg-zinc-900 border rounded-lg transition-all duration-200 ${
          isFocused ? 'shadow-lg' : 'border-zinc-700 hover:border-zinc-600'
        }`}
        style={
          isFocused
            ? {
                borderColor: '#317039',
                boxShadow:
                  '0 10px 15px -3px rgba(49, 112, 57, 0.2), 0 4px 6px -2px rgba(49, 112, 57, 0.1)',
              }
            : {}
        }
      >
        <Search className='absolute left-3 h-4 w-4 text-zinc-400' />
        <input
          ref={inputRef}
          type='text'
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className='w-full pl-10 pr-10 py-3 bg-transparent text-white placeholder-zinc-400 focus:outline-none'
          role='combobox'
          aria-expanded={resultsCount > 0}
          aria-controls='search-results'
          aria-activedescendant={
            highlightedIndex >= 0
              ? `search-result-${highlightedIndex}`
              : undefined
          }
        />
        {query && (
          <button
            onClick={handleClear}
            className='absolute right-3 p-1 text-zinc-400 hover:text-white transition-colors'
            type='button'
          >
            <X className='h-4 w-4' />
          </button>
        )}
      </div>
    </div>
  );
}
