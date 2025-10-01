// src/components/dashboard/panels/RecentlyPlayedPanel.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Play, Clock } from 'lucide-react';

import { PanelComponentProps } from '@/types/mosaic';
import AlbumImage from '@/components/ui/AlbumImage';

interface RecentlyPlayedAlbum {
  id: string;
  title: string;
  artist: string;
  imageUrl?: string;
  playedAt: string;
}

export default function RecentlyPlayedPanel({
  panelId,
  config,
  isEditMode,
}: PanelComponentProps) {
  const { data: session } = useSession();
  const user = session?.user;
  const [recentlyPlayed, setRecentlyPlayed] = useState<RecentlyPlayedAlbum[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);

  // Fetch recently played albums
  useEffect(() => {
    if (user && !isEditMode) {
      const fetchRecentlyPlayed = async () => {
        setIsLoading(true);
        try {
          // TODO: Replace with actual API call
          // Simulated data for now
          setTimeout(() => {
            const mockData: RecentlyPlayedAlbum[] = [
              {
                id: '1',
                title: 'Random Access Memories',
                artist: 'Daft Punk',
                imageUrl: '/demo-albums/RAM-daft-punk.jpeg',
                playedAt: '2 hours ago',
              },
              {
                id: '2',
                title: 'Discovery',
                artist: 'Daft Punk',
                imageUrl: '/demo-albums/discovery-daft-punk.jpg',
                playedAt: '1 day ago',
              },
              {
                id: '3',
                title: 'Reflections',
                artist: 'Hannah Diamond',
                imageUrl: '/reflections-hannah-diamond.webp',
                playedAt: '2 days ago',
              },
              {
                id: '4',
                title: 'BRAT',
                artist: 'Charli XCX',
                imageUrl: '/Charli_XCX_-_Brat_(album_cover).png',
                playedAt: '3 days ago',
              },
            ];
            setRecentlyPlayed(mockData.slice(0, 6)); // Limit to 6 items
            setIsLoading(false);
          }, 800);
        } catch (error) {
          console.error('Error fetching recently played:', error);
          setIsLoading(false);
        }
      };

      fetchRecentlyPlayed();
    }
  }, [user, isEditMode]);

  // Show preview content in edit mode
  if (isEditMode) {
    return (
      <div className='bg-zinc-900/50 p-6 h-full overflow-hidden'>
        <div className='h-full flex flex-col'>
          <div className='mb-3 flex-shrink-0'>
            <p className='text-sm text-zinc-400 mb-2'>Panel Preview</p>
            <h2 className='text-lg font-semibold text-white'>
              Recently Played
            </h2>
          </div>

          <div className='flex-1 space-y-3'>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className='flex items-center gap-3'>
                <div className='w-12 h-12 bg-zinc-700 rounded animate-pulse flex-shrink-0' />
                <div className='flex-1 space-y-1'>
                  <div className='h-4 bg-zinc-700 rounded animate-pulse' />
                  <div className='h-3 bg-zinc-700 rounded animate-pulse w-2/3' />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='bg-zinc-900/50 p-6 h-full overflow-hidden'>
      {user ? (
        <div className='h-full flex flex-col'>
          <div className='flex-1 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'>
            {isLoading ? (
              <div className='space-y-3'>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className='flex items-center gap-3'>
                    <div className='w-12 h-12 bg-zinc-700 rounded animate-pulse flex-shrink-0' />
                    <div className='flex-1 space-y-1'>
                      <div className='h-4 bg-zinc-700 rounded animate-pulse' />
                      <div className='h-3 bg-zinc-700 rounded animate-pulse w-2/3' />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentlyPlayed.length > 0 ? (
              <div className='space-y-3'>
                {recentlyPlayed.map(album => (
                  <div
                    key={album.id}
                    className='flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 transition-colors cursor-pointer group'
                  >
                    <div className='relative flex-shrink-0'>
                      <AlbumImage
                        src={album.imageUrl}
                        alt={`${album.title} by ${album.artist}`}
                        width={48}
                        height={48}
                        className='w-12 h-12 rounded object-cover border border-zinc-700 group-hover:border-zinc-600 transition-colors'
                      />
                      <div className='absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded flex items-center justify-center'>
                        <Play className='w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity' />
                      </div>
                    </div>

                    <div className='flex-1 min-w-0'>
                      <p className='text-sm font-medium text-white truncate'>
                        {album.title}
                      </p>
                      <p className='text-xs text-zinc-400 truncate'>
                        {album.artist}
                      </p>
                      <div className='flex items-center gap-1 mt-1'>
                        <Clock className='w-3 h-3 text-zinc-500' />
                        <span className='text-xs text-zinc-500'>
                          {album.playedAt}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='text-center py-8'>
                <p className='text-zinc-400 mb-2'>No recently played albums</p>
                <p className='text-xs text-zinc-500'>
                  Your listening history will appear here
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className='h-full flex flex-col items-center justify-center text-center'>
          <Play className='h-12 w-12 text-zinc-600 mb-4' />
          <h3 className='text-lg font-semibold text-white mb-2'>
            Recently Played
          </h3>
          <p className='text-zinc-400 text-sm'>
            Sign in to see your listening history
          </p>
        </div>
      )}
    </div>
  );
}
