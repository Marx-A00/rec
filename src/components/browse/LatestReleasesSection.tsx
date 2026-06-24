import Link from 'next/link';

import AlbumImage from '@/components/ui/AlbumImage';
import { SourceIcon } from '@/components/ui/SourceIcon';
import { getLatestReleases } from '@/lib/albums/latest-releases';
import type { LatestRelease } from '@/lib/albums/latest-releases';

function isToday(dateStr: string): boolean {
  const release = new Date(dateStr);
  const now = new Date();
  return (
    release.getUTCFullYear() === now.getUTCFullYear() &&
    release.getUTCMonth() === now.getUTCMonth() &&
    release.getUTCDate() === now.getUTCDate()
  );
}

export async function LatestReleasesSection() {
  const { releases, newestReleaseDate } = await getLatestReleases(15);

  if (releases.length === 0) {
    return (
      <div className='text-center py-12 bg-zinc-900/50 rounded-lg border border-zinc-800'>
        <p className='text-zinc-400'>
          No albums found. Run a sync job to populate.
        </p>
        <p className='text-xs mt-2 text-zinc-500'>
          Visit the admin dashboard to trigger a sync.
        </p>
      </div>
    );
  }

  return (
    <section className='space-y-6'>
      {/* Section header */}
      <div className='flex items-center justify-between'>
        <div className='flex flex-col gap-1'>
          <p className='text-[11px] font-bold tracking-[2px] text-cosmic-latte/70 uppercase'>
            Fresh Drops
          </p>
          <h2 className='text-2xl font-extrabold text-white'>
            Latest Releases
          </h2>
          {newestReleaseDate && (
            <p className='text-xs text-zinc-500 mt-1'>
              Last synced:{' '}
              {new Date(newestReleaseDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          )}
        </div>
        <Link
          href='/latest'
          className='text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-1 group'
        >
          See all
          <svg
            className='w-4 h-4 group-hover:translate-x-0.5 transition-transform'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M9 5l7 7-7 7'
            />
          </svg>
        </Link>
      </div>

      {/* Horizontal scroll of release cards */}
      <div className='flex gap-4 overflow-x-auto overflow-y-clip pb-4 px-1 -mx-1 custom-scrollbar overscroll-x-contain'>
        {releases.map((album, idx) => (
          <ReleaseCard
            key={album.id}
            album={album}
            isNew={
              idx === 0 && !!album.releaseDate && isToday(album.releaseDate)
            }
          />
        ))}
      </div>
    </section>
  );
}

function ReleaseCard({
  album,
  isNew,
}: {
  album: LatestRelease;
  isNew?: boolean;
}) {
  return (
    <Link
      href={`/albums/${album.id}?source=local`}
      className='shrink-0 w-[200px] bg-zinc-900/60 backdrop-blur-xs border border-zinc-800/80 rounded-xl overflow-hidden hover:border-cosmic-latte/50 hover:bg-zinc-800/60 transition-all duration-300 group cursor-pointer'
    >
      <div className='relative aspect-square'>
        {isNew && (
          <div className='absolute top-2 left-2 z-10 bg-emerald-500/90 text-black text-[10px] font-bold px-2 py-0.5 rounded-full'>
            New today
          </div>
        )}
        <AlbumImage
          src={album.coverArtUrl}
          cloudflareImageId={album.cloudflareImageId}
          alt={album.title}
          width={200}
          height={200}
          className='w-full h-full object-cover shadow-xl group-hover:brightness-110 transition-all duration-300'
        />
      </div>
      <div className='flex items-center justify-between px-3 py-2.5'>
        <div className='min-w-0 space-y-1'>
          <p className='font-semibold text-white text-sm line-clamp-1 group-hover:text-cosmic-latte transition-colors'>
            {album.title}
          </p>
          <p className='text-xs text-zinc-400 line-clamp-1'>{album.artists}</p>
        </div>
        <SourceIcon
          source={album.source}
          className='w-5 h-5 shrink-0 ml-2 opacity-60 group-hover:opacity-100 transition-opacity'
        />
      </div>
    </Link>
  );
}
