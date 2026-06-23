'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDateOnly } from '@/lib/date-utils';
import { ArrowLeft, TrendingUp, Music } from 'lucide-react';

import AlbumImage from '@/components/ui/AlbumImage';
import {
  PersonalizedSimilarArtists,
  RecentRecommendations,
  TasteMatchedUsers,
} from '@/components/browse';
import {
  useGetTopRecommendedAlbumsQuery,
  useGetTopRecommendedArtistsQuery,
} from '@/generated/graphql';

// ---------- Types ----------

interface LatestRelease {
  id: string;
  title: string;
  coverArtUrl: string | null;
  cloudflareImageId: string | null;
  releaseDate: string | null;
  artists: string;
}

interface MobileBrowseClientProps {
  latestReleases: LatestRelease[];
}

// ---------- Main Component ----------

export default function MobileBrowseClient({
  latestReleases,
}: MobileBrowseClientProps) {
  const router = useRouter();

  return (
    <div className='min-h-screen bg-black pb-4'>
      {/* Sticky Header */}
      <div className='sticky top-0 z-10 bg-black/90 backdrop-blur-xs border-b border-zinc-800 px-4 py-3'>
        <div className='flex items-center justify-between'>
          <button
            onClick={() => router.back()}
            className='flex items-center text-white min-h-[44px] min-w-[44px]'
            aria-label='Go back'
          >
            <ArrowLeft className='h-5 w-5' />
          </button>
          <h1 className='text-lg font-semibold text-white'>Browse</h1>
          <div className='min-w-[44px]' />
        </div>
      </div>

      <div className='space-y-8 py-4'>
        {/* Personalized Sections (self-conditional) */}
        <div className='px-4'>
          <PersonalizedSimilarArtists />
        </div>

        <div className='px-4'>
          <RecentRecommendations />
        </div>

        <div className='px-4'>
          <TasteMatchedUsers />
        </div>

        {/* Latest Releases */}
        <BrowseSection
          title='Latest Releases'
          icon={<Music className='w-4 h-4' />}
        >
          {latestReleases.length > 0 ? (
            <ScrollRow>
              {latestReleases.map(album => (
                <ReleaseCard key={album.id} album={album} />
              ))}
            </ScrollRow>
          ) : (
            <EmptyState message='No releases yet.' />
          )}
        </BrowseSection>

        {/* Top Recommended Artists */}
        <TopArtistsSection />

        {/* Top Recommended Albums */}
        <TopAlbumsSection />
      </div>
    </div>
  );
}

// ---------- Section Components ----------

function TopArtistsSection() {
  const { data, isLoading, error } = useGetTopRecommendedArtistsQuery({
    limit: 12,
  });

  const artists = data?.topRecommendedArtists ?? [];

  return (
    <BrowseSection
      title='Top Recommended Artists'
      icon={<TrendingUp className='w-4 h-4' />}
    >
      {isLoading ? (
        <ScrollRow>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} variant='circle' />
          ))}
        </ScrollRow>
      ) : error ? (
        <EmptyState message='Failed to load artists.' />
      ) : artists.length === 0 ? (
        <EmptyState message='No recommended artists yet.' />
      ) : (
        <ScrollRow>
          {artists.map(item => (
            <ArtistCard
              key={item.artist.id}
              artist={item.artist}
              recCount={item.recommendationCount}
            />
          ))}
        </ScrollRow>
      )}
    </BrowseSection>
  );
}

function TopAlbumsSection() {
  const { data, isLoading, error } = useGetTopRecommendedAlbumsQuery({
    limit: 12,
  });

  const albums = data?.topRecommendedAlbums ?? [];

  return (
    <BrowseSection
      title='Most Recommended Albums'
      icon={<TrendingUp className='w-4 h-4' />}
    >
      {isLoading ? (
        <ScrollRow>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} variant='square' />
          ))}
        </ScrollRow>
      ) : error ? (
        <EmptyState message='Failed to load albums.' />
      ) : albums.length === 0 ? (
        <EmptyState message='No recommended albums yet.' />
      ) : (
        <ScrollRow>
          {albums.map(item => (
            <AlbumCard key={item.album.id} album={item.album} />
          ))}
        </ScrollRow>
      )}
    </BrowseSection>
  );
}

// ---------- Layout Helpers ----------

function BrowseSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className='flex items-center gap-2 px-4 mb-3'>
        <div className='text-cosmic-latte'>{icon}</div>
        <h2 className='text-base font-semibold text-white'>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function ScrollRow({ children }: { children: React.ReactNode }) {
  return (
    <div className='flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-hide'>
      {children}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className='mx-4 py-8 text-center bg-zinc-900/50 rounded-lg border border-zinc-800'>
      <p className='text-sm text-zinc-500'>{message}</p>
    </div>
  );
}

// ---------- Card Components ----------

function ArtistCard({
  artist,
  recCount,
}: {
  artist: {
    id: string;
    name: string;
    imageUrl?: string | null;
  };
  recCount: number;
}) {
  return (
    <Link
      href={`/m/artists/${artist.id}?source=local`}
      className='shrink-0 w-[130px] bg-zinc-900 border border-zinc-800 rounded-xl p-3 active:scale-[0.97] transition-transform'
    >
      <div className='flex flex-col items-center text-center gap-2'>
        <div className='w-14 h-14 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center'>
          {artist.imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={artist.imageUrl}
              alt={artist.name}
              className='w-full h-full object-cover'
            />
          ) : (
            <Music className='w-6 h-6 text-zinc-500' />
          )}
        </div>
        <p className='text-sm font-medium text-white truncate w-full'>
          {artist.name}
        </p>
        <p className='text-xs text-zinc-500'>{recCount} recs</p>
      </div>
    </Link>
  );
}

function AlbumCard({
  album,
}: {
  album: {
    id: string;
    title: string;
    coverArtUrl?: string | null;
    cloudflareImageId?: string | null;
    artists: Array<{ artist: { id: string; name: string } }>;
  };
}) {
  const artistName = album.artists?.[0]?.artist?.name || 'Unknown Artist';

  return (
    <Link
      href={`/m/albums/${album.id}?source=local`}
      className='shrink-0 w-[100px] active:scale-[0.97] transition-transform'
    >
      <div className='aspect-square rounded-lg overflow-hidden mb-1.5'>
        <AlbumImage
          src={album.coverArtUrl}
          cloudflareImageId={album.cloudflareImageId}
          alt={album.title}
          width={100}
          height={100}
          className='w-full h-full object-cover'
        />
      </div>
      <p className='text-xs font-medium text-white truncate'>{album.title}</p>
      <p className='text-[11px] text-zinc-500 truncate'>{artistName}</p>
    </Link>
  );
}

function ReleaseCard({ album }: { album: LatestRelease }) {
  return (
    <Link
      href={`/m/albums/${album.id}?source=local`}
      className='shrink-0 w-[100px] active:scale-[0.97] transition-transform'
    >
      <div className='aspect-square rounded-lg overflow-hidden mb-1.5'>
        <AlbumImage
          src={album.coverArtUrl}
          cloudflareImageId={album.cloudflareImageId}
          alt={album.title}
          width={100}
          height={100}
          className='w-full h-full object-cover'
        />
      </div>
      <p className='text-xs font-medium text-white truncate'>{album.title}</p>
      <p className='text-[11px] text-zinc-500 truncate'>{album.artists}</p>
      {album.releaseDate && (
        <p className='text-[10px] text-zinc-600 mt-0.5'>
          {formatDateOnly(album.releaseDate, {
            month: 'short',
            day: 'numeric',
          })}
        </p>
      )}
    </Link>
  );
}

// ---------- Skeleton ----------

function SkeletonCard({ variant }: { variant: 'circle' | 'square' }) {
  return (
    <div className='shrink-0 w-[130px] bg-zinc-900 border border-zinc-800 rounded-xl p-3'>
      <div className='animate-pulse flex flex-col items-center gap-2'>
        <div
          className={`w-14 h-14 bg-zinc-800 ${variant === 'circle' ? 'rounded-full' : 'rounded-lg'}`}
        />
        <div className='h-3 bg-zinc-800 rounded w-3/4' />
        <div className='h-2.5 bg-zinc-800/60 rounded w-1/2' />
      </div>
    </div>
  );
}
