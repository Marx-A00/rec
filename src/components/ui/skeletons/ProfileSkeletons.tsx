import { Music } from 'lucide-react';

import AlbumImage from '../AlbumImage';

interface ProfileSkeletonProps {
  showCollection?: boolean;
  showRecommendations?: boolean;
  albumCount?: number;
  recommendationCount?: number;
  isOwnProfile?: boolean;
  className?: string;
}

const Shimmer = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse bg-zinc-800 rounded ${className}`} />
);

function ProfileRecommendationCardSkeleton() {
  return (
    <div className='bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-4'>
      {/* Recommendation header */}
      <div className='flex items-center gap-3'>
        <Shimmer className='w-8 h-8 rounded-full' />
        <div className='space-y-2 flex-1'>
          <Shimmer className='h-4 w-24' />
          <Shimmer className='h-3 w-16' />
        </div>
        <Shimmer className='h-6 w-16 rounded-full' />
      </div>

      {/* Basis and recommended albums */}
      <div className='grid grid-cols-2 gap-4'>
        {/* Basis Album */}
        <div className='space-y-2'>
          <Shimmer className='h-3 w-16' />
          <div className='aspect-square bg-zinc-800 rounded border border-zinc-700 flex items-center justify-center'>
            <Music className='w-8 h-8 text-zinc-600' />
          </div>
          <div className='space-y-1'>
            <Shimmer className='h-3 w-full' />
            <Shimmer className='h-3 w-3/4' />
          </div>
        </div>

        {/* Recommended Album */}
        <div className='space-y-2'>
          <Shimmer className='h-3 w-20' />
          <div className='aspect-square bg-zinc-800 rounded border border-zinc-700 flex items-center justify-center'>
            <Music className='w-8 h-8 text-zinc-600' />
          </div>
          <div className='space-y-1'>
            <Shimmer className='h-3 w-full' />
            <Shimmer className='h-3 w-2/3' />
          </div>
        </div>
      </div>

      {/* Score and notes */}
      <div className='space-y-2'>
        <Shimmer className='h-4 w-20' />
        <Shimmer className='h-3 w-full' />
        <Shimmer className='h-3 w-4/5' />
      </div>
    </div>
  );
}

export function ProfileSkeleton({
  showCollection = true,
  showRecommendations = true,
  albumCount = 12,
  recommendationCount = 6,
  isOwnProfile = false,
  className = '',
}: ProfileSkeletonProps) {
  return (
    <div className={`min-h-screen bg-black text-white ${className}`}>
      <div className='container mx-auto px-4 py-8'>
        {/* Header with back button */}
        <div className='mb-8'>
          <Shimmer className='h-5 w-16' />
        </div>

        {/* Profile Header */}
        <div className='max-w-4xl mx-auto'>
          <div className='flex flex-col md:flex-row items-center md:items-start gap-8 mb-12'>
            {/* Avatar */}
            <Shimmer className='w-32 h-32 rounded-full border-2 border-zinc-800' />

            <div className='text-center md:text-left flex-1'>
              <div className='flex flex-col md:flex-row md:items-start md:justify-between gap-4'>
                <div>
                  {/* Name and username */}
                  <Shimmer className='h-10 w-48 mb-2' />
                  <Shimmer className='h-6 w-32 mb-4' />
                </div>

                {/* Action button (Follow or Settings) */}
                <div className='flex-shrink-0'>
                  {isOwnProfile ? (
                    <Shimmer className='h-9 w-9 rounded-lg' />
                  ) : (
                    <Shimmer className='h-9 w-20 rounded-lg' />
                  )}
                </div>
              </div>

              {/* Bio */}
              <div className='mb-6 max-w-md space-y-2'>
                <Shimmer className='h-4 w-full' />
                <Shimmer className='h-4 w-3/4' />
              </div>

              {/* Stats */}
              <div className='flex justify-center md:justify-start gap-6 text-sm mb-6'>
                <Shimmer className='h-4 w-16' />
                <Shimmer className='h-4 w-16' />
                <Shimmer className='h-4 w-20' />
              </div>

              {/* Action Buttons */}
              <div className='flex flex-col sm:flex-row gap-3'>
                <Shimmer className='h-10 w-48' />
              </div>
              <Shimmer className='h-3 w-40 mt-1' />
            </div>
          </div>

          {/* Collection Section */}
          {showCollection && (
            <section className='border-t border-zinc-800 pt-8'>
              <div className='flex items-center justify-between mb-6'>
                <Shimmer className='h-8 w-48' />
              </div>

              {/* Collection Stats */}
              <div className='mb-6'>
                <Shimmer className='h-4 w-32' />
              </div>

              {/* Album Grid using AlbumImage loading states */}
              <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4'>
                {Array.from({ length: albumCount }).map((_, index) => (
                  <div
                    key={index}
                    className='relative group cursor-pointer transform transition-all duration-200'
                    style={{
                      animationDelay: `${index * 50}ms`,
                    }}
                  >
                    <AlbumImage
                      src={null}
                      alt='Loading album'
                      width={128}
                      height={128}
                      className='w-full aspect-square rounded object-cover border border-zinc-800'
                      showSkeleton={true}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Recommendations Section */}
          {showRecommendations && (
            <section className='border-t border-zinc-800 pt-8 mt-8'>
              <div className='flex items-center justify-between mb-6'>
                <Shimmer className='h-8 w-56' />
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                {Array.from({ length: recommendationCount }).map((_, index) => (
                  <div
                    key={index}
                    style={{
                      animationDelay: `${index * 100}ms`,
                    }}
                  >
                    <ProfileRecommendationCardSkeleton />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
