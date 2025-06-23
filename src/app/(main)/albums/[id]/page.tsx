import { Building2, Calendar, Clock, Music, Tag } from 'lucide-react';
import { notFound } from 'next/navigation';

import AlbumImage from '@/components/ui/AlbumImage';
import AlbumInteractions from '@/components/albums/AlbumInteractions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BackButton from '@/components/ui/BackButton';
import { getAlbumDetails } from '@/lib/api/albums';
import { albumParamsSchema } from '@/lib/validations/params';
import { sanitizeArtistName } from '@/lib/utils';

interface AlbumDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default async function AlbumDetailsPage({
  params,
}: AlbumDetailsPageProps) {
  const rawParams = await params;

  // Validate parameters
  const paramsResult = albumParamsSchema.safeParse(rawParams);
  if (!paramsResult.success) {
    console.error('Invalid album parameters:', paramsResult.error);
    notFound();
  }

  const { id: albumId } = paramsResult.data;

  // Fetch album data server-side
  let album;
  try {
    album = await getAlbumDetails(albumId);
  } catch (error) {
    console.error('Error fetching album:', error);
    notFound();
  }

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className='min-h-screen bg-black text-white'>
      <div className='container mx-auto px-4 py-8'>
        {/* Back Navigation */}
        <BackButton />

        {/* Album Header */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8'>
          {/* Album Cover */}
          <div className='lg:col-span-1'>
            <div className='relative aspect-square w-full max-w-md mx-auto'>
              <AlbumImage
                src={album.image?.url}
                alt={
                  album.image?.alt ||
                  `${album.title} by ${sanitizeArtistName(album.artists?.[0]?.name || 'Unknown Artist')}`
                }
                width={400}
                height={400}
                className='w-full h-full object-cover rounded-lg shadow-2xl'
                sizes='(max-width: 768px) 100vw, 400px'
                priority
                fallbackIcon={<Music className='h-24 w-24 text-zinc-600' />}
              />
            </div>
          </div>

          {/* Album Info */}
          <div className='lg:col-span-2 space-y-6'>
            <div>
              <h1 className='text-4xl font-bold mb-2'>{album.title}</h1>
              <p className='text-xl text-zinc-300 mb-4'>{album.subtitle}</p>
              <AlbumInteractions album={album} />
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {album.year && (
                <div className='flex items-center space-x-2'>
                  <Calendar className='h-5 w-5 text-zinc-400' />
                  <span className='text-zinc-300'>Released: {album.year}</span>
                </div>
              )}

              {album.genre && album.genre.length > 0 && (
                <div className='flex items-center space-x-2'>
                  <Tag className='h-5 w-5 text-zinc-400' />
                  <span className='text-zinc-300'>
                    Genre: {album.genre.join(', ')}
                  </span>
                </div>
              )}

              {album.label && (
                <div className='flex items-center space-x-2'>
                  <Building2 className='h-5 w-5 text-zinc-400' />
                  <span className='text-zinc-300'>Label: {album.label}</span>
                </div>
              )}

              {album.metadata?.format && (
                <div className='flex items-center space-x-2'>
                  <Clock className='h-5 w-5 text-zinc-400' />
                  <span className='text-zinc-300'>
                    Format: {album.metadata.format}
                  </span>
                </div>
              )}

              {album.artists && album.artists.length > 0 && (
                <div className='md:col-span-2'>
                  <h3 className='text-lg font-semibold mb-2'>Artists</h3>
                  <p className='text-zinc-300'>
                    {album.artists
                      .map(artist => sanitizeArtistName(artist.name))
                      .join(', ')}
                  </p>
                </div>
              )}
            </div>
          </div>
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
      </div>
    </div>
  );
}
