'use client';

import { useCallback } from 'react';
import { Building2, Music, User } from 'lucide-react';

import UniversalSearchBar, { 
  SearchEntityType, 
  UniversalSearchBarProps 
} from './UniversalSearchBar';
import { useNavigation } from '@/hooks/useNavigation';
import { UnifiedSearchResult } from '@/types/search';

// Original AlbumSearch Interface
interface AlbumSearchProps {
  className?: string;
  placeholder?: string;
  showResults?: boolean;
}

// Entity Types for Album Search
const albumSearchEntityTypes: SearchEntityType[] = [
  {
    type: 'album',
    displayName: 'Albums',
    icon: <Music className="h-4 w-4" />,
    color: 'blue',
    searchFields: ['title', 'artist', 'year'],
  },
  {
    type: 'artist',
    displayName: 'Artists',
    icon: <User className="h-4 w-4" />,
    color: 'green',
    searchFields: ['name'],
  },
  {
    type: 'label',
    displayName: 'Labels',
    icon: <Building2 className="h-4 w-4" />,
    color: 'purple',
    searchFields: ['name'],
  },
];

// Backward Compatibility Wrapper
export default function AlbumSearchWrapper({
  className = '',
  placeholder = 'Search albums, artists, or genres...',
  showResults = true,
}: AlbumSearchProps) {
  const navigation = useNavigation();

  const handleResultSelect = useCallback(async (result: UnifiedSearchResult) => {
    try {
      if (result.type === 'album') {
        await navigation.navigateToAlbum(result.id, {
          onError: error => {
            console.error(`Failed to navigate to album: ${error.message}`);
          },
        });
      } else if (result.type === 'artist') {
        sessionStorage.setItem(`artist-${result.id}`, JSON.stringify(result));
        await navigation.navigateToArtist(result.id, {
          onError: error => {
            console.error(`Failed to navigate to artist: ${error.message}`);
          },
        });
      } else if (result.type === 'label') {
        sessionStorage.setItem(`label-${result.id}`, JSON.stringify(result));
        await navigation.navigateToLabel(result.id, {
          onError: error => {
            console.error(`Failed to navigate to label: ${error.message}`);
          },
        });
      }
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }, [navigation]);

  const handleError = useCallback((error: Error) => {
    console.error('Search error:', error);
  }, []);

  const universalSearchProps: UniversalSearchBarProps = {
    entityTypes: albumSearchEntityTypes,
    searchType: 'all',
    placeholder,
    showResults,
    className,
    debounceMs: 500,
    minQueryLength: 2,
    enableKeyboardNavigation: true,
    enablePrefetching: true,
    onResultSelect: handleResultSelect,
    onError: handleError,
    context: { 
      page: 'global', 
      mode: 'global' 
    },
  };

  return <UniversalSearchBar {...universalSearchProps} />;
}
