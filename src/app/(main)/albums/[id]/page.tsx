import { Building2, Calendar, Clock, Music, Tag } from 'lucide-react';
import { notFound } from 'next/navigation';

import AlbumImage from '@/components/ui/AlbumImage';
import AlbumInteractions from '@/components/albums/AlbumInteractions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BackButton from '@/components/ui/BackButton';
import TracklistTab from '@/components/albumDetails/tabs/TracklistTab';
import AlbumRecommendationsTab from '@/components/albumDetails/tabs/AlbumRecommendationsTab';
import { getAlbumDetails } from '@/lib/api/albums';
import { albumParamsSchema } from '@/lib/validations/params';
import { sanitizeArtistName } from '@/lib/utils';

interface AlbumDetailsPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ source?: string }>;
}

export default async function AlbumDetailsPage({
  params,
  searchParams,
}: AlbumDetailsPageProps) {
  const rawParams = await params;
  const rawSearch = searchParams ? await searchParams : {};

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
    const preferredSource = (rawSearch as any)?.source as
      | 'musicbrainz'
      | 'discogs'
      | 'local'
      | undefined;
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        albumId
      );
    const isNumeric = /^\d+$/.test(albumId);
    const inferredSource = isUuid
      ? 'musicbrainz'
      : isNumeric
        ? 'discogs'
        : undefined;
    const source = preferredSource || inferredSource;
    try {
      console.log('[AlbumDetailsPage] Fetching album', {
        albumId,
        preferredSource: preferredSource || null,
        inferredSource: inferredSource || null,
        finalSource: source || null,
      });
    } catch {}
    album = await getAlbumDetails(
      albumId,
      source ? ({ source } as any) : undefined
    );
  } catch (error) {
    console.error('Error fetching album:', error);
    notFound();
  }

  return (
    <div className='px-4 py-8'>
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
            <h1 className='text-4xl font-bold mb-2 text-white'>
              {album.title}
            </h1>
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
                <h3 className='text-lg font-semibold mb-2 text-white'>
                  Artists
                </h3>
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
            className='data-[state=active]:bg-cosmic-latte data-[state=active]:text-black'
          >
            Tracklist
          </TabsTrigger>
          <TabsTrigger
            value='recommendations'
            className='data-[state=active]:bg-cosmic-latte data-[state=active]:text-black'
          >
            Recommendations
          </TabsTrigger>
          <TabsTrigger
            value='reviews'
            className='data-[state=active]:bg-cosmic-latte data-[state=active]:text-black'
          >
            Reviews
          </TabsTrigger>
          <TabsTrigger
            value='similar'
            className='data-[state=active]:bg-cosmic-latte data-[state=active]:text-black'
          >
            Similar Albums
          </TabsTrigger>
        </TabsList>

        <TabsContent value='tracklist' className='mt-6'>
          <TracklistTab tracks={album.tracks || []} />
        </TabsContent>

        <TabsContent value='recommendations' className='mt-6'>
          <AlbumRecommendationsTab
            albumId={albumId}
            albumTitle={album.title}
            albumArtist={sanitizeArtistName(
              album.artists?.[0]?.name || 'Unknown Artist'
            )}
            albumImageUrl={album.image?.url || null}
            albumYear={album.year?.toString() || null}
          />
        </TabsContent>

        <TabsContent value='reviews' className='mt-6'>
          <div className='bg-zinc-900 rounded-lg p-6'>
            <h3 className='text-xl font-semibold mb-4 text-white'>
              User Reviews
            </h3>
            <p className='text-zinc-400'>
              User reviews and ratings for this album will appear here. This
              feature is coming soon!
            </p>
          </div>
        </TabsContent>

        <TabsContent value='similar' className='mt-6'>
          <div className='bg-zinc-900 rounded-lg p-6'>
            <h3 className='text-xl font-semibold mb-4 text-white'>
              Similar Albums
            </h3>
            <p className='text-zinc-400'>
              Albums similar to this one will appear here. This feature is
              coming soon!
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
