import { useCallback } from 'react';

import { useNavigation } from '@/hooks/useNavigation';
import { UnifiedSearchResult } from '@/types/search';

// ========================================
// Types
// ========================================

interface SearchEntityType {
  type: 'album' | 'artist' | 'label' | 'track' | 'user' | 'playlist';
  navigationHandler?: (result: UnifiedSearchResult) => Promise<void>;
}

interface SearchContext {
  page: string;
  mode: 'global' | 'modal' | 'sidebar' | 'inline';
  filters?: Record<string, any>;
  userPreferences?: Record<string, any>;
}

type NavigationHandler = (result: UnifiedSearchResult) => Promise<void>;

export interface UseSearchNavigationOptions {
  entityTypes: SearchEntityType[];
  customHandlers?: Record<string, NavigationHandler>;
  enablePrefetching: boolean;
  context?: SearchContext;
}

// ========================================
// Hook
// ========================================

export function useSearchNavigation(options: UseSearchNavigationOptions) {
  const { entityTypes, customHandlers = {}, enablePrefetching } = options;
  const {
    navigateToAlbum,
    navigateToArtist,
    navigateToLabel,
    navigateToTrack,
    navigateToProfile,
    prefetchRoute,
  } = useNavigation();

  // Navigate to a search result
  const navigateToResult = useCallback(
    async (result: UnifiedSearchResult) => {
      try {
        // Check for custom handler first
        if (customHandlers.custom) {
          await customHandlers.custom(result);
          return;
        }

        // Check for entity type specific handler
        const entityType = entityTypes.find(et => et.type === result.type);
        if (entityType?.navigationHandler) {
          await entityType.navigationHandler(result);
          return;
        }

        // Default navigation logic based on type
        if (result.type === 'album') {
          try {
            console.log('[useSearchNavigation] Navigating to album', {
              id: result.id,
              source: result.source || null,
            });
          } catch {}
          const suffix = result.source
            ? `?source=${encodeURIComponent(result.source)}`
            : '';
          await navigateToAlbum(`${result.id}${suffix}`, {
            onError: error => {
              throw new Error(`Failed to navigate to album: ${error.message}`);
            },
          });
        } else if (result.type === 'artist') {
          // Store artist data for potential use on the artist page
          sessionStorage.setItem(`artist-${result.id}`, JSON.stringify(result));
          const suffix = result.source
            ? `?source=${encodeURIComponent(result.source)}`
            : '';
          await navigateToArtist(`${result.id}${suffix}`, {
            onError: error => {
              throw new Error(`Failed to navigate to artist: ${error.message}`);
            },
          });
        } else if (result.type === 'label') {
          // Store label data for potential use on the label page
          sessionStorage.setItem(`label-${result.id}`, JSON.stringify(result));
          await navigateToLabel(result.id, {
            onError: error => {
              throw new Error(`Failed to navigate to label: ${error.message}`);
            },
          });
        } else if (result.type === 'track') {
          // Navigate to the track's album page
          const albumId = (result as any).albumId || (result as any).album?.id;
          if (!albumId) {
            throw new Error('Track result missing album information');
          }
          console.log('[useSearchNavigation] Navigating to track album', {
            trackId: result.id,
            albumId,
          });
          await navigateToTrack(albumId, result.id, {
            onError: error => {
              throw new Error(`Failed to navigate to track: ${error.message}`);
            },
          });
        } else if (result.type === 'user') {
          // Navigate to user profile page
          await navigateToProfile(result.id, {
            onError: error => {
              throw new Error(`Failed to navigate to user profile: ${error.message}`);
            },
          });
        } else {
          throw new Error(`Unknown result type: ${result.type}`);
        }
      } catch (error) {
        console.error('Navigation error:', error);
        throw error;
      }
    },
    [
      entityTypes,
      customHandlers,
      navigateToAlbum,
      navigateToArtist,
      navigateToLabel,
      navigateToTrack,
      navigateToProfile,
    ]
  );

  // Prefetch search results for better performance
  const prefetchResults = useCallback(
    (results: UnifiedSearchResult[]) => {
      if (!enablePrefetching || !results.length) return;

      results.forEach(result => {
        try {
          if (result.type === 'album') {
            const suffix = result.source
              ? `?source=${encodeURIComponent(result.source)}`
              : '';
            prefetchRoute(`/albums/${result.id}${suffix}`);
          } else if (result.type === 'artist') {
            const suffix = result.source
              ? `?source=${encodeURIComponent(result.source)}`
              : '';
            prefetchRoute(`/artists/${result.id}${suffix}`);
          } else if (result.type === 'label') {
            prefetchRoute(`/labels/${result.id}`);
          } else if (result.type === 'track') {
            // Prefetch the track's album page
            const albumId =
              (result as any).albumId || (result as any).album?.id;
            if (albumId) {
              prefetchRoute(`/albums/${albumId}`);
            }
          } else if (result.type === 'user') {
            prefetchRoute(`/profile/${result.id}`);
          }
        } catch (error) {
          // Silently fail prefetching - it's not critical
          console.warn('Failed to prefetch route:', error);
        }
      });
    },
    [enablePrefetching, prefetchRoute]
  );

  return {
    navigateToResult,
    prefetchResults,
  };
}

// Re-export types for convenience
export type { UnifiedSearchResult } from '@/types/search';
