import { Suspense } from 'react';
import { Calendar, Users, Music, Star } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import AlbumImage from '@/components/ui/AlbumImage';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';

// Fetch functions
async function getSpotifyTrending() {
  const cache = await prisma.cacheData.findUnique({
    where: { key: 'spotify_trending' }
  });

  if (!cache || !cache.data || new Date(cache.expires) < new Date()) {
    return { newReleases: [], needsSync: true };
  }

  const data = cache.data as any;
  return {
    newReleases: data.newReleases || [],
    featuredPlaylists: data.featuredPlaylists || [],
    needsSync: false,
    expires: cache.expires,
    lastUpdated: cache.updatedAt
  };
}
// TODO: add Recent Recommendations Section
async function getNewUsers(limit: number = 15) {
  const users = await prisma.user.findMany({
    take: limit,
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      bio: true,
      followersCount: true,
      followingCount: true,
      recommendationsCount: true
    }
  });

  // Sort by ID descending as a proxy for creation order
  return users.sort((a, b) => b.id.localeCompare(a.id));
}

async function getTrendingArtists(limit: number = 12) {
  // Get artists with recent recommendations
  const recentRecs = await prisma.recommendation.findMany({
    where: {
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    },
    select: {
      recommendedAlbum: {
        select: {
          artists: {
            include: {
              artist: {
                select: {
                  id: true,
                  name: true,
                  imageUrl: true
                }
              }
            }
          }
        }
      },
      score: true
    },
    take: 100
  });

  // Aggregate by artist
  const artistMap = new Map<string, {
    artist: any;
    count: number;
    totalScore: number
  }>();

  recentRecs.forEach(rec => {
    rec.recommendedAlbum.artists.forEach(aa => {
      const existing = artistMap.get(aa.artist.id);
      if (existing) {
        existing.count++;
        existing.totalScore += rec.score;
      } else {
        artistMap.set(aa.artist.id, {
          artist: aa.artist,
          count: 1,
          totalScore: rec.score
        });
      }
    });
  });

  // Sort by count and return top artists
  return Array.from(artistMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map(({ artist, count, totalScore }) => ({
      ...artist,
      recommendationCount: count,
      averageScore: Math.round(totalScore / count * 10) / 10
    }));
}

export default async function BrowsePage() {
  return (
    <div className='space-y-8'>
      {/* Page Header */}
      <div id='browse-page-header' className='mb-8'>
        <h1 className='text-3xl font-bold text-white mb-2'>
          Discover Music & Community
        </h1>
        <p className='text-zinc-400'>
          Explore new music, connect with fellow music lovers, and discover your
          next favorite album
        </p>
      </div>

      {/* Content Sections */}
      <div className='space-y-12'>
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

        {/* Trending Artists Section */}
        <ContentRow
          title='Trending Artists'
          subtitle='Artists that the community is buzzing about'
          icon={<Star className='w-5 h-5' />}
        >
          <Suspense fallback={<LoadingCards count={8} />}>
            <TrendingArtistsSection />
          </Suspense>
        </ContentRow>

        {/* Hot Albums from Spotify */}
        <ContentRow
          title='Hot Albums Right Now'
          subtitle='New releases from Spotify'
          icon={<Music className='w-5 h-5' />}
        >
          <Suspense fallback={<LoadingCards count={8} />}>
            <SpotifyAlbumsSection />
          </Suspense>
        </ContentRow>

        {/* New Releases - Coming Soon */}
        <ContentRow
          title='New Releases'
          subtitle='Latest drops and upcoming albums'
          icon={<Calendar className='w-5 h-5' />}
        >
          <ComingSoonCard />
        </ContentRow>
      </div>
    </div>
  );
}

// Server Components for each section
async function NewUsersSection() {
  const users = await getNewUsers(15);

  return (
    <div className='flex space-x-4 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'>
      {users.map(user => (
        <UserCard
          key={user.id}
          user={user}
        />
      ))}
    </div>
  );
}

async function TrendingArtistsSection() {
  const artists = await getTrendingArtists(12);

  if (artists.length === 0) {
    return (
      <div className='text-center py-8 text-zinc-500'>
        No trending artists yet. Be the first to recommend some albums!
      </div>
    );
  }

  return (
    <div className='flex space-x-4 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'>
      {artists.map(artist => (
        <TrendingArtistCard key={artist.id} artist={artist} />
      ))}
    </div>
  );
}

async function SpotifyAlbumsSection() {
  const spotifyData = await getSpotifyTrending();

  if (spotifyData.needsSync || spotifyData.newReleases.length === 0) {
    return (
      <div className='text-center py-8 text-zinc-500'>
        <p>No Spotify data available. Sync may be needed.</p>
        <p className='text-xs mt-2'>Visit the admin dashboard to trigger a sync.</p>
      </div>
    );
  }

  return (
    <div className='flex space-x-4 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'>
      {spotifyData.newReleases.slice(0, 15).map((album: any) => (
        <SpotifyAlbumCard key={album.id} album={album} />
      ))}
    </div>
  );
}

// UI Components
function ContentRow({
  title,
  subtitle,
  icon,
  children
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className='space-y-4'>
      <div className='flex items-center space-x-3'>
        <div className='text-cosmic-latte'>{icon}</div>
        <div>
          <h2 className='text-lg font-semibold text-white'>{title}</h2>
          <p className='text-sm text-zinc-400'>{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function UserCard({ user }: { user: any }) {
  return (
    <Link href={`/profile/${user.id}`}>
      <div className='min-w-[160px] max-w-[160px] bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 hover:border-zinc-600 hover:bg-zinc-800/50 transition-all duration-200 group cursor-pointer'>
        <div className='text-center space-y-3'>
          <Avatar className='w-16 h-16 mx-auto border-2 border-zinc-700 group-hover:border-cosmic-latte transition-colors'>
            <AvatarImage
              src={user.image || undefined}
              alt={user.name || 'User'}
            />
            <AvatarFallback className='bg-zinc-700 text-cosmic-latte text-lg'>
              {user.name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>

          <div>
            <h3 className='font-medium text-white text-sm truncate group-hover:text-cosmic-latte transition-colors'>
              {user.name || 'Anonymous User'}
            </h3>
            <p className='text-xs text-zinc-400 mt-1'>
              {user.followersCount} followers
            </p>
            <p className='text-xs text-zinc-500'>
              {user.recommendationsCount} recommendations
            </p>
          </div>

          <div className='text-xs text-emeraled-green bg-emeraled-green/10 rounded px-2 py-1'>
            New Member
          </div>
        </div>
      </div>
    </Link>
  );
}

function TrendingArtistCard({ artist }: { artist: any }) {
  return (
    <div className='min-w-[160px] max-w-[160px] bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 hover:border-zinc-600 hover:bg-zinc-800/50 transition-all duration-200 group cursor-pointer'>
      <div className='text-center space-y-3'>
        <div className='relative w-16 h-16 mx-auto'>
          {artist.imageUrl ? (
            <img
              src={artist.imageUrl}
              alt={artist.name}
              className='w-full h-full rounded-full object-cover border-2 border-zinc-700 group-hover:border-cosmic-latte transition-colors'
            />
          ) : (
            <div className='w-full h-full bg-zinc-700 rounded-full flex items-center justify-center border-2 border-zinc-700 group-hover:border-cosmic-latte transition-colors'>
              <Music className='w-6 h-6 text-zinc-400' />
            </div>
          )}
        </div>

        <div>
          <h3 className='font-medium text-white text-sm truncate group-hover:text-cosmic-latte transition-colors'>
            {artist.name}
          </h3>
          <p className='text-xs text-zinc-400 mt-1'>
            {artist.recommendationCount} recommendations
          </p>
          <p className='text-xs text-zinc-500'>
            ⭐ {artist.averageScore}/10
          </p>
        </div>
      </div>
    </div>
  );
}

function SpotifyAlbumCard({ album }: { album: any }) {
  return (
    <div className='min-w-[200px] max-w-[200px] group'>
      <a
        href={album.spotifyUrl}
        target='_blank'
        rel='noopener noreferrer'
        className='block'
      >
        <div className='relative aspect-square mb-3'>
          <AlbumImage
            src={album.image}
            alt={album.name}
            className='w-full h-full object-cover rounded-lg shadow-lg group-hover:shadow-xl transition-shadow duration-200'
          />
          {/* Spotify badge */}
          <div className='absolute top-2 right-2 bg-green-500 text-black text-xs font-bold px-2 py-1 rounded-full'>
            SPOTIFY
          </div>
        </div>
        <div className='space-y-1'>
          <h3 className='font-medium text-white text-sm truncate group-hover:text-cosmic-latte transition-colors'>
            {album.name}
          </h3>
          <p className='text-xs text-zinc-400 truncate'>{album.artists}</p>
          <p className='text-xs text-zinc-500'>
            Released: {new Date(album.releaseDate).toLocaleDateString()}
          </p>
        </div>
      </a>
    </div>
  );
}

function ComingSoonCard() {
  return (
    <div className='flex justify-center'>
      <div className='min-w-[300px] bg-gradient-to-r from-zinc-900/80 to-zinc-800/80 border border-zinc-700 rounded-lg p-8 text-center'>
        <div className='space-y-4'>
          <div className='text-6xl'>🎵</div>
          <div>
            <h3 className='text-xl font-semibold text-white mb-2'>
              New Releases
            </h3>
            <p className='text-zinc-400 text-sm mb-4'>
              Fresh music drops coming soon! We&apos;re working on integrating the
              latest releases from your favorite artists.
            </p>
            <div className='inline-flex items-center space-x-2 text-emeraled-green text-sm font-medium'>
              <Calendar className='w-4 h-4' />
              <span>Coming Soon</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingCards({ count }: { count: number }) {
  return (
    <div className='flex space-x-4 overflow-hidden'>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className='min-w-[160px] max-w-[160px] bg-zinc-900/50 border border-zinc-800 rounded-lg p-4'
        >
          <div className='animate-pulse'>
            <div className='w-16 h-16 mx-auto bg-zinc-700 rounded-full mb-3' />
            <div className='h-4 bg-zinc-700 rounded mb-2' />
            <div className='h-3 bg-zinc-800 rounded' />
          </div>
        </div>
      ))}
    </div>
  );
}