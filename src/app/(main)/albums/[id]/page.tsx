'use client';

import {
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  Music,
  Tag,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import AddToCollectionButton from '@/components/collections/AddToCollectionButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Toast, { useToast } from '@/components/ui/toast';
import { useAlbumDetails } from '@/hooks/useAlbumDetails';

export default function AlbumDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const albumId = params.id as string;

  const { data: album, isLoading, error, isError } = useAlbumDetails(albumId);

  const { toast, showToast, hideToast } = useToast();

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatTotalDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const handleArtistClick = async (artistId: string, artistName: string) => {
    if (!artistId) {
      showToast(`Artist ID not available for ${artistName}`, 'error');
      return;
    }
    router.push(`/artists/${artistId}`);
  };

  if (isLoading) {
    return (
      <div className='min-h-screen bg-black text-white'>
        <div className='container mx-auto px-4 py-8'>
          <div className='flex items-center justify-center h-64'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-red-500'></div>
            <span className='ml-3 text-zinc-400'>Loading album details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !album) {
    return (
      <div className='min-h-screen bg-black text-white'>
        <div className='container mx-auto px-4 py-8'>
          <Link
            href='/'
            className='inline-flex items-center text-zinc-400 hover:text-white mb-6 transition-colors'
          >
            <ArrowLeft className='h-4 w-4 mr-2' />
            Back to Search
          </Link>
          <div className='text-center'>
            <h1 className='text-2xl font-bold text-red-500 mb-4'>
              Album Not Found
            </h1>
            <p className='text-zinc-400'>
              {error?.message ||
                String(error) ||
                'The requested album could not be found.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-black text-white'>
      <div className='container mx-auto px-4 py-8'>
        {/* Back Navigation */}
        <Link
          href='/'
          className='inline-flex items-center text-zinc-400 hover:text-white mb-6 transition-colors'
        >
          <ArrowLeft className='h-4 w-4 mr-2' />
          Back to Search
        </Link>

        {/* Album Header */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8'>
          {/* Album Cover */}
          <div className='lg:col-span-1'>
            <div className='relative aspect-square w-full max-w-md mx-auto'>
              {album.image?.url ? (
                <Image
                  src={album.image.url}
                  alt={album.image.alt || `${album.title} cover`}
                  fill
                  className='object-cover rounded-lg shadow-2xl'
                  sizes='(max-width: 768px) 100vw, 400px'
                  priority
                />
              ) : (
                <div className='w-full h-full bg-zinc-800 rounded-lg flex items-center justify-center'>
                  <Music className='h-24 w-24 text-zinc-600' />
                </div>
              )}
            </div>
          </div>

          {/* Album Info */}
          <div className='lg:col-span-2 space-y-6'>
            <div>
              <h1 className='text-4xl font-bold mb-2'>{album.title}</h1>
              <div className='flex flex-wrap items-center gap-2'>
                {album.artists?.map((artist, index) => (
                  <span key={artist.id || index}>
                    <button
                      onClick={() => handleArtistClick(artist.id, artist.name)}
                      className='text-2xl text-zinc-300 hover:text-white hover:underline transition-colors cursor-pointer'
                    >
                      {artist.name}
                    </button>
                    {index < (album.artists?.length || 0) - 1 && (
                      <span className='text-zinc-500 mx-1'>,</span>
                    )}
                  </span>
                )) || (
                  <span className='text-2xl text-zinc-300'>Unknown Artist</span>
                )}
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {album.releaseDate && (
                <div className='flex items-center space-x-2'>
                  <Calendar className='h-5 w-5 text-zinc-400' />
                  <span className='text-zinc-300'>
                    Released: {album.releaseDate}
                  </span>
                </div>
              )}

              {album.label && (
                <div className='flex items-center space-x-2'>
                  <Building2 className='h-5 w-5 text-zinc-400' />
                  <span className='text-zinc-300'>Label: {album.label}</span>
                </div>
              )}

              {album.metadata?.totalDuration &&
                album.metadata.totalDuration > 0 && (
                  <div className='flex items-center space-x-2'>
                    <Clock className='h-5 w-5 text-zinc-400' />
                    <span className='text-zinc-300'>
                      Duration:{' '}
                      {formatTotalDuration(album.metadata.totalDuration)}
                    </span>
                  </div>
                )}

              {album.metadata?.numberOfTracks &&
                album.metadata.numberOfTracks > 0 && (
                  <div className='flex items-center space-x-2'>
                    <Music className='h-5 w-5 text-zinc-400' />
                    <span className='text-zinc-300'>
                      {album.metadata.numberOfTracks} tracks
                    </span>
                  </div>
                )}

              {album.metadata?.format && (
                <div className='flex items-center space-x-2'>
                  <Tag className='h-5 w-5 text-zinc-400' />
                  <span className='text-zinc-300'>
                    Format: {album.metadata.format}
                  </span>
                </div>
              )}
            </div>

            {album.genre && album.genre.length > 0 && (
              <div>
                <h3 className='text-lg font-semibold mb-2'>Genres</h3>
                <div className='flex flex-wrap gap-2'>
                  {album.genre.map((genre, index) => (
                    <span
                      key={index}
                      className='bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full text-sm'
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className='flex flex-wrap gap-4 mb-8 justify-center lg:justify-start'>
          <button className='bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors'>
            Make Rec
          </button>
          <AddToCollectionButton
            album={album}
            onSuccess={(message: string) => showToast(message, 'success')}
            onError={(message: string) => showToast(message, 'error')}
          />
          <button className='bg-zinc-700 hover:bg-zinc-600 text-white px-6 py-3 rounded-lg font-medium transition-colors'>
            Other
          </button>
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue='tracklist' className='w-full'>
          <TabsList className='grid w-full grid-cols-4 bg-zinc-900'>
            <TabsTrigger
              value='tracklist'
              className='data-[state=active]:bg-zinc-700'
            >
              Tracklist
            </TabsTrigger>
            <TabsTrigger
              value='recommendations'
              className='data-[state=active]:bg-zinc-700'
            >
              Recommendations
            </TabsTrigger>
            <TabsTrigger
              value='reviews'
              className='data-[state=active]:bg-zinc-700'
            >
              Reviews
            </TabsTrigger>
            <TabsTrigger
              value='similar'
              className='data-[state=active]:bg-zinc-700'
            >
              Similar Albums
            </TabsTrigger>
          </TabsList>

          <TabsContent value='tracklist' className='mt-6'>
            <div className='bg-zinc-900 rounded-lg p-6'>
              <h3 className='text-xl font-semibold mb-4'>Track Listing</h3>
              {album.tracks && album.tracks.length > 0 ? (
                <div className='space-y-2'>
                  {album.tracks.map(track => (
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
          </TabsContent>

          <TabsContent value='recommendations' className='mt-6'>
            <div className='bg-zinc-900 rounded-lg p-6'>
              <h3 className='text-xl font-semibold mb-4'>Recommendations</h3>
              <p className='text-zinc-400'>
                Recommendations based on this album will appear here. This
                feature is coming soon!
              </p>
            </div>
          </TabsContent>

          <TabsContent value='reviews' className='mt-6'>
            <div className='bg-zinc-900 rounded-lg p-6'>
              <h3 className='text-xl font-semibold mb-4'>User Reviews</h3>
              <p className='text-zinc-400'>
                User reviews and ratings for this album will appear here. This
                feature is coming soon!
              </p>
            </div>
          </TabsContent>

          <TabsContent value='similar' className='mt-6'>
            <div className='bg-zinc-900 rounded-lg p-6'>
              <h3 className='text-xl font-semibold mb-4'>Similar Albums</h3>
              <p className='text-zinc-400'>
                Albums similar to this one will appear here. This feature is
                coming soon!
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Toast Notification */}
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={hideToast}
        />
      </div>
    </div>
  );
}
