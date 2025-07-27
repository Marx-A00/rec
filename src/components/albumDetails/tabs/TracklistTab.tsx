// src/components/albumDetails/tabs/TracklistTab.tsx
'use client';

import { Track } from '@/types/album';

interface TracklistTabProps {
  tracks: Track[];
}

export default function TracklistTab({ tracks }: TracklistTabProps) {
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className='bg-zinc-900 rounded-lg p-6'>
      <h3 className='text-xl font-semibold mb-4 text-white'>
        Track Listing
      </h3>
      {tracks && tracks.length > 0 ? (
        <div className='space-y-2'>
          {tracks.map(track => (
            <div
              key={track.id}
              className='flex items-center justify-between p-3 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors'
            >
              <div className='flex items-center space-x-3'>
                <span className='text-zinc-400 text-sm w-8'>
                  {track.trackNumber}
                </span>
                <span className='text-white'>{track.title}</span>
              </div>
              {track.duration > 0 && (
                <span className='text-zinc-400 text-sm'>
                  {formatDuration(track.duration)}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className='text-zinc-400'>No track information available.</p>
      )}
    </div>
  );
}