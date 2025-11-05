'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import AlbumImage from '@/components/ui/AlbumImage';

// TODO: make breakpoint (?) for albums to expand vertically if they need to

// Helper function to get color classes based on score
const getScoreColors = (score: number) => {
  if (score >= 10) {
    return {
      heartColor: 'text-red-500 fill-red-500',
      textColor: 'text-red-600',
      bgGradient: 'from-red-50/10 to-pink-50/10',
      borderColor: 'border-red-500/30',
    };
  } else if (score >= 8) {
    return {
      heartColor: 'text-emeraled-green fill-emeraled-green',
      textColor: 'text-emeraled-green',
      bgGradient: 'from-green-50/10 to-emerald-50/10',
      borderColor: 'border-emeraled-green/30',
    };
  } else {
    // 5-7 range (yellow)
    return {
      heartColor: 'text-yellow-500 fill-yellow-500',
      textColor: 'text-yellow-600',
      bgGradient: 'from-yellow-50/10 to-amber-50/10',
      borderColor: 'border-yellow-500/30',
    };
  }
};

interface ActivityItemProps {
  activity: {
    id: string;
    type: 'follow' | 'recommendation' | 'profile_update' | 'collection_add';
    actorId: string;
    actorName: string;
    actorImage: string | null;
    targetId?: string;
    targetName?: string;
    targetImage?: string | null;
    albumId?: string;
    albumTitle?: string;
    albumArtist?: string;
    artistId?: string;
    albumImage?: string | null;
    createdAt: string;
    metadata?: any;
  };
  onAlbumClick?: (albumId: string) => void;
  className?: string;
}

export default function ActivityItem({
  activity,
  onAlbumClick,
  className = '',
}: ActivityItemProps) {
  const getActivityText = () => {
    switch (activity.type) {
      case 'follow':
        return (
          <span>
            followed{' '}
            <Link
              href={`/profile/${activity.targetId}`}
              className='text-emeraled-green hover:text-emeraled-green/80 font-medium'
            >
              {activity.targetName}
            </Link>
          </span>
        );
      case 'recommendation':
        return (
          <>
            recommends{' '}
            <Link
              href={`/albums/${activity.albumId}?source=local`}
              className='text-emeraled-green hover:text-emeraled-green/80 font-semibold transition-colors'
            >
              {activity.albumTitle}
            </Link>{' '}
            by{' '}
            <Link
              href={`/artists/${activity.artistId}`}
              className='text-emeraled-green hover:text-emeraled-green/80 transition-colors'
            >
              {activity.albumArtist}
            </Link>
          </>
        );
      case 'collection_add':
        return (
          <span>
            added{' '}
            <Link
              href={`/albums/${activity.albumId}?source=local`}
              className='text-cosmic-latte hover:text-cosmic-latte/80 font-medium transition-colors'
            >
              {activity.albumTitle}
            </Link>{' '}
            by{' '}
            <Link
              href={`/artists/${activity.artistId}`}
              className='text-zinc-300 hover:text-emeraled-green transition-colors'
            >
              {activity.albumArtist}
            </Link>{' '}
            to collection
            {activity.metadata?.collectionName && (
              <span className='text-emeraled-green font-medium'>
                {' '}
                {activity.metadata.collectionName}
              </span>
            )}
            {activity.metadata?.personalRating && (
              <span className='text-yellow-400 text-sm block mt-1'>
                ★ {activity.metadata.personalRating}/10
              </span>
            )}
          </span>
        );
      case 'profile_update':
        return <span>updated their profile</span>;
      default:
        return <span>did something</span>;
    }
  };

  const handleAlbumClick = () => {
    if (activity.albumId && onAlbumClick) {
      onAlbumClick(activity.albumId);
    }
  };

  return (
    <div
      className={`bg-zinc-900 rounded-lg p-3 pb-8 border border-zinc-800 ${className}`}
    >
      <div className='relative'>
        {/* Header with centered text and avatar */}
        <div className='mb-3'>
          <div className='flex justify-center items-center gap-2'>
            <Link href={`/profile/${activity.actorId}`}>
              <Avatar className='h-6 w-6 hover:opacity-80 transition-opacity cursor-pointer'>
                <AvatarImage
                  src={activity.actorImage || undefined}
                  alt={activity.actorName}
                />
                <AvatarFallback className='bg-zinc-700 text-zinc-200 text-[10px]'>
                  {activity.actorName.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </Link>

            <p className='text-sm text-zinc-400 text-center'>
              <Link
                href={`/profile/${activity.actorId}`}
                className='text-cosmic-latte hover:text-emeraled-green font-medium transition-colors'
              >
                {activity.actorName}
              </Link>{' '}
              {getActivityText()}
            </p>
          </div>
        </div>

        {/* Main content area for albums */}
        <div className='w-full'>
          {/* Recommendation Visual - MASSIVE albums */}
          {activity.type === 'recommendation' && activity.albumImage && (
            <div className='flex justify-center relative'>
              <div className='relative inline-block'>
                {/* Stacked Album Container - EVEN BIGGER */}
                <div className='relative w-[280px] h-[260px] transition-all duration-300 ease-out [&:hover]:w-[420px] [&:hover_.rec-album]:left-[200px] [&:hover_.arrow-indicator]:opacity-100 [&:hover_.basis-text]:opacity-100'>
                  {/* Basis Album (back) */}
                  {activity.metadata?.basisAlbum && (
                    <div
                      className='absolute left-0 top-0 transition-all duration-300 ease-out'
                      onClick={() => {
                        // You could add click handler for basis album if needed
                      }}
                    >
                      <div className='relative'>
                        <AlbumImage
                          src={
                            activity.metadata.basisAlbum.coverArtUrl ||
                            '/placeholder-album.png'
                          }
                          alt={activity.metadata.basisAlbum.title}
                          width={180}
                          height={180}
                          className='w-[180px] h-[180px] rounded-lg shadow-lg border border-zinc-700/50 transition-all'
                        />
                      </div>
                    </div>
                  )}

                  {/* Recommended Album (front) */}
                  <div
                    className='rec-album absolute left-14 top-0 transition-all duration-300 ease-out cursor-pointer hover:scale-105'
                    onClick={handleAlbumClick}
                    title={`View ${activity.albumTitle} by ${activity.albumArtist}`}
                  >
                    <div className='relative'>
                      <AlbumImage
                        src={activity.albumImage}
                        alt={`${activity.albumTitle} by ${activity.albumArtist}`}
                        width={220}
                        height={220}
                        className='w-[220px] h-[220px] rounded-lg shadow-2xl border-2 border-emeraled-green/30 hover:border-emeraled-green/50 transition-all'
                      />
                    </div>
                  </div>

                  {/* Score indicator with heart - visible on hover between albums */}
                  {activity.metadata?.score && (
                    <div className='arrow-indicator absolute left-[155px] top-[75px] opacity-0 transition-all duration-300 z-20'>
                      <div className='bg-zinc-900 border-2 border-zinc-800 rounded-full shadow-lg'>
                        <div
                          className={`flex items-center justify-center w-16 h-16 bg-gradient-to-r ${getScoreColors(activity.metadata.score).bgGradient} rounded-full border-2 ${getScoreColors(activity.metadata.score).borderColor} shadow-md`}
                        >
                          <div className='flex flex-col items-center'>
                            <Heart
                              className={`h-4 w-4 ${getScoreColors(activity.metadata.score).heartColor} drop-shadow-sm mb-0.5`}
                            />
                            <span
                              className={`text-xs font-bold ${getScoreColors(activity.metadata.score).textColor} tabular-nums leading-none`}
                            >
                              {activity.metadata.score}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Basis album text - shows on hover with the albums */}
                  {activity.metadata?.basisAlbum && (
                    <div className='basis-text absolute bottom-0 left-0 w-[420px] opacity-0 transition-opacity duration-300 pointer-events-none'>
                      <p className='text-xs text-zinc-500 text-center w-full px-4 pb-1'>
                        if you like{' '}
                        <span className='text-zinc-400'>
                          {activity.metadata.basisAlbum.title}
                        </span>{' '}
                        by{' '}
                        <span className='text-zinc-400'>
                          {
                            activity.metadata.basisAlbum.artists?.[0]?.artist
                              ?.name
                          }
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Collection Add Visual - EVEN BIGGER */}
          {activity.type === 'collection_add' && activity.albumImage && (
            <div className='flex justify-center'>
              <div className='relative'>
                <div
                  className='cursor-pointer hover:scale-105 transition-transform'
                  onClick={handleAlbumClick}
                  title={`View ${activity.albumTitle} by ${activity.albumArtist}`}
                >
                  <AlbumImage
                    src={activity.albumImage}
                    alt={`${activity.albumTitle} by ${activity.albumArtist}`}
                    width={220}
                    height={220}
                    className='w-[220px] h-[220px] rounded-lg border-2 border-zinc-700 hover:border-cosmic-latte/50 transition-all shadow-xl'
                  />
                </div>
                {activity.metadata?.personalRating && (
                  <div className='absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-zinc-900 border border-cosmic-latte/30 rounded-full px-2 py-0.5'>
                    <span className='text-[10px] text-cosmic-latte font-medium'>
                      {activity.metadata.personalRating}/10
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Follow Target Avatar - EVEN BIGGER to match album size */}
          {activity.type === 'follow' && activity.targetImage && (
            <div className='flex justify-center'>
              <Link href={`/profile/${activity.targetId}`}>
                <Avatar className='h-[220px] w-[220px] hover:opacity-80 hover:scale-105 transition-all cursor-pointer border-2 border-emeraled-green/30'>
                  <AvatarImage
                    src={activity.targetImage}
                    alt={activity.targetName || 'User'}
                  />
                  <AvatarFallback className='bg-zinc-700 text-zinc-200 text-4xl'>
                    {activity.targetName?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
