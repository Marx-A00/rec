'use client';

import { Building2, Music, Tag, User } from 'lucide-react';
import AlbumImage from '@/components/ui/AlbumImage';
import { useEffect, useRef } from 'react';

import { UnifiedSearchResult } from '@/types/search';

interface SearchResultsProps {
  results: UnifiedSearchResult[];
  isLoading: boolean;
  onAlbumSelect?: (result: UnifiedSearchResult) => void;
  className?: string;
  // New props for keyboard navigation
  highlightedIndex?: number;
  onMouseEnter?: (index: number) => void;
}

export default function SearchResults({
  results,
  isLoading,
  onAlbumSelect,
  className = '',
  highlightedIndex = -1,
  onMouseEnter,
}: SearchResultsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'album':
        return <Music className='h-6 w-6 text-zinc-600' />;
      case 'artist':
        return <User className='h-6 w-6 text-zinc-600' />;
      case 'label':
        return <Building2 className='h-6 w-6 text-zinc-600' />;
      default:
        return <Tag className='h-6 w-6 text-zinc-600' />;
    }
  };

  const getResultTypeColor = (type: string) => {
    switch (type) {
      case 'album':
        return 'bg-blue-800 text-blue-200';
      case 'artist':
        return 'bg-green-800 text-green-200';
      case 'label':
        return 'bg-purple-800 text-purple-200';
      default:
        return 'bg-zinc-800 text-zinc-300';
    }
  };

  // Auto-scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && containerRef.current) {
      const element = containerRef.current.querySelector(
        `[data-result-index="${highlightedIndex}"]`
      );
      if (element) {
        element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [highlightedIndex]);

  if (isLoading) {
    return (
      <div
        className={`bg-zinc-900 border border-zinc-700 rounded-lg p-4 ${className}`}
      >
        <div className='flex items-center justify-center space-x-2'>
          <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-red-500'></div>
          <span className='text-zinc-400'>Searching...</span>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`bg-zinc-900 border border-zinc-700 rounded-lg max-h-96 overflow-auto scrollbar-hide ${className}`}
      role='listbox'
      style={{
        // Hide scrollbars while maintaining scroll functionality
        scrollbarWidth: 'none', // Firefox
        msOverflowStyle: 'none', // IE/Edge
      }}
    >
      {results.map((result, index) => (
        <div
          key={result.id}
          onClick={() => onAlbumSelect?.(result)}
          onMouseEnter={() => onMouseEnter?.(index)}
          data-result-index={index}
          className={`flex items-center space-x-3 p-3 cursor-pointer border-b border-zinc-800 last:border-b-0 transition-all duration-200 min-w-0 max-w-full ${
            index === highlightedIndex
              ? 'bg-gradient-to-r from-zinc-700 to-zinc-800 border-l-4 border-l-green-500 shadow-lg' // Removed transform scale to prevent horizontal scroll
              : 'hover:bg-zinc-800'
          }`}
          role='option'
          aria-selected={index === highlightedIndex}
          id={`search-result-${index}`}
        >
          <div className='relative w-12 h-12 flex-shrink-0'>
            <AlbumImage
              src={result.image?.url}
              alt={result.image?.alt || `${result.title} cover`}
              width={48}
              height={48}
              className='w-full h-full object-cover rounded'
              sizes='48px'
              fallbackIcon={getResultIcon(result.type || 'unknown')}
            />
          </div>
          <div className='flex-1 min-w-0'>
            <h3
              className={`font-medium truncate transition-colors ${
                index === highlightedIndex ? 'text-green-300' : 'text-white'
              }`}
            >
              {result.title}
            </h3>
            <p className='text-zinc-400 text-sm truncate'>
              {result.subtitle || result.artist}
            </p>
            {result.releaseDate && (
              <p className='text-zinc-500 text-xs'>{result.releaseDate}</p>
            )}
          </div>
          <div className='flex-shrink-0 flex flex-col items-end space-y-1'>
            {/* Result type badge */}
            <span
              className={`text-xs px-2 py-1 rounded capitalize ${getResultTypeColor(result.type || 'unknown')}`}
            >
              {result.type || 'unknown'}
            </span>
            {/* Genre badge for albums */}
            {result.genre &&
              result.genre.length > 0 &&
              result.type === 'album' && (
                <span className='text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded'>
                  {result.genre[0]}
                </span>
              )}
          </div>
        </div>
      ))}
    </div>
  );
}
