import { Suspense } from 'react';
import { Users, Music, TrendingUp } from 'lucide-react';
import Link from 'next/link';

import { prisma } from '@/lib/prisma';
import { formatDateOnly } from '@/lib/date-utils';
import { getLatestReleases } from '@/lib/albums/latest-releases';
import AlbumImage from '@/components/ui/AlbumImage';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  TopRecommendedAlbums,
  TopRecommendedArtists,
} from '@/components/browse';

// Force dynamic rendering - don't prerender at build time
export const dynamic = 'force-dynamic';

// TODO: add Recent Recommendations Section
async function getNewUsers(limit: number = 15) {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    take: limit,
    select: {
      id: true,
      username: true,
      email: true,
      image: true,
      bio: true,
      followersCount: true,
      followingCount: true,
      recommendationsCount: true,
    },
  });

  // Sort by ID descending as a proxy for creation order
  return users.sort((a, b) => b.id.localeCompare(a.id));
}

/* TODO: instead of 'welcome new music lovers' , and then 
just showing the new users, have a 'check out what the community is doing 
and we can show a feed or users' activites at random....

add in a mr-x just made a sandwich for laughs

could have a 'looking for' section, showing people that have a looking for tag, and maybe make it filterable
*/
export default async function BrowsePage() {
  return (
    <div className='container mx-auto px-4 py-8 max-w-7xl'>
      {/* Page Header */}
      <div
        id='browse-page-header'
        data-tour-step='browse-header'
        className='mb-16'
      >
        <h1 className='text-4xl font-bold text-white mb-4'>
          Discover Music & Community
        </h1>
        <p className='text-zinc-400 text-lg max-w-3xl leading-relaxed'>
          Explore new music, connect with fellow music lovers, and discover your
          next favorite album
        </p>
      </div>

      {/* Content Sections */}
      <div className='space-y-16'>
        {/* New Users Section */}
        <ContentRow
          title='Welcome New Music Lovers'
          subtitle='Connect with our newest community members'
          icon={<Users className='w-5 h-5' />}
        >
          <Suspense fallback={<LoadingCards count={8} />}>
            <NewUsersSection />
          </Suspense>
        </ContentRow>

        {/* Top Recommended Artists Section */}
        <ContentRow
          title='Top Recommended Artists'
          subtitle='Artists with the most album recommendations'
          icon={<TrendingUp className='w-5 h-5' />}
        >
          <TopRecommendedArtists limit={12} />
        </ContentRow>

        {/* Top Recommended Albums Section */}
        <ContentRow
          title='Most Recommended Albums'
          subtitle='Albums the community loves recommending'
          icon={<TrendingUp className='w-5 h-5' />}
        >
          <TopRecommendedAlbums limit={12} />
        </ContentRow>

        {/* Latest Releases */}
        <ContentRow
          title='Latest Releases'
          subtitle='Recent albums sorted by release date'
          icon={<Music className='w-5 h-5' />}
          seeAllHref='/latest'
        >
          <Suspense fallback={<LoadingCards count={8} />}>
            <LatestReleasesSection />
          </Suspense>
        </ContentRow>
      </div>
    </div>
  );
}

// Server Components for each section
async function NewUsersSection() {
  const users = await getNewUsers(15);

  return (
    <div className='flex gap-6 overflow-x-auto pt-4 pb-4 px-1 -mx-1 custom-scrollbar'>
      {users.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
}

async function LatestReleasesSection() {
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
    <div className='space-y-4'>
      {newestReleaseDate && (
        <div className='text-center py-2'>
          <p className='text-zinc-500 text-xs'>
            Newest release:{' '}
            {new Date(newestReleaseDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>
      )}

      <div className='flex gap-6 overflow-x-auto overflow-y-clip pt-4 pb-4 px-1 -mx-1 custom-scrollbar overscroll-x-contain'>
        {releases.map(album => (
          <ReleaseCard key={album.id} album={album} />
        ))}
        <MoreReleasesCard />
      </div>
    </div>
  );
}

function MoreReleasesCard() {
  return (
    <Link href='/latest' className='flex-shrink-0 w-[240px] group'>
      <div className='bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/80 rounded-xl p-5 h-full flex flex-col items-center justify-center hover:border-green-500/50 hover:bg-zinc-800/60 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-green-500/10 min-h-[320px]'>
        <div className='w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mb-4 group-hover:bg-green-500/20 transition-colors'>
          <svg
            className='w-8 h-8 text-green-500'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M17 8l4 4m0 0l-4 4m4-4H3'
            />
          </svg>
        </div>
        <p className='text-white font-semibold text-center'>More Releases</p>
        <p className='text-zinc-500 text-sm text-center mt-1'>
          View all albums
        </p>
      </div>
    </Link>
  );
}

// UI Components
function ContentRow({
  title,
  subtitle,
  icon,
  children,
  seeAllHref,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  seeAllHref?: string;
}) {
  return (
    <section className='space-y-8'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center space-x-4'>
          <div className='text-cosmic-latte p-3 bg-cosmic-latte/10 rounded-xl border border-cosmic-latte/20'>
            {icon}
          </div>
          <div>
            <h2 className='text-3xl font-semibold text-white'>{title}</h2>
            <p className='text-lg text-zinc-400 mt-2 leading-relaxed'>
              {subtitle}
            </p>
          </div>
        </div>
        {seeAllHref && (
          <Link
            href={seeAllHref}
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
        )}
      </div>
      <div className='relative'>{children}</div>
    </section>
  );
}

function UserCard({ user }: { user: any }) {
  return (
    <Link href={`/profile/${user.id}`}>
      <div className='flex-shrink-0 w-[200px] bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/80 rounded-xl p-6 hover:border-emeraled-green/50 hover:bg-zinc-800/60 transition-all duration-300 group cursor-pointer hover:scale-105 hover:shadow-2xl hover:shadow-emeraled-green/10'>
        <div className='text-center space-y-4'>
          <Avatar className='w-20 h-20 mx-auto ring-2 ring-zinc-700/80 group-hover:ring-cosmic-latte/80 transition-all duration-300'>
            <AvatarImage
              src={user.image || undefined}
              alt={user.username || 'User'}
            />
            <AvatarFallback className='bg-gradient-to-br from-zinc-700 to-zinc-800 text-cosmic-latte text-xl font-semibold'>
              {user.username?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>

          <div className='space-y-2'>
            <h3 className='font-semibold text-white text-base truncate group-hover:text-cosmic-latte transition-colors'>
              {user.username || 'Anonymous User'}
            </h3>
            <div className='space-y-1'>
              <p className='text-sm text-zinc-400'>
                {user.followersCount || 0} followers
              </p>
              <p className='text-sm text-zinc-500'>
                {user.recommendationsCount || 0} recs
              </p>
            </div>
          </div>

          <div className='text-xs text-emeraled-green bg-gradient-to-r from-emeraled-green/15 to-emeraled-green/5 rounded-full px-4 py-2 font-medium border border-emeraled-green/20'>
            New Member
          </div>
        </div>
      </div>
    </Link>
  );
}

function SourceIcon({
  source,
  className,
}: {
  source: string;
  className?: string;
}) {
  switch (source) {
    case 'LISTENBRAINZ':
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src='https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/listenbrainz.svg'
          alt='ListenBrainz'
          title='ListenBrainz'
          className={className}
        />
      );
    case 'MUSICBRAINZ':
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src='https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/musicbrainz.svg'
          alt='MusicBrainz'
          title='MusicBrainz'
          className={className}
        />
      );
    default:
      return (
        <Music className={className} />
      );
  }
}

function ReleaseCard({
  album,
}: {
  album: {
    id: string;
    title: string;
    artists: string;
    coverArtUrl: string | null;
    cloudflareImageId: string | null;
    releaseDate: string | null;
    source: string;
  };
}) {
  return (
    <div className='flex-shrink-0 w-[240px] group'>
      <Link href={`/albums/${album.id}?source=local`} className='block'>
        <div className='bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/80 rounded-xl p-5 hover:border-green-500/50 hover:bg-zinc-800/60 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-green-500/10'>
          <div className='relative aspect-square mb-5'>
            <AlbumImage
              src={album.coverArtUrl}
              cloudflareImageId={album.cloudflareImageId}
              alt={album.title}
              className='w-full h-full object-cover rounded-lg shadow-xl'
            />
          </div>
          <div className='space-y-2'>
            <h3 className='font-semibold text-white text-base line-clamp-1 group-hover:text-cosmic-latte transition-colors'>
              {album.title}
            </h3>
            <p className='text-sm text-zinc-400 line-clamp-1'>
              {album.artists}
            </p>
            <div className='flex items-center justify-between'>
              <p className='text-xs text-zinc-500'>
                {album.releaseDate ? formatDateOnly(album.releaseDate) : 'Unknown date'}
              </p>
              <SourceIcon source={album.source} className='w-3.5 h-3.5' />
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

function LoadingCards({ count }: { count: number }) {
  return (
    <div className='flex gap-6 overflow-hidden'>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className='flex-shrink-0 w-[200px] bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-6'
        >
          <div className='animate-pulse'>
            <div className='w-20 h-20 mx-auto bg-zinc-700/60 rounded-full mb-5' />
            <div className='space-y-3'>
              <div className='h-4 bg-zinc-700/60 rounded mx-auto w-3/4' />
              <div className='h-3 bg-zinc-800/60 rounded mx-auto w-1/2' />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
