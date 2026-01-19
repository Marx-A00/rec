import { notFound } from 'next/navigation';
import { ArrowLeft, User } from 'lucide-react';
import Link from 'next/link';

import { getArtistDetails } from '@/lib/api/artists';
import { artistParamsSchema } from '@/lib/validations/params';
import MobileArtistClient from './MobileArtistClient';

interface MobileArtistPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ source?: string }>;
}

export default async function MobileArtistPage({
  params,
  searchParams,
}: MobileArtistPageProps) {
  const rawParams = await params;
  const rawSearch = searchParams ? await searchParams : {};

  // Validate parameters
  const paramsResult = artistParamsSchema.safeParse(rawParams);
  if (!paramsResult.success) {
    console.error(
      '[MobileArtistPage] Invalid artist parameters:',
      paramsResult.error
    );
    notFound();
  }

  const { id: artistId } = paramsResult.data;

  // Fetch artist data server-side
  let artist;
  try {
    const rawSource = (rawSearch as { source?: string })?.source?.toLowerCase();
    const source =
      (rawSource as 'musicbrainz' | 'discogs' | 'local') || 'local';

    console.log('[MobileArtistPage] Fetching artist', {
      artistId,
      source,
    });

    artist = await getArtistDetails(artistId, { source });
  } catch (error) {
    console.error('[MobileArtistPage] Error fetching artist:', error);
    // Show error page instead of notFound for better UX
    return (
      <div className='min-h-screen bg-black'>
        <div className='sticky top-0 z-10 bg-black/90 backdrop-blur-sm border-b border-zinc-800 px-4 py-3'>
          <Link
            href='/m/search'
            className='flex items-center gap-2 text-white min-h-[44px] min-w-[44px]'
          >
            <ArrowLeft className='h-5 w-5' />
            <span>Back</span>
          </Link>
        </div>
        <div className='flex flex-col items-center justify-center min-h-[60vh] px-6 text-center'>
          <User className='h-16 w-16 text-zinc-600 mb-4' />
          <h2 className='text-xl font-bold text-white mb-2'>
            Artist Not Found
          </h2>
          <p className='text-zinc-400 mb-6'>
            {error instanceof Error
              ? error.message
              : 'Could not load artist details'}
          </p>
          <Link
            href='/m/search'
            className='px-6 py-3 bg-emeraled-green text-black rounded-full font-medium'
          >
            Back to Search
          </Link>
        </div>
      </div>
    );
  }

  return <MobileArtistClient artist={artist} />;
}
