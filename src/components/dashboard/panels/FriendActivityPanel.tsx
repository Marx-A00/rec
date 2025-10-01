// src/components/dashboard/panels/FriendActivityPanel.tsx
// @ts-nocheck - Friend panel type issues, needs cleanup
'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Heart, User, Settings, ChevronDown } from 'lucide-react';

import { PanelComponentProps } from '@/types/mosaic';
import AlbumImage from '@/components/ui/AlbumImage';
import { Button } from '@/components/ui/button';

interface Friend {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  isOnline: boolean;
}

interface FriendActivity {
  id: string;
  friend: Friend;
  type: 'recommendation' | 'collection_add' | 'rating';
  album: {
    id: string;
    title: string;
    artist: string;
    imageUrl?: string;
  };
  description: string;
  timestamp: string;
}

export default function FriendActivityPanel({
  panelId,
  config,
  isEditMode,
}: PanelComponentProps) {
  const { data: session } = useSession();
  const user = session?.user;
  const [selectedFriend, setSelectedFriend] = useState<string>('all');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [activities, setActivities] = useState<FriendActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFriendSelector, setShowFriendSelector] = useState(false);

  // Mock friends data
  const mockFriends: Friend[] = [
    {
      id: '1',
      name: 'Alex Chen',
      username: '@alexmusic',
      avatar: undefined,
      isOnline: true,
    },
    {
      id: '2',
      name: 'Maria Rodriguez',
      username: '@mariabeats',
      avatar: undefined,
      isOnline: false,
    },
    {
      id: '3',
      name: 'Jordan Kim',
      username: '@jordanvibes',
      avatar: undefined,
      isOnline: true,
    },
    {
      id: '4',
      name: 'Sam Taylor',
      username: '@samtunes',
      avatar: undefined,
      isOnline: false,
    },
  ];

  // Fetch friend activities
  useEffect(() => {
    if (user && !isEditMode) {
      const fetchActivities = async () => {
        setIsLoading(true);
        try {
          // Mock activity data
          setTimeout(() => {
            const mockActivities: FriendActivity[] = [
              {
                id: '1',
                friend: mockFriends[0],
                type: 'recommendation',
                album: {
                  id: '1',
                  title: 'Random Access Memories',
                  artist: 'Daft Punk',
                  imageUrl: '/demo-albums/RAM-daft-punk.jpeg',
                },
                description: 'recommended this album',
                timestamp: '2 hours ago',
              },
              {
                id: '2',
                friend: mockFriends[1],
                type: 'collection_add',
                album: {
                  id: '2',
                  title: 'BRAT',
                  artist: 'Charli XCX',
                  imageUrl: '/Charli_XCX_-_Brat_(album_cover).png',
                },
                description: 'added to collection',
                timestamp: '4 hours ago',
              },
              {
                id: '3',
                friend: mockFriends[2],
                type: 'rating',
                album: {
                  id: '3',
                  title: 'Discovery',
                  artist: 'Daft Punk',
                  imageUrl: '/demo-albums/discovery-daft-punk.jpg',
                },
                description: 'rated 9/10',
                timestamp: '1 day ago',
              },
              {
                id: '4',
                friend: mockFriends[0],
                type: 'collection_add',
                album: {
                  id: '4',
                  title: 'Reflections',
                  artist: 'Hannah Diamond',
                  imageUrl: '/reflections-hannah-diamond.webp',
                },
                description: 'added to collection',
                timestamp: '2 days ago',
              },
            ];

            // Filter by selected friend if not 'all'
            const filteredActivities =
              selectedFriend === 'all'
                ? mockActivities
                : mockActivities.filter(
                    activity => activity.friend.id === selectedFriend
                  );

            setActivities(filteredActivities);
            setFriends(mockFriends);
            setIsLoading(false);
          }, 800);
        } catch (error) {
          console.error('Error fetching friend activities:', error);
          setIsLoading(false);
        }
      };

      fetchActivities();
    }
  }, [user, isEditMode, selectedFriend]);

  const getActivityIcon = (type: FriendActivity['type']) => {
    switch (type) {
      case 'recommendation':
        return <Heart className='w-3 h-3 text-red-400' />;
      case 'collection_add':
        return <User className='w-3 h-3 text-blue-400' />;
      case 'rating':
        return <span className='text-xs text-yellow-400'>★</span>;
      default:
        return <User className='w-3 h-3 text-zinc-400' />;
    }
  };

  // Show preview content in edit mode
  if (isEditMode) {
    return (
      <div className='bg-zinc-900/50 p-6 h-full overflow-hidden'>
        <div className='h-full flex flex-col'>
          <div className='mb-3 flex-shrink-0'>
            <p className='text-sm text-zinc-400 mb-2'>Panel Preview</p>
            <h2 className='text-lg font-semibold text-white'>
              Friend Activity
            </h2>
          </div>

          <div className='flex-1 space-y-3'>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className='flex items-center gap-3 p-3 bg-zinc-800/30 rounded-lg'
              >
                <div className='w-8 h-8 bg-zinc-700 rounded-full animate-pulse flex-shrink-0' />
                <div className='w-10 h-10 bg-zinc-700 rounded animate-pulse flex-shrink-0' />
                <div className='flex-1 space-y-1'>
                  <div className='h-3 bg-zinc-700 rounded animate-pulse w-3/4' />
                  <div className='h-2 bg-zinc-700 rounded animate-pulse w-1/2' />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='bg-zinc-900/50 p-6 h-full overflow-hidden'>
      {user ? (
        <div className='h-full flex flex-col'>
          {/* Friend Selector */}
          <div className='mb-4 flex-shrink-0'>
            <div className='relative'>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => setShowFriendSelector(!showFriendSelector)}
                className='w-full justify-between text-left bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700'
              >
                <span className='text-sm'>
                  {selectedFriend === 'all'
                    ? 'All Friends'
                    : friends.find(f => f.id === selectedFriend)?.name ||
                      'All Friends'}
                </span>
                <ChevronDown className='w-4 h-4' />
              </Button>

              {showFriendSelector && (
                <div className='absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg z-10'>
                  <div
                    className='p-2 hover:bg-zinc-700 cursor-pointer text-sm'
                    onClick={() => {
                      setSelectedFriend('all');
                      setShowFriendSelector(false);
                    }}
                  >
                    All Friends
                  </div>
                  {friends.map(friend => (
                    <div
                      key={friend.id}
                      className='p-2 hover:bg-zinc-700 cursor-pointer text-sm flex items-center gap-2'
                      onClick={() => {
                        setSelectedFriend(friend.id);
                        setShowFriendSelector(false);
                      }}
                    >
                      <div className='w-6 h-6 bg-zinc-600 rounded-full flex items-center justify-center'>
                        {friend.avatar ? (
                          <img
                            src={friend.avatar}
                            alt={friend.name}
                            className='w-full h-full rounded-full'
                          />
                        ) : (
                          <User className='w-3 h-3' />
                        )}
                      </div>
                      <div className='flex-1'>
                        <div className='flex items-center gap-2'>
                          <span>{friend.name}</span>
                          {friend.isOnline && (
                            <div className='w-2 h-2 bg-green-400 rounded-full' />
                          )}
                        </div>
                        <div className='text-xs text-zinc-400'>
                          {friend.username}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Activities */}
          <div className='flex-1 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'>
            {isLoading ? (
              <div className='space-y-3'>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className='flex items-center gap-3 p-3 bg-zinc-800/30 rounded-lg'
                  >
                    <div className='w-8 h-8 bg-zinc-700 rounded-full animate-pulse flex-shrink-0' />
                    <div className='w-10 h-10 bg-zinc-700 rounded animate-pulse flex-shrink-0' />
                    <div className='flex-1 space-y-1'>
                      <div className='h-3 bg-zinc-700 rounded animate-pulse w-3/4' />
                      <div className='h-2 bg-zinc-700 rounded animate-pulse w-1/2' />
                    </div>
                  </div>
                ))}
              </div>
            ) : activities.length > 0 ? (
              <div className='space-y-3'>
                {activities.map(activity => (
                  <div
                    key={activity.id}
                    className='flex items-center gap-3 p-3 bg-zinc-800/30 rounded-lg hover:bg-zinc-800/50 transition-colors cursor-pointer group'
                  >
                    {/* Friend Avatar */}
                    <div className='relative flex-shrink-0'>
                      <div className='w-8 h-8 bg-zinc-600 rounded-full flex items-center justify-center'>
                        {activity.friend.avatar ? (
                          <img
                            src={activity.friend.avatar}
                            alt={activity.friend.name}
                            className='w-full h-full rounded-full'
                          />
                        ) : (
                          <User className='w-4 h-4 text-zinc-300' />
                        )}
                      </div>
                      {activity.friend.isOnline && (
                        <div className='absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border border-zinc-800' />
                      )}
                    </div>

                    {/* Album Cover */}
                    <div className='flex-shrink-0'>
                      <AlbumImage
                        src={activity.album.imageUrl}
                        alt={`${activity.album.title} by ${activity.album.artist}`}
                        width={40}
                        height={40}
                        className='w-10 h-10 rounded object-cover border border-zinc-700'
                      />
                    </div>

                    {/* Activity Details */}
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-2 mb-1'>
                        <span className='text-sm font-medium text-white truncate'>
                          {activity.friend.name}
                        </span>
                        {getActivityIcon(activity.type)}
                        <span className='text-sm text-zinc-300 truncate'>
                          {activity.description}
                        </span>
                      </div>
                      <p className='text-xs text-zinc-400 truncate'>
                        {activity.album.title} by {activity.album.artist}
                      </p>
                      <p className='text-xs text-zinc-500 mt-1'>
                        {activity.timestamp}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='text-center py-8'>
                <p className='text-zinc-400 mb-2'>No friend activity</p>
                <p className='text-xs text-zinc-500'>
                  {selectedFriend === 'all'
                    ? 'Activity from your friends will appear here'
                    : 'No recent activity from this friend'}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className='h-full flex flex-col items-center justify-center text-center'>
          <User className='h-12 w-12 text-zinc-600 mb-4' />
          <h3 className='text-lg font-semibold text-white mb-2'>
            Friend Activity
          </h3>
          <p className='text-zinc-400 text-sm'>
            Sign in to see what your friends are up to
          </p>
        </div>
      )}
    </div>
  );
}
