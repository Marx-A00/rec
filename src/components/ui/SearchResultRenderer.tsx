'use client';

import { ReactNode } from 'react';
import { Music, User, Building2, Search } from 'lucide-react';

import { CommandItem, CommandGroup } from '@/components/ui/command';
import AlbumImage from '@/components/ui/AlbumImage';
import { UnifiedSearchResult } from '@/types/search';
import { sanitizeArtistName } from '@/lib/utils';

// ========================================
// Display Mode Configuration Types
// ========================================

export interface DisplayModeConfig {
  imageSize: { width: number; height: number };
  padding: string;
  spacing: string;
  showMetadata: boolean;
  showTypeLabel: boolean;
  showYear: boolean;
  showIcon: boolean;
  maxTitleLength?: number;
  maxArtistLength?: number;
  textSize: 'xs' | 'sm' | 'md' | 'lg';
  layoutDirection: 'horizontal' | 'vertical';
  density: 'minimal' | 'compact' | 'comfortable' | 'spacious';
}

// ========================================
// Display Mode Configurations
// ========================================

export const displayModeConfigs: Record<string, DisplayModeConfig> = {
  modal: {
    imageSize: { width: 32, height: 32 },
    padding: 'px-3 py-2',
    spacing: 'space-x-2',
    showMetadata: false,
    showTypeLabel: false,
    showYear: false,
    showIcon: false,
    maxTitleLength: 40,
    maxArtistLength: 30,
    textSize: 'sm',
    layoutDirection: 'horizontal',
    density: 'compact',
  },
  global: {
    imageSize: { width: 48, height: 48 },
    padding: 'px-4 py-3',
    spacing: 'space-x-3',
    showMetadata: true,
    showTypeLabel: true,
    showYear: true,
    showIcon: true,
    textSize: 'md',
    layoutDirection: 'horizontal',
    density: 'comfortable',
  },
  sidebar: {
    imageSize: { width: 28, height: 28 },
    padding: 'px-2 py-2',
    spacing: 'space-x-2',
    showMetadata: false,
    showTypeLabel: false,
    showYear: false,
    showIcon: false,
    maxTitleLength: 25,
    maxArtistLength: 20,
    textSize: 'xs',
    layoutDirection: 'horizontal',
    density: 'minimal',
  },
  inline: {
    imageSize: { width: 40, height: 40 },
    padding: 'px-3 py-2.5',
    spacing: 'space-x-2.5',
    showMetadata: false,
    showTypeLabel: false,
    showYear: false,
    showIcon: false,
    maxTitleLength: 35,
    maxArtistLength: 25,
    textSize: 'sm',
    layoutDirection: 'horizontal',
    density: 'compact',
  },
  compact: {
    imageSize: { width: 24, height: 24 },
    padding: 'px-2 py-1.5',
    spacing: 'space-x-2',
    showMetadata: false,
    showTypeLabel: false,
    showYear: false,
    showIcon: false,
    maxTitleLength: 20,
    maxArtistLength: 15,
    textSize: 'xs',
    layoutDirection: 'horizontal',
    density: 'minimal',
  },
};

// ========================================
// Utility Functions
// ========================================

const getResultIcon = (type: string) => {
  switch (type) {
    case 'album':
      return <Music className='h-4 w-4' />;
    case 'artist':
      return <User className='h-4 w-4' />;
    case 'label':
      return <Building2 className='h-4 w-4' />;
    case 'track':
      return <Music className='h-3 w-3' />;
    case 'user':
      return <User className='h-4 w-4' />;
    default:
      return <Search className='h-4 w-4' />;
  }
};

const getResultTypeColor = (type: string) => {
  switch (type) {
    case 'album':
      return 'bg-blue-900 text-blue-200';
    case 'artist':
      return 'bg-green-900 text-green-200';
    case 'label':
      return 'bg-purple-900 text-purple-200';
    case 'track':
      return 'bg-orange-900 text-orange-200';
    case 'user':
      return 'bg-indigo-900 text-indigo-200';
    default:
      return 'bg-zinc-800 text-zinc-300';
  }
};

const truncateText = (text: string, maxLength?: number): string => {
  if (!maxLength || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

// ========================================
// Context-Aware Result Renderer Component
// ========================================

export interface SearchResultRendererProps {
  result: UnifiedSearchResult;
  displayMode: 'modal' | 'global' | 'sidebar' | 'inline' | 'compact';
  onSelect: () => void;
  customRenderer?: (result: UnifiedSearchResult) => ReactNode;
}

export default function SearchResultRenderer({
  result,
  displayMode = 'global',
  onSelect,
  customRenderer,
}: SearchResultRendererProps) {
  // Use custom renderer if provided
  if (customRenderer) {
    return (
      <CommandItem
        key={result.id}
        value={`${result.type}-${result.id}`}
        onSelect={onSelect}
        className='cursor-pointer hover:bg-zinc-800 transition-colors'
      >
        {customRenderer(result)}
      </CommandItem>
    );
  }

  // Get display configuration for the mode
  const displayConfig =
    displayModeConfigs[displayMode] || displayModeConfigs.global;

  const {
    imageSize,
    padding,
    spacing,
    showMetadata,
    showTypeLabel,
    showYear,
    showIcon,
    maxTitleLength,
    maxArtistLength,
    textSize,
    density,
  } = displayConfig;

  // Dynamic styling based on text size
  const titleClasses = {
    xs: 'text-xs font-medium',
    sm: 'text-sm font-medium',
    md: 'text-base font-medium',
    lg: 'text-lg font-medium',
  }[textSize];

  const subtitleClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-sm',
    lg: 'text-base',
  }[textSize];

  const metadataClasses = {
    xs: 'text-xs',
    sm: 'text-xs',
    md: 'text-xs',
    lg: 'text-sm',
  }[textSize];

  // Format subtitle text based on result type
  const getSubtitleText = () => {
    switch (result.type) {
      case 'album':
        return result.artist
          ? truncateText(sanitizeArtistName(result.artist), maxArtistLength)
          : 'Album';
      case 'artist':
        return 'Artist';
      case 'label':
        return 'Label';
      case 'track':
        return result.artist
          ? `Track • ${truncateText(sanitizeArtistName(result.artist), maxArtistLength)}`
          : 'Track';
      case 'user':
        return 'User';
      default:
        return result.type.charAt(0).toUpperCase() + result.type.slice(1);
    }
  };

  return (
    <CommandItem
      key={result.id}
      value={`${result.type}-${result.id}`}
      onSelect={onSelect}
      className={`${padding} cursor-pointer hover:bg-zinc-800 transition-colors`}
    >
      <div className={`flex items-center ${spacing} w-full min-w-0`}>
        {/* Image/Icon Section */}
        <div
          className='flex-shrink-0 relative'
          style={{
            width: imageSize.width,
            height: imageSize.height,
          }}
        >
          <AlbumImage
            src={result.image?.url || result.cover_image}
            alt={result.image?.alt || result.title}
            width={imageSize.width}
            height={imageSize.height}
            className='w-full h-full object-cover rounded'
            fallbackIcon={showIcon ? getResultIcon(result.type) : undefined}
            showSkeleton={density !== 'minimal'}
          />
        </div>

        {/* Content Section */}
        <div className='flex-1 min-w-0'>
          {/* Title */}
          <h3 className={`${titleClasses} text-white truncate`}>
            {truncateText(result.title, maxTitleLength)}
          </h3>

          {/* Artist/Subtitle */}
          <p className={`${subtitleClasses} text-zinc-400 truncate`}>
            {getSubtitleText()}
          </p>
        </div>

        {/* Metadata Section */}
        {showMetadata && (
          <div className='flex-shrink-0 flex flex-col items-end space-y-1'>
            {/* Type Label */}
            {showTypeLabel && (
              <span
                className={`px-2 py-1 ${metadataClasses} rounded ${getResultTypeColor(
                  result.type
                )}`}
              >
                {result.type}
              </span>
            )}

            {/* Year */}
            {showYear && result.releaseDate && (
              <span className={`${metadataClasses} text-zinc-500`}>
                {new Date(result.releaseDate).getFullYear()}
              </span>
            )}
          </div>
        )}
      </div>
    </CommandItem>
  );
}

// ========================================
// Context-Aware Result List Component
// ========================================

export interface SearchResultListProps {
  results: UnifiedSearchResult[];
  displayMode: 'modal' | 'global' | 'sidebar' | 'inline' | 'compact';
  onResultSelect: (result: UnifiedSearchResult) => void;
  customRenderer?: (result: UnifiedSearchResult) => ReactNode;
  groupByType?: boolean;
  entityTypes?: Array<{
    type: string;
    displayName: string;
  }>;
  showGroupHeaders?: boolean;
}

export function SearchResultList({
  results,
  displayMode = 'global',
  onResultSelect,
  customRenderer,
  groupByType = true,
  entityTypes = [],
  showGroupHeaders = true,
}: SearchResultListProps) {
  if (!groupByType) {
    // Render flat list
    return (
      <>
        {results.map(result => (
          <SearchResultRenderer
            key={result.id}
            result={result}
            displayMode={displayMode}
            onSelect={() => onResultSelect(result)}
            customRenderer={customRenderer}
          />
        ))}
      </>
    );
  }

  // Group results by type
  const groupedResults = results.reduce(
    (acc, result) => {
      if (!acc[result.type]) {
        acc[result.type] = [];
      }
      acc[result.type].push(result);
      return acc;
    },
    {} as Record<string, UnifiedSearchResult[]>
  );

  return (
    <>
      {entityTypes.map(entityType => {
        const typeResults = groupedResults[entityType.type] || [];
        if (typeResults.length === 0) return null;

        return (
          <CommandGroup
            key={entityType.type}
            heading={showGroupHeaders ? entityType.displayName : undefined}
          >
            {typeResults.map(result => (
              <SearchResultRenderer
                key={result.id}
                result={result}
                displayMode={displayMode}
                onSelect={() => onResultSelect(result)}
                customRenderer={customRenderer}
              />
            ))}
          </CommandGroup>
        );
      })}
    </>
  );
}

// Export utility functions
export { getResultIcon, getResultTypeColor, truncateText };
