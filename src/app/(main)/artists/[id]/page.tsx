import { ExternalLink, User } from 'lucide-react';
import { notFound } from 'next/navigation';

import AlbumImage from '@/components/ui/AlbumImage';
import BackButton from '@/components/ui/BackButton';
import DiscographyTab from '@/components/artistDetails/tabs/DiscographyTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getArtistDetails } from '@/lib/api/artists';
import { artistParamsSchema } from '@/lib/validations/params';
import { sanitizeArtistName } from '@/lib/utils';
import { CollapsibleBio } from '@/components/artistDetails/CollapsibleBio';

interface ArtistDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ArtistDetailsPage({
  params,
}: ArtistDetailsPageProps) {
  const rawParams = await params;

  // Validate parameters
  const paramsResult = artistParamsSchema.safeParse(rawParams);
  if (!paramsResult.success) {
    console.error('Invalid artist parameters:', paramsResult.error);
    notFound();
  }

  const { id: artistId } = paramsResult.data;

  // Fetch artist data server-side
  let artist;
  try {
    artist = await getArtistDetails(artistId);
  } catch (error) {
    console.error('Error fetching artist:', error);
    notFound();
  }

  return (
    <div className='px-4 py-8'>
      {/* Back Navigation */}
      <BackButton text='Back' fallbackHref='/' />

      {/* Artist Header */}
      <div
        id='artist-page-header'
        className='grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8'
      >
        {/* Artist Image */}
        <div className='lg:col-span-1'>
          <div className='w-full max-w-md mx-auto'>
            <AlbumImage
              src={artist.image?.url}
              alt={
                artist.image?.alt ||
                `${sanitizeArtistName(artist.title)} artist photo`
              }
              width={400}
              height={400}
              className='w-full aspect-square object-cover rounded-lg shadow-2xl'
              sizes='(max-width: 768px) 100vw, 400px'
              priority
              fallbackIcon={<User className='h-24 w-24 text-zinc-600' />}
            />
          </div>
        </div>

        {/* Artist Info */}
        <div className='lg:col-span-2 space-y-6'>
          <div>
            <h1 className='text-4xl font-bold mb-2 text-white'>
              {sanitizeArtistName(artist.title)}
            </h1>
            {artist.realname && (
              <p className='text-lg text-zinc-400 mb-4'>
                Real name: {artist.realname}
              </p>
            )}
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {artist.profile && (
              <div className='md:col-span-2'>
                <h3 className='text-lg font-semibold mb-2 text-white'>
                  Biography
                </h3>
                <CollapsibleBio content={artist.profile} />
              </div>
            )}

            {artist.urls && artist.urls.length > 0 && (
              <div className='flex items-center space-x-2'>
                <ExternalLink className='h-5 w-5 text-zinc-400' />
                <span className='text-zinc-300'>
                  <a
                    href={artist.urls[0]}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='hover:text-white transition-colors'
                  >
                    Official Website
                  </a>
                </span>
              </div>
            )}

            {artist.aliases && artist.aliases.length > 0 && (
              <div className='md:col-span-2'>
                <h3 className='text-lg font-semibold mb-2 text-white'>
                  Also known as
                </h3>
                <div className='flex flex-wrap gap-2'>
                  {artist.aliases.map((alias, index) => (
                    <span
                      key={index}
                      className='bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full text-sm'
                    >
                      {sanitizeArtistName(alias.name)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue='discography' className='w-full'>
        <TabsList className='grid w-full grid-cols-4 bg-zinc-900'>
          <TabsTrigger
            value='discography'
            className='data-[state=active]:bg-cosmic-latte data-[state=active]:text-black'
          >
            Discography
          </TabsTrigger>
          <TabsTrigger
            value='biography'
            className='data-[state=active]:bg-cosmic-latte data-[state=active]:text-black'
          >
            Biography
          </TabsTrigger>
          <TabsTrigger
            value='collaborations'
            className='data-[state=active]:bg-cosmic-latte data-[state=active]:text-black'
          >
            Collaborations
          </TabsTrigger>
          <TabsTrigger
            value='similar'
            className='data-[state=active]:bg-cosmic-latte data-[state=active]:text-black'
          >
            Similar Artists
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value='discography'
          className='focus:outline-none outline-none'
        >
          <DiscographyTab artistId={artistId} />
        </TabsContent>

        <TabsContent value='biography'>
          <div className='bg-zinc-900 p-4 rounded-lg'>
            <h3 className='text-lg font-semibold mb-4 text-white'>Biography</h3>
            {artist.profile ? (
              <p className='text-zinc-300 leading-relaxed'>{artist.profile}</p>
            ) : (
              <p className='text-zinc-400'>No biography available.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value='collaborations'>
          <div className='bg-zinc-900 p-4 rounded-lg'>
            <h3 className='text-lg font-semibold mb-4 text-white'>
              Collaborations
            </h3>
            <p className='text-zinc-400'>
              Collaboration information will appear here when available.
            </p>
          </div>
        </TabsContent>

        <TabsContent value='similar'>
          <div className='bg-zinc-900 p-4 rounded-lg'>
            <h3 className='text-lg font-semibold mb-4 text-white'>
              Similar Artists
            </h3>
            <p className='text-zinc-400'>
              Similar artist recommendations will appear here.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
