'use client';

import { useCallback, useEffect, useState } from 'react';
import { Command, CommandInput } from '@/components/ui/command';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();

  // Handle search input changes
  const handleValueChange = useCallback((value: string) => {
    setQuery(value);
  }, []);

  // Handle Enter key to navigate to search page
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' && query.length >= minQueryLength) {
        event.preventDefault();
        // Navigate to dedicated search page
        router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      }
    },
    [query, minQueryLength, router]
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
      <Command
        className='border-zinc-700 shadow-lg bg-zinc-900'
        shouldFilter={false}
      >
        <div className='[&_.border-b]:border-cosmic-latte [&_[cmdk-input-wrapper]]:border-cosmic-latte [&_svg]:text-cosmic-latte [&_svg]:opacity-100'>
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
  );
}
