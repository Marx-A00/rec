'use client';

import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import Link from 'next/link';

import AlbumImage from '@/components/ui/AlbumImage';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '@/components/ui/carousel';
import {
  useGetRecentRecommendationsQuery,
  type RecommendationFieldsFragment,
} from '@/generated/graphql';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type AlbumWithArtists = RecommendationFieldsFragment['basisAlbum'];

function getArtistName(album: AlbumWithArtists): string {
  return album.artists[0]?.artist.name ?? 'Unknown Artist';
}

const getScoreColors = (score: number) => {
  if (score >= 10) {
    return {
      heartColor: 'text-red-500 fill-red-500',
      textColor: 'text-red-400',
      bgGradient: 'from-red-950 to-red-950',
      borderColor: 'border-red-500/40',
    };
  } else if (score >= 8) {
    return {
      heartColor: 'text-emerald-500 fill-emerald-500',
      textColor: 'text-emerald-400',
      bgGradient: 'from-emerald-950 to-emerald-950',
      borderColor: 'border-emerald-500/40',
    };
  } else {
    return {
      heartColor: 'text-yellow-500 fill-yellow-500',
      textColor: 'text-yellow-400',
      bgGradient: 'from-yellow-950 to-yellow-950',
      borderColor: 'border-yellow-500/40',
    };
  }
};

// ---------------------------------------------------------------------------
// Recommendation item (matches social activity feed style)
// ---------------------------------------------------------------------------

function RecItem({ rec }: { rec: RecommendationFieldsFragment }) {
  const recArtist = getArtistName(rec.recommendedAlbum);
  const basisArtist = getArtistName(rec.basisAlbum);
  const sc = getScoreColors(rec.score);

  return (
    <div className='bg-zinc-900 rounded-lg p-3 pb-4 border border-zinc-800'>
      {/* Header — user + text */}
      <div className='mb-3'>
        <div className='flex justify-center items-center gap-2'>
          <Link href={`/profile/${rec.user.id}`}>
            <Avatar className='h-6 w-6 hover:opacity-80 transition-opacity cursor-pointer'>
              <AvatarImage src={rec.user.image ?? undefined} />
              <AvatarFallback className='bg-zinc-700 text-zinc-200 text-[10px]'>
                {rec.user.username?.charAt(0).toUpperCase() ?? 'U'}
              </AvatarFallback>
            </Avatar>
          </Link>

          <p className='text-sm text-zinc-400 text-center'>
            <Link
              href={`/profile/${rec.user.id}`}
              className='text-cosmic-latte hover:text-cosmic-latte font-medium transition-colors'
            >
              {rec.user.username ?? 'Anonymous'}
            </Link>{' '}
            recommends{' '}
            <Link
              href={`/albums/${rec.recommendedAlbum.id}?source=local`}
              className='text-cosmic-latte hover:text-cosmic-latte font-semibold transition-colors'
            >
              {rec.recommendedAlbum.title}
            </Link>{' '}
            by <span className='text-cosmic-latte'>{recArtist}</span>
          </p>
        </div>
      </div>

      {/* Stacked albums visual */}
      <div className='flex justify-center relative'>
        <div className='relative inline-block'>
          <div className='relative w-[420px] h-[260px]'>
            {/* Basis Album (back) */}
            <Link
              href={`/albums/${rec.basisAlbum.id}?source=local`}
              className='absolute left-0 top-0 cursor-pointer hover:scale-105 transition-transform'
              title={`View ${rec.basisAlbum.title}`}
            >
              <AlbumImage
                src={rec.basisAlbum.coverArtUrl}
                cloudflareImageId={rec.basisAlbum.cloudflareImageId}
                alt={rec.basisAlbum.title}
                width={180}
                height={180}
                className='w-[180px] h-[180px] rounded-lg shadow-lg border border-zinc-700/50 hover:border-zinc-600 transition-all'
              />
            </Link>

            {/* Recommended Album (front) */}
            <Link
              href={`/albums/${rec.recommendedAlbum.id}?source=local`}
              className='absolute left-[200px] top-0 cursor-pointer hover:scale-105 transition-transform'
              title={`View ${rec.recommendedAlbum.title} by ${recArtist}`}
            >
              <AlbumImage
                src={rec.recommendedAlbum.coverArtUrl}
                cloudflareImageId={rec.recommendedAlbum.cloudflareImageId}
                alt={`${rec.recommendedAlbum.title} by ${recArtist}`}
                width={220}
                height={220}
                className='w-[220px] h-[220px] rounded-lg shadow-2xl border-2 border-cosmic-latte/30 hover:border-cosmic-latte/50 transition-all'
              />
            </Link>

            {/* Score indicator with heart */}
            <div className='absolute left-[155px] top-[75px] z-20'>
              <div className='bg-zinc-900 border-2 border-zinc-800 rounded-full shadow-lg'>
                <div
                  className={`flex items-center justify-center w-16 h-16 bg-linear-to-r ${sc.bgGradient} rounded-full border-2 ${sc.borderColor} shadow-md`}
                >
                  <div className='flex flex-col items-center'>
                    <Heart
                      className={`h-4 w-4 ${sc.heartColor} drop-shadow-xs mb-0.5`}
                    />
                    <span
                      className={`text-xs font-bold ${sc.textColor} tabular-nums leading-none`}
                    >
                      {rec.score}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Basis album text */}
            <div className='absolute bottom-0 left-0 w-[420px] pointer-events-none'>
              <p className='text-sm text-zinc-500 text-center w-full px-4 pb-1 line-clamp-1'>
                if you like{' '}
                <span className='text-zinc-400'>{rec.basisAlbum.title}</span> by{' '}
                <span className='text-zinc-400'>{basisArtist}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function RecentRecommendationsSkeleton() {
  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-1'>
        <div className='h-3 w-48 bg-zinc-800 rounded animate-pulse' />
        <div className='h-7 w-80 bg-zinc-800 rounded animate-pulse' />
      </div>
      <div className='bg-zinc-900 border border-zinc-800 rounded-lg h-[320px] animate-pulse' />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function RecentRecommendations() {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on('select', onSelect);
    return () => {
      api.off('select', onSelect);
    };
  }, [api]);

  const { data, isLoading, error } = useGetRecentRecommendationsQuery({
    limit: 8,
  });

  if (isLoading) {
    return <RecentRecommendationsSkeleton />;
  }

  if (error || !data?.recentRecommendations) {
    return null;
  }

  const recommendations = data.recentRecommendations;

  if (recommendations.length < 3) {
    return null;
  }

  return (
    <section className='space-y-6'>
      {/* Section header */}
      <div className='flex flex-col gap-1'>
        <p className='text-[11px] font-bold tracking-[2px] text-cosmic-latte/70 uppercase'>
          Recent Recommendations
        </p>
        <h2 className='text-2xl font-extrabold text-white'>
          What the community is playing
        </h2>
      </div>

      {/* Carousel */}
      <Carousel opts={{ loop: true }} setApi={setApi} className='w-full'>
        <CarouselContent>
          {recommendations.map(rec => (
            <CarouselItem key={rec.id}>
              <RecItem rec={rec} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className='left-2' />
        <CarouselNext className='right-2' />
      </Carousel>

      {/* Dot indicators */}
      {count > 1 && (
        <div className='flex justify-center gap-1.5'>
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              type='button'
              onClick={() => api?.scrollTo(i)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === current
                  ? 'bg-cosmic-latte w-4'
                  : 'bg-zinc-600 hover:bg-zinc-500'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
