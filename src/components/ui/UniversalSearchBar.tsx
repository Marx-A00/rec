'use client';

// TODO: Build a comprehensive dedicated search page that utilizes the full MusicBrainz lookup capabilities
// with rich metadata (aliases, tags, genres, relationships, full discographies)
// This current implementation only uses search results - we want to leverage the complete API

import { ReactNode, useCallback, useEffect, useState } from 'react';
import { Building2, Music, User, Search } from 'lucide-react';

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import AlbumImage from '@/components/ui/AlbumImage';
import AnimatedLoader from '@/components/ui/AnimatedLoader';
import {
  displayModeConfigs,
  DisplayModeConfig,
} from '@/components/ui/SearchResultRenderer';
import { useUniversalSearch, SearchMode } from '@/hooks/useUniversalSearch';
import { useSearchNavigation } from '@/hooks/useSearchNavigation';
import { UnifiedSearchResult } from '@/types/search';
import { sanitizeArtistName } from '@/lib/utils';

// ========================================
// Configuration Types
// ========================================

export interface SearchEntityType {
  type: 'album' | 'artist' | 'label' | 'track' | 'user' | 'playlist';
  endpoint?: string;
  displayName: string;
  icon: ReactNode;
  color: string;
  searchFields?: string[];
  navigationHandler?: (result: UnifiedSearchResult) => Promise<void>;
  weight?: number;
  deduplicate?: boolean;
  maxResults?: number;
}

export interface SearchFilter {
  key: string;
  label: string;
  type: 'text' | 'select' | 'range' | 'boolean' | 'multiselect' | 'daterange';
  options?: FilterOption[];
  defaultValue?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  validation?: (value: any) => boolean; // eslint-disable-line @typescript-eslint/no-explicit-any
  category?: string;
  priority?: number;
  isVisible?: boolean;
  placeholder?: string;
  helpText?: string;
}

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
  group?: string;
  disabled?: boolean;
  icon?: ReactNode;
}

export interface SearchTheme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    border: string;
    text: string;
    placeholder: string;
    highlight: string;
    error: string;
    success: string;
    warning: string;
    muted: string;
    accent: string;
  };
  borderRadius: string;
  shadows: {
    input: string;
    dropdown: string;
    hover: string;
    focus: string;
  };
  animations: {
    duration: string;
    easing: string;
    hover: string;
    focus: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
    };
    fontWeight: {
      normal: string;
      medium: string;
      semibold: string;
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

export interface SearchContext {
  page: string;
  mode: 'global' | 'modal' | 'sidebar' | 'inline';
  filters?: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  userPreferences?: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  layout?: 'compact' | 'comfortable' | 'spacious';
  groupBy?: 'type' | 'relevance' | 'date' | 'none';
  sortBy?: 'relevance' | 'date' | 'popularity' | 'alphabetical';
  deduplicate?: boolean;
}

// ========================================
// Context Preset Types
// ========================================

export type SearchPreset =
  | 'modal'
  | 'global'
  | 'users'
  | 'recommendations'
  | 'compact';

export interface SearchPresetConfig {
  entityTypes: SearchEntityType[];
  filters: SearchFilter[];
  theme: Partial<SearchTheme>;
  context: SearchContext;
  maxResults: number;
  debounceMs: number;
  minQueryLength: number;
  placeholder: string;
  layout: 'compact' | 'comfortable' | 'spacious';
  showGroupHeaders: boolean;
  enableFiltering: boolean;
  enableSorting: boolean;
  displayMode: DisplayModeConfig;
}

// ========================================
// Default Configurations
// ========================================

export const defaultEntityTypes: SearchEntityType[] = [
  {
    type: 'album',
    displayName: 'Albums',
    icon: <Music className='h-4 w-4' />,
    color: 'blue',
    searchFields: ['title', 'artist', 'year'],
    weight: 3,
    deduplicate: true,
    maxResults: 6,
  },
  {
    type: 'artist',
    displayName: 'Artists',
    icon: <User className='h-4 w-4' />,
    color: 'green',
    searchFields: ['name'],
    weight: 2,
    deduplicate: false,
    maxResults: 4,
  },
  {
    type: 'label',
    displayName: 'Labels',
    icon: <Building2 className='h-4 w-4' />,
    color: 'purple',
    searchFields: ['name'],
    weight: 1,
    deduplicate: false,
    maxResults: 3,
  },
];

export const defaultFilters: SearchFilter[] = [
  {
    key: 'genre',
    label: 'Genre',
    type: 'multiselect',
    category: 'Music',
    priority: 1,
    isVisible: true,
    placeholder: 'Select genres...',
    helpText: 'Filter by music genres',
    options: [
      { value: 'rock', label: 'Rock' },
      { value: 'pop', label: 'Pop' },
      { value: 'jazz', label: 'Jazz' },
      { value: 'electronic', label: 'Electronic' },
      { value: 'classical', label: 'Classical' },
      { value: 'hip-hop', label: 'Hip Hop' },
    ],
  },
  {
    key: 'year',
    label: 'Year Range',
    type: 'daterange',
    category: 'Release',
    priority: 2,
    isVisible: true,
    placeholder: 'Select year range...',
    helpText: 'Filter by release year',
  },
  {
    key: 'decade',
    label: 'Decade',
    type: 'select',
    category: 'Release',
    priority: 3,
    isVisible: true,
    placeholder: 'Select decade...',
    helpText: 'Filter by decade',
    options: [
      { value: '2020s', label: '2020s' },
      { value: '2010s', label: '2010s' },
      { value: '2000s', label: '2000s' },
      { value: '1990s', label: '1990s' },
      { value: '1980s', label: '1980s' },
      { value: '1970s', label: '1970s' },
      { value: '1960s', label: '1960s' },
    ],
  },
  {
    key: 'label',
    label: 'Record Label',
    type: 'text',
    category: 'Release',
    priority: 4,
    isVisible: true,
    placeholder: 'Enter label name...',
    helpText: 'Filter by record label',
  },
];

export const defaultTheme: SearchTheme = {
  colors: {
    primary: '#3b82f6',
    secondary: '#64748b',
    background: '#18181b',
    border: '#3f3f46',
    text: '#ffffff',
    placeholder: '#71717a',
    highlight: '#fbbf24',
    error: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b',
    muted: '#6b7280',
    accent: '#8b5cf6',
  },
  borderRadius: '0.5rem',
  shadows: {
    input: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    dropdown: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    hover: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    focus: '0 0 0 2px rgb(59 130 246 / 0.5)',
  },
  animations: {
    duration: '150ms',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    hover: 'transform 150ms ease',
    focus: 'box-shadow 150ms ease',
  },
  typography: {
    fontFamily: 'Inter, sans-serif',
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      md: '1rem',
      lg: '1.125rem',
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
};

// ========================================
// Context Preset Configurations
// ========================================

export const searchPresets: Record<SearchPreset, SearchPresetConfig> = {
  modal: {
    entityTypes: [defaultEntityTypes[0]], // Albums only
    filters: [],
    theme: {
      colors: {
        primary: '#3b82f6',
        accent: '#1d4ed8',
      },
    } as Partial<SearchTheme>,
    context: {
      page: 'modal',
      mode: 'modal',
      layout: 'compact',
      groupBy: 'none',
      sortBy: 'relevance',
      deduplicate: true,
    },
    maxResults: 5,
    debounceMs: 300,
    minQueryLength: 2,
    placeholder: 'Search for albums...',
    layout: 'compact',
    showGroupHeaders: false,
    enableFiltering: false,
    enableSorting: false,
    displayMode: displayModeConfigs.modal,
  },

  global: {
    entityTypes: defaultEntityTypes,
    filters: defaultFilters,
    theme: {
      colors: {
        primary: '#059669',
        accent: '#065f46',
      },
    } as Partial<SearchTheme>,
    context: {
      page: 'header',
      mode: 'global',
      layout: 'comfortable',
      groupBy: 'type',
      sortBy: 'relevance',
      deduplicate: true,
    },
    maxResults: 12,
    debounceMs: 500,
    minQueryLength: 2,
    placeholder: 'Search albums, artists, and labels...',
    layout: 'comfortable',
    showGroupHeaders: true,
    enableFiltering: true,
    enableSorting: true,
    displayMode: displayModeConfigs.global,
  },

  users: {
    entityTypes: [
      {
        type: 'user',
        displayName: 'Users',
        icon: <User className='h-4 w-4' />,
        color: 'indigo',
        searchFields: ['username', 'displayName'],
        weight: 1,
        deduplicate: false,
        maxResults: 8,
      },
    ],
    filters: [
      {
        key: 'status',
        label: 'User Status',
        type: 'select',
        category: 'User',
        priority: 1,
        isVisible: true,
        placeholder: 'Select status...',
        options: [
          { value: 'active', label: 'Active' },
          { value: 'premium', label: 'Premium' },
          { value: 'moderator', label: 'Moderator' },
        ],
      },
    ],
    theme: {
      colors: {
        primary: '#6366f1',
        accent: '#4338ca',
      },
    } as Partial<SearchTheme>,
    context: {
      page: 'users',
      mode: 'global',
      layout: 'comfortable',
      groupBy: 'none',
      sortBy: 'alphabetical',
      deduplicate: false,
    },
    maxResults: 10,
    debounceMs: 400,
    minQueryLength: 2,
    placeholder: 'Search users...',
    layout: 'comfortable',
    showGroupHeaders: false,
    enableFiltering: true,
    enableSorting: true,
    displayMode: displayModeConfigs.global,
  },

  recommendations: {
    entityTypes: [
      { ...defaultEntityTypes[0], weight: 5 }, // Albums with higher weight
      { ...defaultEntityTypes[1], weight: 3 }, // Artists
    ],
    filters: [
      defaultFilters[0], // Genre
      defaultFilters[2], // Decade
    ],
    theme: {
      colors: {
        primary: '#f59e0b',
        accent: '#d97706',
      },
    } as Partial<SearchTheme>,
    context: {
      page: 'recommendations',
      mode: 'modal',
      layout: 'comfortable',
      groupBy: 'type',
      sortBy: 'popularity',
      deduplicate: true,
    },
    maxResults: 8,
    debounceMs: 400,
    minQueryLength: 2,
    placeholder: 'Find music for recommendations...',
    layout: 'comfortable',
    showGroupHeaders: true,
    enableFiltering: true,
    enableSorting: false,
    displayMode: displayModeConfigs.modal,
  },

  compact: {
    entityTypes: [defaultEntityTypes[0]], // Albums only
    filters: [],
    theme: {
      colors: {
        primary: '#6b7280',
        accent: '#374151',
      },
    } as Partial<SearchTheme>,
    context: {
      page: 'sidebar',
      mode: 'sidebar',
      layout: 'compact',
      groupBy: 'none',
      sortBy: 'relevance',
      deduplicate: true,
    },
    maxResults: 6,
    debounceMs: 400,
    minQueryLength: 2,
    placeholder: 'Quick search...',
    layout: 'compact',
    showGroupHeaders: false,
    enableFiltering: false,
    enableSorting: false,
    displayMode: displayModeConfigs.compact,
  },
};

// ========================================
// Component Props
// ========================================

export interface UniversalSearchBarProps {
  entityTypes?: SearchEntityType[];
  searchType?: 'all' | 'albums' | 'artists' | 'labels' | 'tracks' | 'users';
  filters?: SearchFilter[];
  placeholder?: string;
  showResults?: boolean;
  resultDisplayFormat?: 'list' | 'grid' | 'compact';
  maxResults?: number;
  debounceMs?: number;
  minQueryLength?: number;
  enableKeyboardNavigation?: boolean;
  enablePrefetching?: boolean;
  onResultSelect?: (
    result: UnifiedSearchResult,
    context?: SearchContext
  ) => void;
  onSearch?: (query: string, filters?: SearchFilter[]) => void;
  onError?: (error: Error) => void;
  className?: string;
  theme?: SearchTheme;
  size?: 'sm' | 'md' | 'lg';
  customResultRenderer?: (result: UnifiedSearchResult) => ReactNode;
  customNavigationHandler?: (result: UnifiedSearchResult) => Promise<void>;
  context?: SearchContext;
  preset?: SearchPreset;
  presetOverrides?: Partial<SearchPresetConfig>;
  enableFiltering?: boolean;
  enableSorting?: boolean;
  showGroupHeaders?: boolean;
  layout?: 'compact' | 'comfortable' | 'spacious';
  displayMode?: 'modal' | 'global' | 'sidebar' | 'inline' | 'compact';
}

// ========================================
// Utility Functions
// ========================================

const mergePresetConfig = (
  preset: SearchPreset,
  overrides?: Partial<SearchPresetConfig>
): SearchPresetConfig => {
  const basePreset = searchPresets[preset];
  if (!overrides) return basePreset;

  return {
    ...basePreset,
    ...overrides,
    theme: { ...basePreset.theme, ...overrides.theme },
    context: { ...basePreset.context, ...overrides.context },
  };
};

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
// Context-Aware Result Renderer
// ========================================

interface ContextAwareResultProps {
  result: UnifiedSearchResult;
  displayConfig: DisplayModeConfig;
  onSelect: () => void;
}

const ContextAwareResult = ({
  result,
  displayConfig,
  onSelect,
}: ContextAwareResultProps) => {
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

  return (
    <CommandItem
      key={result.id}
      value={`${result.type}-${result.id}`}
      onSelect={onSelect}
      className={`${padding} cursor-pointer hover:bg-zinc-700 transition-colors data-[selected=true]:bg-zinc-600 aria-selected:bg-zinc-600`}
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
            alt={
              result.image?.alt ||
              (result.type === 'artist'
                ? sanitizeArtistName(result.title)
                : result.title)
            }
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
            {result.type === 'artist'
              ? truncateText(sanitizeArtistName(result.title), maxTitleLength)
              : truncateText(result.title, maxTitleLength)}
          </h3>

          {/* Artist/Subtitle */}
          <p className={`${subtitleClasses} text-zinc-400 truncate`}>
            {result.type === 'album' && result.artist
              ? truncateText(sanitizeArtistName(result.artist), maxArtistLength)
              : result.type === 'artist'
                ? (() => {
                    // Build artist subtitle with disambiguation and metadata
                    const parts: string[] = [];

                    // Priority 1: MusicBrainz disambiguation (e.g., "UK death metal band")
                    if ((result as any).disambiguation) {
                      parts.push((result as any).disambiguation);
                    }

                    // Priority 2: Country (if no disambiguation)
                    else if ((result as any).country) {
                      const countryEmojis: Record<string, string> = {
                        'US': '🇺🇸', 'GB': '🇬🇧', 'CA': '🇨🇦', 'AU': '🇦🇺',
                        'DE': '🇩🇪', 'FR': '🇫🇷', 'SE': '🇸🇪', 'NO': '🇳🇴',
                        'FI': '🇫🇮', 'DK': '🇩🇰', 'NL': '🇳🇱', 'BE': '🇧🇪',
                        'IT': '🇮🇹', 'ES': '🇪🇸', 'JP': '🇯🇵', 'BR': '🇧🇷',
                        'MX': '🇲🇽',
                      };
                      const emoji = countryEmojis[(result as any).country];
                      const countryText = emoji ? `${emoji} ${(result as any).country}` : (result as any).country;
                      parts.push(countryText);

                      // Add type if available
                      if (result.subtitle && result.subtitle !== 'Artist') {
                        parts.push(result.subtitle);
                      }
                    }

                    // Priority 3: Just type (Group/Person)
                    else if (result.subtitle && result.subtitle !== 'Artist') {
                      parts.push(result.subtitle);
                    }

                    // Add formation year if available
                    if ((result as any).lifeSpan?.begin) {
                      const year = (result as any).lifeSpan.begin.match(/^(\d{4})/)?.[1];
                      if (year) {
                        parts.push(`Since ${year}`);
                      }
                    }

                    // Return formatted string or fallback
                    return parts.length > 0 ? parts.join(' • ') : 'Artist';
                  })()
                : result.type === 'label'
                  ? 'Label'
                  : result.type === 'track'
                    ? `Track${result.artist ? ` • ${truncateText(sanitizeArtistName(result.artist), maxArtistLength)}` : ''}`
                    : result.type === 'user'
                      ? 'User'
                      : result.type.charAt(0).toUpperCase() +
                        result.type.slice(1)}
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
};

// ========================================
// Main Component
// ========================================

export default function UniversalSearchBar({
  entityTypes = defaultEntityTypes,
  filters = [],
  placeholder = 'Search...',
  showResults = true,
  maxResults = 10,
  debounceMs = 500,
  minQueryLength = 2,
  enablePrefetching = true,
  onResultSelect,
  onSearch,
  onError,
  className = '',
  theme = defaultTheme,
  customResultRenderer,
  customNavigationHandler,
  context,
  preset = 'global',
  presetOverrides,
  displayMode,
}: UniversalSearchBarProps) {
  // State management
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<SearchMode>('LOCAL_ONLY');
  const [showExternalHint, setShowExternalHint] = useState(false);

  // Merge preset configuration with props
  const presetConfig = mergePresetConfig(preset, presetOverrides);

  // Resolve final configuration values
  const finalEntityTypes = entityTypes;
  const finalFilters = filters.length > 0 ? filters : presetConfig.filters;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const finalTheme = { ...defaultTheme, ...theme, ...presetConfig.theme };
  const finalContext = context || presetConfig.context;
  const finalMaxResults =
    maxResults !== 10 ? maxResults : presetConfig.maxResults;
  const finalDebounceMs =
    debounceMs !== 500 ? debounceMs : presetConfig.debounceMs;
  const finalMinQueryLength =
    minQueryLength !== 2 ? minQueryLength : presetConfig.minQueryLength;
  const finalPlaceholder =
    placeholder !== 'Search...' ? placeholder : presetConfig.placeholder;

  // Determine display mode from context, displayMode prop, or preset
  const finalDisplayMode = displayMode || finalContext.mode || 'global';
  const displayConfig =
    displayModeConfigs[finalDisplayMode] || displayModeConfigs.global;

  // Search hook with enhanced parameters
  const {
    results = [],
    isLoading,
    error: apiError,
  } = useUniversalSearch(query.trim(), {
    entityTypes: finalEntityTypes,
    searchType: 'all',
    filters: finalFilters,
    debounceMs: finalDebounceMs,
    minQueryLength: finalMinQueryLength,
    maxResults: finalMaxResults,
    enabled: query.length >= finalMinQueryLength && open,
    searchMode,
  });

  const { navigateToResult, prefetchResults } = useSearchNavigation({
    entityTypes: finalEntityTypes,
    enablePrefetching,
    context: finalContext,
  });

  // Error handling
  const error = apiError ? 'Search failed. Please try again.' : localError;

  // Handle search input changes
  const handleValueChange = useCallback(
    (value: string) => {
      setQuery(value);
      setOpen(value.length >= finalMinQueryLength);

      // Reset to local search when typing
      if (searchMode !== 'LOCAL_ONLY') {
        setSearchMode('LOCAL_ONLY');
      }

      // Show hint about external search after typing
      if (value.length >= finalMinQueryLength) {
        setShowExternalHint(true);
      }

      if (value.length === 0) {
        setLocalError(null);
        setOpen(false);
        setShowExternalHint(false);
      }

      // Call external onSearch callback
      onSearch?.(value, finalFilters);
    },
    [finalMinQueryLength, finalFilters, onSearch, searchMode]
  );

  // Handle Enter key for external search
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' && query.length >= finalMinQueryLength) {
        event.preventDefault();
        setSearchMode('LOCAL_AND_EXTERNAL');
        setShowExternalHint(false);
      }
    },
    [query, finalMinQueryLength]
  );

  // Handle result selection
  const handleResultSelect = useCallback(
    async (result: UnifiedSearchResult) => {
      try {
        if (customNavigationHandler) {
          await customNavigationHandler(result);
        } else {
          await navigateToResult(result);
        }

        // Call external onResultSelect callback
        onResultSelect?.(result, finalContext);
      } catch (navigationError) {
        console.error('Navigation failed:', navigationError);
        setLocalError('Navigation failed. Please try again.');
        onError?.(
          navigationError instanceof Error
            ? navigationError
            : new Error('Navigation failed')
        );
      }

      setOpen(false);
      setQuery('');
    },
    [
      customNavigationHandler,
      navigateToResult,
      onResultSelect,
      finalContext,
      onError,
    ]
  );

  // Prefetch results when they become available
  useEffect(() => {
    if (enablePrefetching && Array.isArray(results) && results.length > 0) {
      prefetchResults(results.slice(0, 3));
    }
  }, [results, enablePrefetching, prefetchResults]);

  // Handle Escape key to close search dropdown and unfocus
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        setOpen(false);
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
  }, [open]);

  // Group results by entity type
  const groupedResults = Array.isArray(results)
    ? results.reduce(
        (acc, result) => {
          if (!acc[result.type]) {
            acc[result.type] = [];
          }
          acc[result.type].push(result);
          return acc;
        },
        {} as Record<string, UnifiedSearchResult[]>
      )
    : {};

  return (
    <div className={`relative ${className}`}>
      <Command
        className='border-zinc-700 shadow-lg bg-zinc-900'
        shouldFilter={false}
      >
        <div className='[&_.border-b]:border-cosmic-latte [&_[cmdk-input-wrapper]]:border-cosmic-latte [&_svg]:text-cosmic-latte [&_svg]:opacity-100'>
          <CommandInput
            id='main-search-bar'
            placeholder={finalPlaceholder}
            value={query}
            onValueChange={handleValueChange}
            onKeyDown={handleKeyDown}
            className='h-9 text-white placeholder:text-zinc-400'
          />
        </div>
        {open && showResults && (
          <CommandList className='absolute top-full left-0 right-0 max-h-80 overflow-y-auto bg-zinc-900 border border-zinc-700 rounded-b-lg shadow-xl z-50'>
            {showExternalHint && searchMode === 'LOCAL_ONLY' && (
              <div className='p-2 text-center text-zinc-400 text-sm border-b border-zinc-800'>
                Press{' '}
                <kbd className='px-1.5 py-0.5 mx-1 bg-zinc-800 rounded text-xs'>
                  Enter
                </kbd>{' '}
                to search external sources
              </div>
            )}
            {isLoading && (
              <div className='flex justify-center items-center p-4'>
                <AnimatedLoader className='scale-50' />
              </div>
            )}

            {!isLoading &&
              Array.isArray(results) &&
              results.length === 0 &&
              query.length >= finalMinQueryLength && (
                <CommandEmpty className='text-zinc-400'>
                  No results found.
                </CommandEmpty>
              )}

            {!isLoading && Array.isArray(results) && results.length > 0 && (
              <>
                {finalEntityTypes.map(entityType => {
                  const typeResults = groupedResults[entityType.type] || [];
                  if (typeResults.length === 0) return null;

                  return (
                    <CommandGroup
                      key={entityType.type}
                      heading={
                        presetConfig.showGroupHeaders
                          ? entityType.displayName
                          : undefined
                      }
                      className='text-zinc-400'
                    >
                      {typeResults.map(result =>
                        customResultRenderer ? (
                          <CommandItem
                            key={result.id}
                            value={`${result.type}-${result.id}`}
                            onSelect={() => handleResultSelect(result)}
                            className={`${displayConfig.padding} cursor-pointer hover:bg-zinc-700 data-[selected=true]:bg-zinc-600 aria-selected:bg-zinc-600`}
                          >
                            {customResultRenderer(result)}
                          </CommandItem>
                        ) : (
                          <ContextAwareResult
                            key={result.id}
                            result={result}
                            displayConfig={displayConfig}
                            onSelect={() => handleResultSelect(result)}
                          />
                        )
                      )}
                    </CommandGroup>
                  );
                })}
              </>
            )}
          </CommandList>
        )}
      </Command>

      {error && (
        <div className='absolute top-full left-0 right-0 mt-2 bg-red-900 border border-red-700 rounded-lg p-3 text-red-200 text-sm z-[60]'>
          {error}
        </div>
      )}
    </div>
  );
}
