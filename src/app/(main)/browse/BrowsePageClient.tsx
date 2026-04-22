'use client';

import Link from 'next/link';
import { Calendar, Users, Music, Star } from 'lucide-react';

import AlbumImage from '@/components/ui/AlbumImage';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  useGetBrowseNewUsersQuery,
  useGetTopRecommendedArtistsQuery,
  useGetTopRecommendedAlbumsQuery,
} from '@/generated/graphql';

interface User {
  id: string;
  username?: string | null;
  email?: string | null;
  image?: string | null;
  bio?: string | null;
  followersCount: number;
  followingCount: number;
  recommendationsCount: number;
  createdAt?: string | Date;
}

interface BrowsePageClientProps {
  initialUsers: User[];
}

export default function BrowsePageClient({
  initialUsers,
}: BrowsePageClientProps) {
  const { data: newUsersData, isLoading: loadingUsers } =
    useGetBrowseNewUsersQuery({ limit: 15 });

  const { data: artistsData, isLoading: loadingArtists } =
    useGetTopRecommendedArtistsQuery({ limit: 12 });

  const { data: albumsData, isLoading: loadingAlbums } =
    useGetTopRecommendedAlbumsQuery({ limit: 15 });

  const newUsers: User[] = (newUsersData?.browseNewUsers as User[]) || initialUsers.slice(0, 10);
  const trendingArtists = artistsData?.topRecommendedArtists || [];
  const trendingAlbums = albumsData?.topRecommendedAlbums || [];

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

      {/* Content Rows */}
      <div className='space-y-12'>
        {/* Newly Created Users Row */}
        <ContentRow
          title='Welcome New Music Lovers'
          subtitle='Connect with our newest community members'
          icon={<Users className='w-5 h-5' />}
        >
          <div className='flex space-x-4 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'>
            {loadingUsers
              ? Array.from({ length: 8 }).map((_, i) => (
                  <ArtistCardSkeleton key={i} />
                ))
              : newUsers.map(user => (
                  <UserCard key={user.id} user={user} />
                ))}
          </div>
        </ContentRow>

        {/* Recently Recommended Artists Row */}
        <ContentRow
          title='Trending Artists'
          subtitle='Artists that the community is buzzing about'
          icon={<Star className='w-5 h-5' />}
        >
          <div className='flex space-x-4 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'>
            {loadingArtists
              ? Array.from({ length: 8 }).map((_, i) => (
                  <ArtistCardSkeleton key={i} />
                ))
              : trendingArtists.map(item => (
                  <TrendingArtistCard key={item.artist.id} item={item} />
                ))}
          </div>
        </ContentRow>

        {/* Recently Recommended Albums Row */}
        <ContentRow
          title='Hot Albums Right Now'
          subtitle='Albums getting love from the community'
          icon={<Music className='w-5 h-5' />}
        >
          <div className='flex space-x-4 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'>
            {loadingAlbums
              ? Array.from({ length: 8 }).map((_, i) => (
                  <AlbumCardSkeleton key={i} />
                ))
              : trendingAlbums.map(item => (
                  <TrendingAlbumCard key={item.album.id} item={item} />
                ))}
          </div>
        </ContentRow>

        {/* New Releases Row - Coming Soon */}
        <ContentRow
          title='New Releases'
          subtitle='Latest drops and upcoming albums'
          icon={<Calendar className='w-5 h-5' />}
        >
          <div className='flex justify-center'>
            <ComingSoonCard />
          </div>
        </ContentRow>
      </div>
    </div>
  );
}

// Content Row Container Component
interface ContentRowProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function ContentRow({ title, subtitle, icon, children }: ContentRowProps) {
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

// User Card Component
function UserCard({ user }: { user: User }) {
  return (
    <Link href={`/profile/${user.id}`}>
      <div className='min-w-[160px] max-w-[160px] bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 hover:border-zinc-600 hover:bg-zinc-800/50 transition-all duration-200 group cursor-pointer'>
        <div className='text-center space-y-3'>
          <Avatar className='w-16 h-16 mx-auto border-2 border-zinc-700 group-hover:border-cosmic-latte transition-colors'>
            <AvatarImage
              src={user.image || undefined}
              alt={user.username || 'User'}
            />
            <AvatarFallback className='bg-zinc-700 text-cosmic-latte text-lg'>
              {user.username?.charAt(0) || 'A'}
            </AvatarFallback>
          </Avatar>

          <div>
            <h3 className='font-medium text-white text-sm truncate group-hover:text-cosmic-latte transition-colors'>
              {user.username || 'Anonymous music enjoyer'}
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

// Artist Card Skeleton
function ArtistCardSkeleton() {
  return (
    <div className='min-w-[160px] max-w-[160px] bg-zinc-900/50 border border-zinc-800 rounded-lg p-4'>
      <div className='text-center space-y-3'>
        <div className='w-16 h-16 mx-auto bg-zinc-700 rounded-full animate-pulse' />
        <div>
          <div className='h-4 bg-zinc-700 rounded animate-pulse mb-2' />
          <div className='h-3 bg-zinc-800 rounded animate-pulse' />
        </div>
        <div className='text-xs text-zinc-500 bg-zinc-800 rounded px-2 py-1 animate-pulse'>
          Loading...
        </div>
      </div>
    </div>
  );
}

// Trending Artist Card Component (adapted for GraphQL shape)
function TrendingArtistCard({
  item,
}: {
  item: {
    artist: {
      id: string;
      name: string;
      imageUrl?: string | null;
      cloudflareImageId?: string | null;
    };
    recommendationCount: number;
    albumsInRecommendations: number;
    averageScore: number;
  };
}) {
  return (
    <div className='min-w-[160px] max-w-[160px] bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 hover:border-zinc-600 hover:bg-zinc-800/50 transition-all duration-200 group cursor-pointer'>
      <div className='text-center space-y-3'>
        <div className='relative w-16 h-16 mx-auto'>
          {item.artist.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.artist.imageUrl}
              alt={item.artist.name}
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
            {item.artist.name}
          </h3>
          <p className='text-xs text-zinc-400 mt-1'>
            {item.recommendationCount} recommendations
          </p>
          <p className='text-xs text-zinc-500'>
            {item.albumsInRecommendations} albums
          </p>
        </div>

        <div className='text-xs text-emeraled-green bg-emeraled-green/10 rounded px-2 py-1'>
          {item.averageScore.toFixed(1)}/10
        </div>
      </div>
    </div>
  );
}

// Album Card Skeleton
function AlbumCardSkeleton() {
  return (
    <div className='min-w-[160px] max-w-[160px] bg-zinc-900/50 border border-zinc-800 rounded-lg p-3'>
      <div className='space-y-3'>
        <div className='w-full aspect-square bg-zinc-700 rounded animate-pulse' />
        <div className='space-y-1'>
          <div className='h-4 bg-zinc-700 rounded animate-pulse' />
          <div className='h-3 bg-zinc-800 rounded animate-pulse' />
          <div className='h-3 bg-zinc-800 rounded animate-pulse w-3/4' />
        </div>
      </div>
    </div>
  );
}

// Trending Album Card Component (adapted for GraphQL shape)
function TrendingAlbumCard({
  item,
}: {
  item: {
    album: {
      id: string;
      title: string;
      coverArtUrl?: string | null;
      cloudflareImageId?: string | null;
      releaseDate?: Date | null;
      artists: Array<{
        artist: {
          id: string;
          name: string;
        };
      }>;
    };
    recommendationCount: number;
    averageScore: number;
  };
}) {
  const artistName =
    item.album.artists.map(a => a.artist.name).join(', ') || 'Unknown Artist';

  return (
    <div className='min-w-[160px] max-w-[160px] bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 hover:border-zinc-600 hover:bg-zinc-800/50 transition-all duration-200 group cursor-pointer'>
      <div className='space-y-3'>
        <div className='relative'>
          <AlbumImage
            src={item.album.coverArtUrl}
            cloudflareImageId={item.album.cloudflareImageId}
            alt={`${item.album.title} by ${artistName}`}
            width={144}
            height={144}
            className='w-full aspect-square rounded object-cover border border-zinc-700 group-hover:border-zinc-500 transition-colors'
          />
          <div className='absolute top-2 right-2 bg-black/60 rounded px-1.5 py-0.5'>
            <span className='text-xs text-emeraled-green font-medium'>
              {item.averageScore.toFixed(1)}/10
            </span>
          </div>
          <div className='absolute bottom-2 left-2 bg-black/60 rounded px-1.5 py-0.5'>
            <span className='text-xs text-white font-medium'>
              {item.recommendationCount}x
            </span>
          </div>
        </div>

        <div className='space-y-1'>
          <h3 className='font-medium text-white text-sm truncate group-hover:text-cosmic-latte transition-colors'>
            {item.album.title}
          </h3>
          <p className='text-xs text-zinc-400 truncate'>{artistName}</p>
        </div>
      </div>
    </div>
  );
}

// Coming Soon Card Component
function ComingSoonCard() {
  return (
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
  );
}
