'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, User } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import DiscographyTab from '@/components/artistDetails/tabs/DiscographyTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArtistDetails } from '@/types/artist';

async function fetchArtistDetails(artistId: string): Promise<ArtistDetails> {
  const response = await fetch(`/api/artists/${artistId}`);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch artist details');
  }
  const data = await response.json();
  return data.artist;
}

export default function ArtistDetailsPage() {
  const params = useParams();
  const artistId = params.id as string;

  const {
    data: artist,
    isLoading,
    error,
    isError,
  } = useQuery({
    queryKey: ['artist', artistId],
    queryFn: () => fetchArtistDetails(artistId),
    enabled: !!artistId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });

  if (isLoading) return <LoadingState />;
  if (isError || !artist) return <ErrorState error={error?.message} />;

  return (
    <div className='min-h-screen bg-black text-white'>
      <div className='container mx-auto px-4 py-8'>
        <BackNavigation />
        <ArtistHeaderSection artist={artist} />
        <ArtistTabsSection artistId={artistId} artist={artist} />
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className='min-h-screen bg-black text-white'>
      <div className='container mx-auto px-4 py-8'>
        <div className='flex items-center justify-center h-64'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-red-500'></div>
          <span className='ml-3 text-zinc-400'>Loading artist details...</span>
        </div>
      </div>
    </div>
  );
}

function ErrorState({ error }: { error?: string }) {
  return (
    <div className='min-h-screen bg-black text-white'>
      <div className='container mx-auto px-4 py-8'>
        <BackNavigation />
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-red-500 mb-4'>
            Artist Not Found
          </h1>
          <p className='text-zinc-400'>
            {error || 'The requested artist could not be found.'}
          </p>
        </div>
      </div>
    </div>
  );
}

function BackNavigation() {
  return (
    <Link
      href='/'
      className='inline-flex items-center text-zinc-400 hover:text-white mb-6 transition-colors'
    >
      <ArrowLeft className='h-4 w-4 mr-2' />
      Back to Search
    </Link>
  );
}
function ArtistHeaderSection({ artist }: { artist: ArtistDetails }) {
  return (
    <div className='grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8'>
      {/* Artist Image */}
      <div className='lg:col-span-1'>
        <div className='relative aspect-square w-full max-w-md mx-auto'>
          {artist.image?.url ? (
            <Image
              src={artist.image.url}
              alt={artist.image.alt || `${artist.title} photo`}
              fill
              className='object-cover rounded-lg shadow-2xl'
              sizes='(max-width: 768px) 100vw, 400px'
              priority
            />
          ) : (
            <div className='w-full h-full bg-zinc-800 rounded-lg flex items-center justify-center'>
              <User className='h-24 w-24 text-zinc-600' />
            </div>
          )}
        </div>
      </div>

      {/* Artist Info */}
      <div className='lg:col-span-2 space-y-6'>
        <div>
          <h1 className='text-4xl font-bold mb-2'>{artist.title}</h1>
          <p className='text-xl text-zinc-300 mb-4'>Artist</p>
        </div>

        <ArtistInfoGrid artist={artist} />
      </div>
    </div>
  );
}

function ArtistInfoGrid({ artist }: { artist: ArtistDetails }) {
  return (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
      {artist.profile && (
        <div className='md:col-span-2'>
          <h3 className='text-lg font-semibold mb-2'>Biography</h3>
          <p className='text-zinc-300 text-sm leading-relaxed line-clamp-3'>
            {artist.profile}
          </p>
        </div>
      )}

      {artist.realname && (
        <div className='flex items-center space-x-2'>
          <User className='h-5 w-5 text-zinc-400' />
          <span className='text-zinc-300'>Real Name: {artist.realname}</span>
        </div>
      )}

      {artist.urls && artist.urls.length > 0 && (
        <div className='flex items-center space-x-2'>
          <ExternalLink className='h-5 w-5 text-zinc-400' />
          <a
            href={artist.urls[0]}
            target='_blank'
            rel='noopener noreferrer'
            className='text-blue-400 hover:text-blue-300 text-sm truncate'
          >
            Official Website
          </a>
        </div>
      )}

      {artist.aliases && artist.aliases.length > 0 && (
        <div className='md:col-span-2'>
          <h3 className='text-lg font-semibold mb-2'>Also Known As</h3>
          <div className='flex flex-wrap gap-2'>
            {artist.aliases.map((alias, index) => (
              <span
                key={index}
                className='bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full text-sm'
              >
                {alias.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
function ArtistTabsSection({
  artistId,
  artist: _artist,
}: {
  artistId: string;
  artist: ArtistDetails;
}) {
  return (
    <Tabs defaultValue='discography' className='w-full'>
      <TabsList className='grid w-full grid-cols-4 bg-zinc-900'>
        <TabsTrigger
          value='discography'
          className='data-[state=active]:bg-zinc-800 data-[state=active]:text-white'
        >
          Discography
        </TabsTrigger>
        <TabsTrigger
          value='recs'
          className='data-[state=active]:bg-zinc-800 data-[state=active]:text-white'
        >
          Recs
        </TabsTrigger>
        <TabsTrigger
          value='chinese-wisdom'
          className='data-[state=active]:bg-zinc-800 data-[state=active]:text-white'
        >
          Chinese Wisdom
        </TabsTrigger>
        <TabsTrigger
          value='similar-artists'
          className='data-[state=active]:bg-zinc-800 data-[state=active]:text-white'
        >
          Similar Artists
        </TabsTrigger>
      </TabsList>

      <TabsContent value='discography'>
        <DiscographyTab artistId={artistId} />
      </TabsContent>
      <TabsContent value='recs'>
        <RecsTabContent artistId={artistId} />
      </TabsContent>
      <TabsContent value='chinese-wisdom'>
        <ChineseWisdomTabContent artistId={artistId} />
      </TabsContent>
      <TabsContent value='similar-artists'>
        <SimilarArtistsTabContent artistId={artistId} />
      </TabsContent>
    </Tabs>
  );
}

function RecsTabContent({ artistId: _artistId }: { artistId: string }) {
  return (
    <div className='bg-zinc-900 p-4 rounded-lg'>
      <h3 className='text-lg font-semibold mb-4'>Recs</h3>
      <p className='text-zinc-400'>
        Artist recs will appear here. This feature is coming soon!
      </p>
    </div>
  );
}

function ChineseWisdomTabContent({
  artistId: _artistId,
}: {
  artistId: string;
}) {
  return (
    <div className='bg-zinc-900 p-4 rounded-lg'>
      <h3 className='text-lg font-semibold mb-4'>Chinese Wisdom</h3>
      <p className='text-zinc-400'>
        &quot;One cannot have both the fish and the bear&apos;s paw.&quot;
      </p>
    </div>
  );
}

function SimilarArtistsTabContent({
  artistId: _artistId,
}: {
  artistId: string;
}) {
  return (
    <div className='bg-zinc-900 p-4 rounded-lg'>
      <h3 className='text-lg font-semibold mb-4'>Similar Artists</h3>
      <p className='text-zinc-400'>
        Similar artists will appear here. This feature is coming soon!
      </p>
    </div>
  );
}
