'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { useCollageGenerator } from '@/hooks/useCollageGenerator';

import AlbumSelector from './AlbumSelector';
import CollageDownloader from './CollageDownloader';
import CollageGrid from './CollageGrid';

export default function CollageCreator() {
  const router = useRouter();
  const {
    selectedAlbums,
    userCollection,
    searchResults,
    searchQuery,
    isSearching,
    addAlbumToGrid,
    removeAlbumFromGrid,
    clearGrid,
    setSearchQuery,
    setSearchResults,
    setIsSearching,
    setUserCollection,
  } = useCollageGenerator();

  // Fetch user's collection on mount
  useEffect(() => {
    const fetchUserCollection = async () => {
      try {
        const response = await fetch('/api/collections/user/albums');
        const data = await response.json();
        setUserCollection(data.albums || []);
      } catch (error) {
        console.error('Error fetching user collection:', error);
      }
    };

    fetchUserCollection();
  }, [setUserCollection]);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/albums/search?query=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      setSearchResults(data.albums || []);
    } catch (error) {
      console.error('Error searching albums:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const selectedCount = selectedAlbums.filter(album => album !== null).length;

  return (
    <div className='container mx-auto px-4 py-8'>
      {/* Header */}
      <div className='flex items-center justify-between mb-8'>
        <div className='flex items-center gap-4'>
          <Button
            variant='ghost'
            onClick={() => router.back()}
            className='text-cosmic-latte hover:text-emeraled-green'
          >
            ← Back
          </Button>
          <h1 className='text-3xl font-bold text-cosmic-latte'>
            Create Album Collage
          </h1>
        </div>

        <div className='flex items-center gap-4'>
          <span className='text-zinc-400 text-sm'>
            {selectedCount}/25 albums selected
          </span>
          <Button
            variant='outline'
            onClick={clearGrid}
            disabled={selectedCount === 0}
            className='border-zinc-700 text-zinc-300 hover:bg-zinc-800'
          >
            Clear All
          </Button>
          <CollageDownloader
            selectedAlbums={selectedAlbums}
            disabled={selectedCount === 0}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className='grid grid-cols-1 lg:grid-cols-5 gap-8'>
        {/* Left Panel - Album Selection */}
        <div className='lg:col-span-2'>
          <AlbumSelector
            userCollection={userCollection}
            searchResults={searchResults}
            searchQuery={searchQuery}
            isSearching={isSearching}
            onAlbumSelect={addAlbumToGrid}
            onSearch={handleSearch}
            onSearchQueryChange={setSearchQuery}
          />
        </div>

        {/* Right Panel - Grid and List */}
        <div className='lg:col-span-3'>
          <CollageGrid
            selectedAlbums={selectedAlbums}
            onRemoveAlbum={removeAlbumFromGrid}
          />

          {/* Selected Albums List */}
          <div className='mt-8'>
            <h3 className='text-xl font-semibold text-cosmic-latte mb-4'>
              Selected Albums ({selectedCount}/25)
            </h3>
            <div className='bg-zinc-900 rounded-lg p-4 max-h-64 overflow-y-auto'>
              {selectedCount === 0 ? (
                <p className='text-zinc-500 text-center py-4'>
                  No albums selected yet. Click on albums to add them to your
                  collage.
                </p>
              ) : (
                <div className='space-y-2'>
                  {selectedAlbums.map((album, index) =>
                    album ? (
                      <div
                        key={index}
                        className='flex items-center justify-between text-sm'
                      >
                        <span className='text-cosmic-latte'>
                          {index + 1}. {album.artists?.[0]?.name} -{' '}
                          {album.title}
                        </span>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => removeAlbumFromGrid(index)}
                          className='text-red-400 hover:text-red-300 hover:bg-red-900/20'
                        >
                          ×
                        </Button>
                      </div>
                    ) : null
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
