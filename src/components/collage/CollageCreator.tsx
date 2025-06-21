'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Download, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useCollageGenerator } from '@/hooks/useCollageGenerator';

import AlbumSelector from './AlbumSelector';
import CollageDownloader from './CollageDownloader';
import CollageGrid from './CollageGrid';
import { sanitizeArtistName } from '@/lib/utils';

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

  const [isGenerating, setIsGenerating] = useState(false);

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

  const handleDownload = async () => {
    setIsGenerating(true);
    // Download logic here
    setTimeout(() => setIsGenerating(false), 2000);
  };

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
            <div className='flex items-center justify-between mb-4'>
              <h3 className='font-semibold text-white'>
                Selected Albums ({selectedCount}/{25})
              </h3>
              {selectedCount > 0 && (
                <Button
                  variant='outline'
                  size='sm'
                  onClick={clearGrid}
                  className='text-red-400 border-red-400 hover:bg-red-400/10'
                >
                  <RotateCcw className='h-4 w-4 mr-2' />
                  Clear All
                </Button>
              )}
            </div>

            {selectedCount > 0 ? (
              <div className='space-y-2 max-h-48 overflow-y-auto'>
                {selectedAlbums.map((album, index) => (
                  <div
                    key={album.id}
                    className='flex items-center justify-between p-2 bg-zinc-800 rounded-lg'
                  >
                    <div className='flex items-center space-x-3'>
                      <span className='text-zinc-400 text-sm font-mono'>
                        {index + 1}.
                      </span>
                      <div>
                        <p className='text-white text-sm font-medium'>
                          {album.title}
                        </p>
                        <p className='text-zinc-400 text-xs'>
                          {sanitizeArtistName(
                            album.artists?.[0]?.name || 'Unknown Artist'
                          )}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => removeAlbumFromGrid(index)}
                      className='text-zinc-400 hover:text-red-400'
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className='text-zinc-400 text-center py-8'>
                No albums selected. Choose albums to create your collage.
              </p>
            )}
          </div>

          {/* Generate Button */}
          {selectedCount > 0 && (
            <Button
              onClick={handleDownload}
              disabled={isGenerating}
              className='w-full bg-blue-600 hover:bg-blue-700'
            >
              <Download className='h-4 w-4 mr-2' />
              {isGenerating ? 'Generating...' : 'Generate Collage'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
