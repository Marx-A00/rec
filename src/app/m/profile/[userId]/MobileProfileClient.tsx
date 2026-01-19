'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Share2,
  Settings,
  Music,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import Link from 'next/link';

import AlbumImage from '@/components/ui/AlbumImage';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MobileButton } from '@/components/mobile/MobileButton';
import FollowButton from '@/components/profile/FollowButton';
import { cn } from '@/lib/utils';

interface UserData {
  id: string;
  username: string | null;
  email: string | null;
  image: string | null;
  bio: string | null;
  followersCount: number;
  followingCount: number;
  recommendationsCount: number;
}

interface RecommendationData {
  id: string;
  score: number;
  createdAt: Date;
  basisAlbum: {
    id: string;
    title: string;
    coverArtUrl: string | null;
    artists: Array<{ artist: { id: string; name: string } }>;
  };
  recommendedAlbum: {
    id: string;
    title: string;
    coverArtUrl: string | null;
    artists: Array<{ artist: { id: string; name: string } }>;
  };
}

interface CollectionAlbumData {
  id: string;
  album: {
    id: string;
    title: string;
    coverArtUrl: string | null;
  };
}

type TabType = 'recs' | 'collection';

interface MobileProfileClientProps {
  user: UserData;
  recommendations: RecommendationData[];
  collections: CollectionAlbumData[];
  isOwnProfile: boolean;
  isFollowingUser: boolean;
}

export default function MobileProfileClient({
  user,
  recommendations,
  collections,
  isOwnProfile,
  isFollowingUser,
}: MobileProfileClientProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('recs');
  const [followerCountDelta, setFollowerCountDelta] = useState(0);

  const displayedFollowersCount = user.followersCount + followerCountDelta;

  const handleFollowChange = useCallback(
    (isFollowing: boolean) => {
      setFollowerCountDelta(prev => (isFollowing ? prev + 1 : prev - 1));
      queryClient.invalidateQueries({ queryKey: ['GetUserProfile'] });
    },
    [queryClient]
  );

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: user.username || 'User Profile',
          text: `Check out ${user.username || 'this user'}'s profile on Rec`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
      }
    } catch {
      // User cancelled or share failed
    }
  };

  return (
    <div className='min-h-screen bg-black pb-4'>
      {/* Sticky Header */}
      <div className='sticky top-0 z-10 bg-black/90 backdrop-blur-sm border-b border-zinc-800 px-4 py-3'>
        <div className='flex items-center justify-between'>
          <button
            onClick={() => router.back()}
            className='flex items-center gap-2 text-white min-h-[44px] min-w-[44px]'
            aria-label='Go back'
          >
            <ArrowLeft className='h-5 w-5' />
          </button>
          <h1 className='text-lg font-semibold text-white'>
            {user.username || 'Profile'}
          </h1>
          <div className='flex items-center gap-2'>
            <button
              onClick={handleShare}
              className='min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-400'
              aria-label='Share profile'
            >
              <Share2 className='h-5 w-5' />
            </button>
            {isOwnProfile && (
              <Link
                href='/m/settings'
                className='min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-400'
                aria-label='Settings'
              >
                <Settings className='h-5 w-5' />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Profile Hero */}
      <section className='px-4 py-6 flex flex-col items-center'>
        <Avatar className='w-20 h-20 mb-4 border-2 border-zinc-700'>
          <AvatarImage
            src={user.image || undefined}
            alt={user.username || 'User'}
          />
          <AvatarFallback className='bg-zinc-800 text-2xl'>
            {(user.username || 'U')[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <h2 className='text-xl font-bold text-white mb-1'>
          {user.username || 'Anonymous User'}
        </h2>

        {user.bio && (
          <p className='text-sm text-zinc-400 text-center max-w-xs mb-4 line-clamp-3'>
            {user.bio}
          </p>
        )}

        {/* Stats Row */}
        <div className='flex gap-8 mb-4'>
          <Link
            href={`/m/profile/${user.id}/followers`}
            className='flex flex-col items-center min-h-[44px] justify-center'
          >
            <span className='text-lg font-semibold text-white'>
              {displayedFollowersCount}
            </span>
            <span className='text-xs text-zinc-500'>Followers</span>
          </Link>
          <Link
            href={`/m/profile/${user.id}/following`}
            className='flex flex-col items-center min-h-[44px] justify-center'
          >
            <span className='text-lg font-semibold text-white'>
              {user.followingCount}
            </span>
            <span className='text-xs text-zinc-500'>Following</span>
          </Link>
          <div className='flex flex-col items-center'>
            <span className='text-lg font-semibold text-white'>
              {user.recommendationsCount}
            </span>
            <span className='text-xs text-zinc-500'>Recs</span>
          </div>
        </div>

        {/* Action Buttons */}
        {!isOwnProfile && session?.user?.id && (
          <div className='flex gap-3'>
            <FollowButton
              userId={user.id}
              initialFollowing={isFollowingUser}
              onFollowChange={handleFollowChange}
              className='px-6'
            />
          </div>
        )}

        {isOwnProfile && (
          <div className='flex gap-3'>
            <Link href='/m/profile/edit'>
              <MobileButton variant='secondary' size='sm'>
                Edit Profile
              </MobileButton>
            </Link>
            <MobileButton
              variant='outline'
              size='sm'
              onClick={() => signOut({ callbackUrl: '/' })}
              leftIcon={<LogOut className='h-4 w-4' />}
            >
              Sign Out
            </MobileButton>
          </div>
        )}
      </section>

      {/* Tab Navigation */}
      <div className='px-4 mb-4'>
        <div className='flex bg-zinc-900 rounded-lg p-1'>
          <button
            onClick={() => setActiveTab('recs')}
            className={cn(
              'flex-1 py-2.5 text-sm font-medium rounded-md transition-colors min-h-[44px]',
              activeTab === 'recs'
                ? 'bg-cosmic-latte text-black'
                : 'text-zinc-400'
            )}
          >
            Recommendations
          </button>
          <button
            onClick={() => setActiveTab('collection')}
            className={cn(
              'flex-1 py-2.5 text-sm font-medium rounded-md transition-colors min-h-[44px]',
              activeTab === 'collection'
                ? 'bg-cosmic-latte text-black'
                : 'text-zinc-400'
            )}
          >
            Collection
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className='px-4'>
        {/* Recommendations Tab */}
        {activeTab === 'recs' && (
          <section>
            {recommendations.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-12 text-center'>
                <div className='w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4'>
                  <Music className='h-8 w-8 text-zinc-600' />
                </div>
                <p className='text-white font-medium mb-2'>
                  {isOwnProfile
                    ? 'No Recommendations Yet'
                    : 'No Recommendations'}
                </p>
                <p className='text-sm text-zinc-500 max-w-xs mb-4'>
                  {isOwnProfile
                    ? 'Start recommending albums you love to share your music taste with others.'
                    : `${user.username || 'This user'} hasn't made any recommendations yet.`}
                </p>
                {isOwnProfile && (
                  <MobileButton
                    variant='outline'
                    size='sm'
                    onClick={() => router.push('/m/search')}
                  >
                    Find Albums to Recommend
                  </MobileButton>
                )}
              </div>
            ) : (
              <div className='grid grid-cols-2 gap-3'>
                {recommendations.map(rec => (
                  <Link
                    key={rec.id}
                    href={`/m/albums/${rec.recommendedAlbum.id}`}
                    className='bg-zinc-900 rounded-lg p-3 border border-zinc-800 active:scale-[0.98] transition-transform'
                  >
                    {/* Album Covers Row */}
                    <div className='flex items-center justify-center gap-2 mb-2'>
                      <div className='w-12 h-12 flex-shrink-0 rounded-md overflow-hidden'>
                        <AlbumImage
                          src={rec.basisAlbum.coverArtUrl}
                          alt={rec.basisAlbum.title}
                          width={48}
                          height={48}
                          className='w-full h-full object-cover'
                        />
                      </div>
                      <ChevronRight className='h-4 w-4 text-zinc-500 flex-shrink-0' />
                      <div className='w-12 h-12 flex-shrink-0 rounded-md overflow-hidden'>
                        <AlbumImage
                          src={rec.recommendedAlbum.coverArtUrl}
                          alt={rec.recommendedAlbum.title}
                          width={48}
                          height={48}
                          className='w-full h-full object-cover'
                        />
                      </div>
                    </div>

                    {/* Score Badge */}
                    <div className='flex justify-center mb-2'>
                      <span className='text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full'>
                        {rec.score}% match
                      </span>
                    </div>

                    {/* Album Info */}
                    <div className='text-center'>
                      <p className='text-sm font-medium text-white truncate'>
                        {rec.recommendedAlbum.title}
                      </p>
                      <p className='text-xs text-zinc-500 truncate'>
                        {rec.recommendedAlbum.artists
                          .map(a => a.artist.name)
                          .join(', ')}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Collection Tab */}
        {activeTab === 'collection' && (
          <section>
            {collections.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-12 text-center'>
                <div className='w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4'>
                  <Music className='h-8 w-8 text-zinc-600' />
                </div>
                <p className='text-white font-medium mb-2'>
                  {isOwnProfile ? 'Collection Empty' : 'No Albums Collected'}
                </p>
                <p className='text-sm text-zinc-500 max-w-xs mb-4'>
                  {isOwnProfile
                    ? 'Add albums to your collection to keep track of your favorite music.'
                    : `${user.username || 'This user'} hasn't added any albums to their collection yet.`}
                </p>
                {isOwnProfile && (
                  <MobileButton
                    variant='outline'
                    size='sm'
                    onClick={() => router.push('/m/search')}
                  >
                    Browse Albums
                  </MobileButton>
                )}
              </div>
            ) : (
              <div className='grid grid-cols-3 gap-2'>
                {collections.map(albumEntry => (
                  <Link
                    key={albumEntry.id}
                    href={`/m/albums/${albumEntry.album.id}`}
                    className='aspect-square rounded-md overflow-hidden active:scale-[0.95] transition-transform'
                  >
                    <AlbumImage
                      src={albumEntry.album.coverArtUrl || undefined}
                      alt={albumEntry.album.title}
                      width={120}
                      height={120}
                      className='w-full h-full object-cover'
                    />
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
