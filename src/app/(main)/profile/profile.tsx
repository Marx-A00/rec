'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CollectionAlbum } from '@/types/collection';
import { Recommendation } from '@/types/recommendation';

interface ProfileClientProps {
  user: {
    name: string;
    email: string | null;
    image: string;
    username: string;
    bio: string;
  };
  collection: CollectionAlbum[];
  recommendations: Recommendation[];
  isOwnProfile: boolean;
}

export default function ProfileClient({
  user,
  collection,
  recommendations,
  isOwnProfile,
}: ProfileClientProps) {
  // Flatten collections to get all albums
  const allAlbums = collection;

  // Add state for the selected album and exit animation
  const [selectedAlbum, setSelectedAlbum] = useState<CollectionAlbum | null>(
    null
  );
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setSelectedAlbum(null);
      setIsExiting(false);
    }, 300); // Match the animation duration
  };

  // Add escape key listener
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedAlbum) {
        handleClose();
      }
    };

    if (selectedAlbum) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [selectedAlbum]);

  return (
    <div className='min-h-screen bg-black text-white'>
      {/* Album Modal/Overlay */}
      {selectedAlbum && (
        <div
          className={`fixed inset-0 bg-black flex items-center justify-center z-50 p-4 transition-all duration-300 ${
            isExiting ? 'bg-opacity-0' : 'bg-opacity-90'
          }`}
          onClick={handleClose}
        >
          <div
            className={`flex flex-col lg:flex-row items-center lg:items-start gap-8 max-w-4xl w-full transition-all duration-300 relative ${
              isExiting
                ? 'opacity-0 scale-95 translate-y-4'
                : 'opacity-100 scale-100 translate-y-0'
            }`}
            onClick={e => e.stopPropagation()}
          >
            {/* Close X button */}
            <button
              onClick={handleClose}
              className='absolute -top-2 -right-2 z-60 text-cosmic-latte hover:text-white transition-all duration-200 hover:scale-110'
            >
              <svg
                className='w-6 h-6'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M6 18L18 6M6 6l12 12'
                />
              </svg>
            </button>

            {/* Zoomed Album Cover */}
            <div className='flex-shrink-0'>
              <Image
                src={selectedAlbum.albumImageUrl || '/placeholder.svg'}
                alt={selectedAlbum.albumTitle}
                width={400}
                height={400}
                className='w-80 h-80 lg:w-96 lg:h-96 rounded-lg object-cover border-2 border-zinc-700 shadow-2xl'
              />
            </div>

            {/* Album Details */}
            <div className='flex-1 text-center lg:text-left'>
              <h2 className='text-3xl lg:text-4xl font-bold text-cosmic-latte mb-2'>
                {selectedAlbum.albumTitle}
              </h2>
              <p className='text-xl text-zinc-300 mb-4'>
                {selectedAlbum.albumArtist}
              </p>

              <div className='space-y-3 mb-6'>
                {selectedAlbum.albumYear && (
                  <p className='text-zinc-400'>
                    <span className='text-cosmic-latte font-medium'>
                      Released:
                    </span>{' '}
                    {selectedAlbum.albumYear}
                  </p>
                )}
                <p className='text-zinc-400'>
                  <span className='text-cosmic-latte font-medium'>Added:</span>{' '}
                  {new Date(selectedAlbum.addedAt).toLocaleDateString()}
                </p>
                {selectedAlbum.personalRating && (
                  <p className='text-zinc-400'>
                    <span className='text-cosmic-latte font-medium'>
                      Personal Rating:
                    </span>
                    <span className='text-emeraled-green ml-2'>
                      ★ {selectedAlbum.personalRating}/10
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className='container mx-auto px-4 py-8'>
        {/* Header with back navigation */}
        <div className='mb-8'>
          <Link
            href='/browse'
            className='inline-flex items-center text-cosmic-latte hover:text-emeraled-green transition-colors mb-4'
          >
            ← Back to Browse
          </Link>
        </div>

        {/* Profile Header */}
        <div className='max-w-4xl mx-auto'>
          <div className='flex flex-col md:flex-row items-center md:items-start gap-8 mb-12'>
            <Avatar className='w-32 h-32 border-2 border-zinc-800'>
              <AvatarImage src={user.image} alt={user.name} />
              <AvatarFallback className='bg-zinc-800 text-cosmic-latte text-2xl'>
                {user.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className='text-center md:text-left'>
              <h1 className='text-4xl font-bold mb-2 text-cosmic-latte'>
                {user.name}
              </h1>
              <p className='text-zinc-400 mb-4 text-lg'>{user.username}</p>
              {isOwnProfile && (
                <div className='mb-4 px-3 py-1 bg-emeraled-green text-black text-sm font-medium rounded-full inline-block'>
                  👋 This is your profile
                </div>
              )}
              <p className='mb-6 max-w-md text-zinc-300'>{user.bio}</p>
              <div className='flex justify-center md:justify-start gap-6 text-sm'>
                <span className='text-zinc-300'>
                  <strong className='text-cosmic-latte'>0</strong> Followers
                </span>
                <span className='text-zinc-300'>
                  <strong className='text-cosmic-latte'>0</strong> Following
                </span>
              </div>

              {/* Create Album Collage Button */}
              <div className='mt-6'>
                <Link href='/profile/collage'>
                  <button
                    disabled
                    className='bg-gray-500 text-black font-semibold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    🎵 Create Album Collage
                  </button>
                </Link>
                <p className='text-xs text-zinc-500 mt-1'>
                  * feature coming soon!
                </p>
              </div>
            </div>
          </div>

          {/* Collection Section */}
          <section className='border-t border-zinc-800 pt-8'>
            <h2 className='text-2xl font-semibold mb-6 text-cosmic-latte'>
              Record Collection
            </h2>
            {allAlbums.length > 0 ? (
              <div>
                {/* Collection Stats */}
                <div className='mb-6 text-sm text-zinc-400'>
                  <p>{allAlbums.length} albums in collection</p>
                </div>

                {/* Album Grid */}
                <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4'>
                  {allAlbums.map(collectionAlbum => (
                    <div
                      key={collectionAlbum.id}
                      className='relative group cursor-pointer transform transition-all duration-200 hover:scale-105 hover:z-10'
                      onClick={() => setSelectedAlbum(collectionAlbum)}
                    >
                      <Image
                        src={
                          collectionAlbum.albumImageUrl || '/placeholder.svg'
                        }
                        alt={collectionAlbum.albumTitle}
                        width={128}
                        height={128}
                        className='w-full aspect-square rounded object-cover border border-zinc-800 group-hover:border-zinc-600 transition-colors'
                      />
                      <div className='absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-70 transition-all duration-200 rounded flex items-center justify-center'>
                        <div className='opacity-0 group-hover:opacity-100 text-cosmic-latte text-xs text-center p-2 transform translate-y-2 group-hover:translate-y-0 transition-all duration-200'>
                          <p className='font-medium truncate mb-1'>
                            {collectionAlbum.albumTitle}
                          </p>
                          <p className='text-zinc-300 truncate mb-1'>
                            {collectionAlbum.albumArtist}
                          </p>
                          {collectionAlbum.personalRating && (
                            <p className='text-emeraled-green text-xs'>
                              ★ {collectionAlbum.personalRating}/10
                            </p>
                          )}
                          <p className='text-zinc-400 text-xs mt-1'>
                            Click to view
                          </p>
                        </div>
                      </div>
                      {/* Added date indicator */}
                      <div className='absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity'>
                        <span className='text-xs bg-black bg-opacity-75 text-zinc-300 px-1 py-0.5 rounded'>
                          {new Date(collectionAlbum.addedAt).getFullYear()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className='text-center py-12'>
                <p className='text-zinc-400 mb-4'>
                  No albums in collection yet.
                </p>
                <p className='text-sm text-zinc-500'>
                  This user hasn&apos;t added any albums to their record
                  collection.
                </p>
              </div>
            )}
          </section>

          {/* Recommendations Section */}
          <section className='border-t border-zinc-800 pt-8 mt-8'>
            <h2 className='text-2xl font-semibold mb-6 text-cosmic-latte'>
              Music Recommendations
            </h2>
            {recommendations.length > 0 ? (
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                {recommendations.map(rec => (
                  <div
                    key={rec.id}
                    className='bg-zinc-900 rounded-lg p-6 border border-zinc-800 hover:border-zinc-700 transition-colors'
                  >
                    {/* Recommendation Header */}
                    <div className='mb-4'>
                      <div className='flex items-center justify-between mb-3'>
                        <h3 className='text-lg font-semibold text-cosmic-latte'>
                          Music Recommendation
                        </h3>
                        <div className='flex items-center space-x-2'>
                          <span className='text-sm bg-emeraled-green text-black px-2 py-1 rounded-full font-medium'>
                            ★ {rec.score}/10
                          </span>
                        </div>
                      </div>
                      <p className='text-xs text-zinc-500'>
                        {new Date(rec.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Albums Comparison */}
                    <div className='space-y-4'>
                      {/* Basis Album */}
                      <div>
                        <p className='text-xs text-zinc-400 mb-2 uppercase tracking-wide'>
                          If you like
                        </p>
                        <div className='flex items-center space-x-3 bg-zinc-800 rounded-lg p-3'>
                          <Image
                            src={
                              rec.basisAlbumImageUrl ||
                              '/placeholder.svg?height=400&width=400'
                            }
                            alt={rec.basisAlbumTitle}
                            width={48}
                            height={48}
                            className='w-12 h-12 rounded object-cover'
                          />
                          <div className='flex-1 min-w-0'>
                            <p className='text-cosmic-latte font-medium truncate'>
                              {rec.basisAlbumTitle}
                            </p>
                            <p className='text-zinc-400 text-sm truncate'>
                              {rec.basisAlbumArtist}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className='flex justify-center'>
                        <div className='text-emeraled-green text-xl'>↓</div>
                      </div>

                      {/* Recommended Album */}
                      <div>
                        <p className='text-xs text-zinc-400 mb-2 uppercase tracking-wide'>
                          Then try
                        </p>
                        <div className='flex items-center space-x-3 bg-zinc-800 rounded-lg p-3'>
                          <Image
                            src={
                              rec.recommendedAlbumImageUrl ||
                              '/placeholder.svg?height=400&width=400'
                            }
                            alt={rec.recommendedAlbumTitle}
                            width={48}
                            height={48}
                            className='w-12 h-12 rounded object-cover'
                          />
                          <div className='flex-1 min-w-0'>
                            <p className='text-cosmic-latte font-medium truncate'>
                              {rec.recommendedAlbumTitle}
                            </p>
                            <p className='text-zinc-400 text-sm truncate'>
                              {rec.recommendedAlbumArtist}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='text-center py-12'>
                <p className='text-zinc-400 mb-4'>
                  No recommendations created yet.
                </p>
                <p className='text-sm text-zinc-500'>
                  This user hasn&apos;t shared any music recommendations.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
