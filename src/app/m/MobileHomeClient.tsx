'use client';

import { useEffect, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { RefreshCw, Users, AlertCircle } from 'lucide-react';
import type { Session } from 'next-auth';

import MobileRecommendationCard from '@/components/mobile/MobileRecommendationCard';
import MobileCollectionCard from '@/components/mobile/MobileCollectionCard';
import MobileFollowCard from '@/components/mobile/MobileFollowCard';
import { MobileButton } from '@/components/mobile/MobileButton';
import { groupActivities } from '@/utils/activity-grouping';

interface ActivityMetadata {
  score?: number;
  basisAlbum?: {
    id: string;
    title: string;
    coverArtUrl?: string;
    cloudflareImageId?: string;
    artists?: Array<{ artist?: { name?: string } }>;
  };
  collectionName?: string;
  personalRating?: number;
}

interface Activity {
  id: string;
  type: 'follow' | 'recommendation' | 'profile_update' | 'collection_add';
  actorId: string;
  actorName: string;
  actorImage: string | null;
  targetId?: string;
  targetName?: string;
  targetImage?: string | null;
  albumId?: string;
  albumTitle?: string;
  albumArtist?: string;
  artistId?: string;
  albumImage?: string | null;
  albumCloudflareImageId?: string | null;
  createdAt: string;
  metadata?: ActivityMetadata;
}

interface GroupedActivity {
  id: string;
  type: Activity['type'];
  actorId: string;
  actorName: string;
  actorImage: string | null;
  createdAt: string;
  earliestCreatedAt: string;
  activities: Activity[];
  isGrouped: boolean;
}

interface MobileHomeClientProps {
  session: Session;
}

export default function MobileHomeClient({ session }: MobileHomeClientProps) {
  const { ref: sentinelRef, inView } = useInView({ threshold: 0 });

  const fetchActivities = async ({ pageParam }: { pageParam?: string }) => {
    const query = `
      query GetSocialFeed($type: ActivityType, $cursor: String, $limit: Int) {
        socialFeed(type: $type, cursor: $cursor, limit: $limit) {
          activities {
            id
            type
            createdAt
            actor {
              id
              username
              image
            }
            targetUser {
              id
              username
              image
            }
            album {
              id
              title
              coverArtUrl
              cloudflareImageId
              artists {
                artist {
                  id
                  name
                }
              }
            }
            recommendation {
              id
              score
            }
            collection {
              id
              name
            }
            metadata {
              score
              basisAlbum {
                id
                title
                coverArtUrl
                cloudflareImageId
                artists {
                  artist {
                    id
                    name
                  }
                }
              }
              collectionName
              personalRating
              position
            }
          }
          cursor
          hasMore
        }
      }
    `;

    const response = await fetch('/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        query,
        variables: {
          type: null,
          cursor: pageParam,
          limit: 15,
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch activities');
    }

    const { data, errors } = await response.json();

    if (errors) {
      throw new Error(errors[0].message);
    }

    const activities = data.socialFeed.activities.map(
      (activity: {
        id: string;
        type: string;
        createdAt: string;
        actor: { id: string; username: string; image: string | null };
        targetUser?: { id: string; username: string; image: string | null };
        album?: {
          id: string;
          title: string;
          coverArtUrl?: string;
          cloudflareImageId?: string;
          artists?: Array<{ artist: { id: string; name: string } }>;
        };
        metadata?: ActivityMetadata;
      }) => ({
        id: activity.id,
        type: activity.type.toLowerCase().replace('_', '_'),
        actorId: activity.actor.id,
        actorName: activity.actor.username,
        actorImage: activity.actor.image,
        targetId: activity.targetUser?.id,
        targetName: activity.targetUser?.username,
        targetImage: activity.targetUser?.image,
        albumId: activity.album?.id,
        albumTitle: activity.album?.title,
        albumArtist: activity.album?.artists?.[0]?.artist?.name,
        artistId: activity.album?.artists?.[0]?.artist?.id,
        albumImage: activity.album?.coverArtUrl,
        albumCloudflareImageId: activity.album?.cloudflareImageId ?? null,
        createdAt: activity.createdAt,
        metadata: activity.metadata
          ? {
              score: activity.metadata.score,
              basisAlbum: activity.metadata.basisAlbum,
              collectionName: activity.metadata.collectionName,
              personalRating: activity.metadata.personalRating,
            }
          : undefined,
      })
    );

    return {
      activities,
      nextCursor: data.socialFeed.cursor,
      hasMore: data.socialFeed.hasMore,
    };
  };

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['mobile-social-feed'],
    queryFn: fetchActivities,
    initialPageParam: undefined,
    getNextPageParam: lastPage => lastPage.nextCursor,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const groupedActivities = useMemo(() => {
    const allActivities =
      data?.pages?.flatMap(page => page.activities || []) || [];

    // Deduplicate by activity ID (handles pagination drift and DB duplicates)
    const seen = new Set<string>();
    const activities = allActivities.filter(activity => {
      if (seen.has(activity.id)) return false;
      seen.add(activity.id);
      return true;
    });

    return groupActivities(activities) as GroupedActivity[];
  }, [data?.pages]);

  // Infinite scroll trigger
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Loading state
  if (isLoading) {
    return (
      <div className='px-4 pt-4'>
        <header className='mb-6'>
          <div className='h-7 w-40 bg-zinc-800 rounded animate-pulse' />
          <div className='h-4 w-56 bg-zinc-800 rounded animate-pulse mt-2' />
        </header>
        <div className='space-y-4'>
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className='bg-zinc-900 rounded-lg p-4 border border-zinc-800 animate-pulse'
            >
              <div className='flex items-center gap-2 mb-3'>
                <div className='h-8 w-8 bg-zinc-800 rounded-full' />
                <div className='flex-1'>
                  <div className='h-4 w-24 bg-zinc-800 rounded' />
                  <div className='h-3 w-16 bg-zinc-800 rounded mt-1' />
                </div>
              </div>
              <div className='flex items-center justify-center gap-2'>
                <div className='h-[120px] w-[120px] bg-zinc-800 rounded-lg' />
                <div className='flex flex-col items-center gap-1 px-1'>
                  <div className='h-4 w-4 bg-zinc-800 rounded' />
                  <div className='h-6 w-12 bg-zinc-800 rounded-full' />
                </div>
                <div className='h-[120px] w-[120px] bg-zinc-800 rounded-lg' />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] px-6 text-center'>
        <div className='w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4'>
          <AlertCircle className='h-8 w-8 text-zinc-600' />
        </div>
        <h2 className='text-xl font-bold text-white mb-2'>
          Something went wrong
        </h2>
        <p className='text-zinc-400 mb-6'>
          {error instanceof Error ? error.message : 'Failed to load feed'}
        </p>
        <MobileButton
          onClick={() => refetch()}
          leftIcon={<RefreshCw className='h-4 w-4' />}
        >
          Try Again
        </MobileButton>
      </div>
    );
  }

  // Empty state
  if (groupedActivities.length === 0) {
    return (
      <div className='px-4 pt-4'>
        <header className='mb-6'>
          <h1 className='text-2xl font-bold text-white'>
            {session.user?.username ? `Hey, ${session.user.username}` : 'Home'}
          </h1>
          <p className='text-sm text-zinc-400 mt-1'>
            See what your friends are listening to
          </p>
        </header>
        <div className='flex flex-col items-center justify-center min-h-[50vh] px-6 text-center'>
          <div className='w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4'>
            <Users className='h-8 w-8 text-zinc-600' />
          </div>
          <h2 className='text-xl font-bold text-white mb-2'>No Activity Yet</h2>
          <p className='text-zinc-400 mb-6 max-w-xs'>
            Follow some users to see their music recommendations and collection
            updates here.
          </p>
          <MobileButton
            variant='outline'
            leftIcon={<Users className='h-4 w-4' />}
            onClick={() => (window.location.href = '/m/search')}
          >
            Find People to Follow
          </MobileButton>
        </div>
      </div>
    );
  }

  return (
    <div className='px-4 pt-4'>
      {/* Header */}
      <header className='mb-6'>
        <h1 className='text-2xl font-bold text-white'>
          {session.user?.username ? `Hey, ${session.user.username}` : 'Home'}
        </h1>
        <p className='text-sm text-zinc-400 mt-1'>
          See what your friends are listening to
        </p>
      </header>

      {/* Feed */}
      <div className='space-y-4'>
        {groupedActivities.map(group => {
          const activity = group.activities[0];
          switch (activity.type) {
            case 'recommendation':
              return (
                <MobileRecommendationCard key={group.id} activity={activity} />
              );
            case 'collection_add':
              return (
                <MobileCollectionCard key={group.id} activity={activity} />
              );
            case 'follow':
              return <MobileFollowCard key={group.id} activity={activity} />;
            default:
              return null;
          }
        })}
      </div>

      {/* Infinite scroll sentinel */}
      {hasNextPage && <div ref={sentinelRef} className='h-4' />}

      {/* Loading more indicator */}
      {isFetchingNextPage && (
        <div className='flex justify-center py-4'>
          <div className='h-6 w-6 border-2 border-emeraled-green border-t-transparent rounded-full animate-spin' />
        </div>
      )}

      {/* End of feed */}
      {!hasNextPage && groupedActivities.length > 0 && (
        <div className='text-center py-8'>
          <p className='text-sm text-zinc-500'>You&apos;re all caught up!</p>
        </div>
      )}
    </div>
  );
}
