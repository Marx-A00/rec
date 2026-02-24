import { notFound } from 'next/navigation';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';

import { getAlbumDetails } from '@/lib/api/albums';
import { albumParamsSchema } from '@/lib/validations/params';
import MobileAlbumDetails from '@/components/mobile/albums/MobileAlbumDetails';

interface MobileAlbumPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ source?: string }>;
}

export default async function MobileAlbumPage({
  params,
  searchParams,
}: MobileAlbumPageProps) {
  const rawParams = await params;
  const rawSearch = searchParams ? await searchParams : {};

  // Validate parameters
  const paramsResult = albumParamsSchema.safeParse(rawParams);
  if (!paramsResult.success) {
    console.error(
      '[MobileAlbumPage] Invalid album parameters:',
      paramsResult.error
    );
    notFound();
  }

  const { id: albumId } = paramsResult.data;

  // Fetch album data server-side
  let album;
  try {
    const rawSource = (rawSearch as { source?: string })?.source?.toLowerCase();
    const source = rawSource as 'musicbrainz' | 'discogs' | 'local' | undefined;

    console.log('[MobileAlbumPage] Fetching album', {
      albumId,
      source: source || 'local (default)',
    });

    album = await getAlbumDetails(albumId, source ? { source } : undefined);
  } catch (error) {
    console.error('[MobileAlbumPage] Error fetching album:', error);
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
          <div className='w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4'>
            <AlertCircle className='h-8 w-8 text-zinc-600' />
          </div>
          <h2 className='text-xl font-bold text-white mb-2'>Album Not Found</h2>
          <p className='text-zinc-400 mb-6'>
            {error instanceof Error
              ? error.message
              : 'Could not load album details'}
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

  return <MobileAlbumDetails album={album} />;
}
