'use client';

import { useGetRecommendationFeedQuery } from '@/generated/graphql';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import AlbumImage from '@/components/ui/AlbumImage';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function RecentRecs() {
  const { data, isLoading } = useGetRecommendationFeedQuery(
    { limit: 6 },
    { staleTime: 1000 * 60 * 5 } // 5 min cache
  );

  const recs = data?.recommendationFeed?.recommendations ?? [];

  if (isLoading) {
    return (
      <section className='py-20 px-6'>
        <div className='max-w-6xl mx-auto'>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className='bg-zinc-900/50 rounded-xl p-4 animate-pulse'
              >
                <div className='flex gap-3'>
                  <div className='w-20 h-20 bg-zinc-800 rounded-lg' />
                  <div className='w-20 h-20 bg-zinc-800 rounded-lg' />
                </div>
                <div className='mt-3 h-4 bg-zinc-800 rounded w-3/4' />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (recs.length === 0) {
    return null; // Don't show section if no recs
  }

  return (
    <section className='py-20 px-6'>
      <div className='max-w-6xl mx-auto'>
        {/* Header - casual, not corporate */}
        <div className='mb-10'>
          <p className='text-zinc-500 text-sm uppercase tracking-wider mb-2'>
            happening now
          </p>
          <h2 className='text-2xl md:text-3xl font-bold text-white'>
            People are sharing these
          </h2>
        </div>

        {/* Recs grid - asymmetric, organic feel */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'>
          {recs.map((rec, idx) => (
            <RecCard key={rec.id} rec={rec} featured={idx === 0} />
          ))}
        </div>

        {/* Subtle CTA */}
        <div className='mt-12 text-center'>
          <Link
            href='/register'
            className='inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group'
          >
            <span>see what else is out there</span>
            <ArrowRight className='w-4 h-4 group-hover:translate-x-1 transition-transform' />
          </Link>
        </div>
      </div>
    </section>
  );
}

interface RecCardProps {
  rec: {
    id: string;
    score: number;
    user: {
      id: string;
      username?: string | null;
      image?: string | null;
    };
    basisAlbum?: {
      id: string;
      title: string;
      coverArtUrl?: string | null;
      cloudflareImageId?: string | null;
      artists?: Array<{ artist?: { name: string } | null }> | null;
    } | null;
    recommendedAlbum?: {
      id: string;
      title: string;
      coverArtUrl?: string | null;
      cloudflareImageId?: string | null;
      artists?: Array<{ artist?: { name: string } | null }> | null;
    } | null;
  };
  featured?: boolean;
}

function RecCard({ rec, featured }: RecCardProps) {
  const basisArtist = rec.basisAlbum?.artists?.[0]?.artist?.name ?? 'Unknown';
  const recArtist =
    rec.recommendedAlbum?.artists?.[0]?.artist?.name ?? 'Unknown';

  return (
    <div
      className={`
        group relative bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4
        hover:bg-zinc-900/70 hover:border-zinc-700 transition-all duration-300
        ${featured ? 'md:col-span-2 lg:col-span-1' : ''}
      `}
    >
      {/* Album pair */}
      <div className='flex items-start gap-3'>
        {/* Source album */}
        <div className='relative flex-shrink-0'>
          <AlbumImage
            src={rec.basisAlbum?.coverArtUrl}
            cloudflareImageId={rec.basisAlbum?.cloudflareImageId}
            alt={rec.basisAlbum?.title ?? 'Album'}
            width={80}
            height={80}
            className='w-20 h-20 rounded-lg shadow-lg'
          />
        </div>

        {/* Arrow / connection indicator */}
        <div className='flex flex-col items-center justify-center self-center text-zinc-600'>
          <span className='text-lg'>→</span>
        </div>

        {/* Recommended album */}
        <div className='relative flex-shrink-0'>
          <AlbumImage
            src={rec.recommendedAlbum?.coverArtUrl}
            cloudflareImageId={rec.recommendedAlbum?.cloudflareImageId}
            alt={rec.recommendedAlbum?.title ?? 'Album'}
            width={80}
            height={80}
            className='w-20 h-20 rounded-lg shadow-lg'
          />
          {/* Score badge */}
          <div className='absolute -bottom-1 -right-1 bg-zinc-950 rounded-full px-1.5 py-0.5 border border-zinc-700'>
            <span className='text-xs font-medium text-cosmic-latte'>
              {rec.score}/10
            </span>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className='mt-4 space-y-2'>
        <p className='text-sm text-zinc-300 leading-snug'>
          <span className='text-white font-medium'>
            {rec.basisAlbum?.title}
          </span>
          <span className='text-zinc-500'> by {basisArtist}</span>
        </p>
        <p className='text-xs text-zinc-500'>
          pairs with{' '}
          <span className='text-zinc-400'>{rec.recommendedAlbum?.title}</span>{' '}
          by {recArtist}
        </p>
      </div>

      {/* User */}
      <div className='mt-4 pt-3 border-t border-zinc-800/50 flex items-center gap-2'>
        <Avatar className='w-5 h-5'>
          <AvatarImage src={rec.user.image ?? undefined} />
          <AvatarFallback className='bg-zinc-800 text-zinc-400 text-xs'>
            {rec.user.username?.charAt(0)?.toUpperCase() ?? '?'}
          </AvatarFallback>
        </Avatar>
        <span className='text-xs text-zinc-500'>
          rec&apos;d by{' '}
          <span className='text-zinc-400'>
            {rec.user.username ?? 'someone'}
          </span>
        </span>
      </div>
    </div>
  );
}
