'use client';

import Link from 'next/link';
import { Music } from 'lucide-react';

import AlbumImage from '@/components/ui/AlbumImage';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAlbumRecommendations } from '@/hooks/useAlbumRecommendations';
import { cn } from '@/lib/utils';

interface MobileAlbumRecommendationsProps {
  albumId: string;
  albumTitle: string;
  albumArtist: string;
  albumImageUrl: string | null;
  className?: string;
}

export default function MobileAlbumRecommendations({
  albumId,
  albumTitle: _albumTitle,
  albumArtist: _albumArtist,
  albumImageUrl: _albumImageUrl,
  className,
}: MobileAlbumRecommendationsProps) {
  const { data, isLoading, isError } = useAlbumRecommendations({
    albumId,
    perPage: 10,
  });

  const recommendations = data?.recommendations || [];

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('overflow-x-auto -mx-4 px-4', className)}>
        <div className='flex gap-3'>
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className='flex-shrink-0 w-[140px] bg-zinc-900 rounded-lg p-3 border border-zinc-800 animate-pulse'
            >
              <div className='w-full aspect-square bg-zinc-800 rounded-md mb-2' />
              <div className='h-4 w-3/4 bg-zinc-800 rounded mb-1' />
              <div className='h-3 w-1/2 bg-zinc-800 rounded' />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div
        className={cn(
          'bg-zinc-900 rounded-lg p-4 border border-zinc-800 text-center',
          className
        )}
      >
        <p className='text-sm text-zinc-500'>Failed to load recommendations</p>
      </div>
    );
  }

  // Empty state
  if (recommendations.length === 0) {
    return (
      <div
        className={cn(
          'bg-zinc-900 rounded-lg p-6 border border-zinc-800 text-center',
          className
        )}
      >
        <Music className='h-8 w-8 text-zinc-600 mx-auto mb-2' />
        <p className='text-sm text-zinc-400 mb-1'>No recommendations yet</p>
        <p className='text-xs text-zinc-500'>
          Be the first to recommend something!
        </p>
      </div>
    );
  }

  return (
    <div className={cn('overflow-x-auto -mx-4 px-4', className)}>
      <div className='flex gap-3 pb-2'>
        {recommendations.map(rec => {
          // Determine which album to show (the "other" album in the pairing)
          const displayAlbum = rec.otherAlbum;
          const isSource = rec.albumRole === 'basis';

          return (
            <Link
              key={rec.id}
              href={`/m/albums/${displayAlbum.discogsId}?source=local`}
              className='flex-shrink-0 w-[140px] bg-zinc-900 rounded-lg p-3 border border-zinc-800 active:scale-[0.98] transition-transform'
            >
              {/* Album Cover */}
              <div className='relative w-full aspect-square mb-2'>
                <AlbumImage
                  src={displayAlbum.imageUrl || undefined}
                  cloudflareImageId={displayAlbum.cloudflareImageId}
                  alt={displayAlbum.title}
                  width={116}
                  height={116}
                  className='w-full h-full object-cover rounded-md'
                  fallbackIcon={<Music className='h-6 w-6 text-zinc-600' />}
                />

                {/* Score badge */}
                <div className='absolute -top-1 -right-1 bg-zinc-900 border border-cosmic-latte/50 rounded-full w-6 h-6 flex items-center justify-center'>
                  <span className='text-[10px] text-cosmic-latte font-bold'>
                    {rec.score}
                  </span>
                </div>
              </div>

              {/* Album Info */}
              <p className='text-sm font-medium text-white truncate'>
                {displayAlbum.title}
              </p>
              <p className='text-xs text-zinc-400 truncate'>
                {displayAlbum.artist}
              </p>

              {/* User who made the rec */}
              <div className='flex items-center gap-1.5 mt-2'>
                <Avatar className='h-4 w-4'>
                  <AvatarImage
                    src={rec.user.image || undefined}
                    alt={rec.user.username || 'User'}
                  />
                  <AvatarFallback className='bg-zinc-700 text-[8px]'>
                    {rec.user.username?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className='text-[10px] text-zinc-500 truncate'>
                  {rec.user.username}
                </span>
              </div>

              {/* Relationship indicator */}
              <p className='text-[10px] text-zinc-600 mt-1'>
                {isSource ? 'If you like this, try...' : 'Based on this album'}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
