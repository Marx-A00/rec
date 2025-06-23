'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  UserPlus,
  Sparkles,
  Filter,
  SortAsc,
} from 'lucide-react';
import UserListItem from '@/components/profile/UserListItem';
import FollowSuggestions from '@/components/profile/FollowSuggestions';

interface BaseUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  bio: string | null;
  followersCount: number;
  followingCount: number;
  recommendationsCount: number;
}

interface TrendingUser extends BaseUser {
  followerGrowthRate: number;
  recentActivityScore: number;
  trendingScore: number;
  recentActivity: {
    newFollowers: number;
    newRecommendations: number;
    timeframe: string;
  };
  topGenres: string[];
}

interface NewUser extends BaseUser {
  joinedAt: string;
  daysSinceJoined: number;
  hasRecommendations: boolean;
  hasFollowers: boolean;
  activityLevel: 'new' | 'getting_started' | 'active';
}

type DiscoveryTab = 'all' | 'trending' | 'new' | 'suggested';
type SortOption = 'followers' | 'activity' | 'recent' | 'alphabetical';

interface DiscoveryTabsProps {
  initialUsers: BaseUser[];
  currentUserId?: string;
  className?: string;
}

export default function DiscoveryTabs({
  initialUsers,
  currentUserId,
  className = '',
}: DiscoveryTabsProps) {
  const [activeTab, setActiveTab] = useState<DiscoveryTab>('all');
  const [sortBy, setSortBy] = useState<SortOption>('followers');
  const [isLoading, setIsLoading] = useState(false);
  const [trendingUsers, setTrendingUsers] = useState<TrendingUser[]>([]);
  const [newUsers, setNewUsers] = useState<NewUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch trending users
  const fetchTrendingUsers = async () => {
    if (trendingUsers.length > 0) return; // Only fetch once

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users/trending?limit=20&timeframe=7d');
      if (!response.ok) {
        throw new Error('Failed to fetch trending users');
      }

      const data = await response.json();
      setTrendingUsers(data.users || []);
    } catch (err) {
      console.error('Error fetching trending users:', err);
      setError('Failed to load trending users');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch new users
  const fetchNewUsers = async () => {
    if (newUsers.length > 0) return; // Only fetch once

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users/new?limit=20&max_days=30');
      if (!response.ok) {
        throw new Error('Failed to fetch new users');
      }

      const data = await response.json();
      setNewUsers(data.users || []);
    } catch (err) {
      console.error('Error fetching new users:', err);
      setError('Failed to load new users');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle tab change
  const handleTabChange = (tab: DiscoveryTab) => {
    setActiveTab(tab);

    if (tab === 'trending') {
      fetchTrendingUsers();
    } else if (tab === 'new') {
      fetchNewUsers();
    }
  };

  // Sort users based on selected option
  const getSortedUsers = (users: BaseUser[]) => {
    const sortedUsers = [...users];

    switch (sortBy) {
      case 'followers':
        return sortedUsers.sort((a, b) => b.followersCount - a.followersCount);
      case 'activity':
        return sortedUsers.sort(
          (a, b) => b.recommendationsCount - a.recommendationsCount
        );
      case 'alphabetical':
        return sortedUsers.sort((a, b) =>
          (a.name || '').localeCompare(b.name || '')
        );
      case 'recent':
        // For new users, sort by join date; for others, sort by followers as fallback
        if (activeTab === 'new') {
          return (sortedUsers as NewUser[]).sort(
            (a, b) => a.daysSinceJoined - b.daysSinceJoined
          );
        }
        return sortedUsers.sort((a, b) => b.followersCount - a.followersCount);
      default:
        return sortedUsers;
    }
  };

  // Get current users based on active tab
  const getCurrentUsers = (): BaseUser[] => {
    switch (activeTab) {
      case 'trending':
        return getSortedUsers(trendingUsers);
      case 'new':
        return getSortedUsers(newUsers);
      case 'all':
      default:
        return getSortedUsers(initialUsers);
    }
  };

  // Get tab-specific metadata for display
  const getTabMetadata = (user: BaseUser) => {
    if (activeTab === 'trending' && 'trendingScore' in user) {
      const trendingUser = user as TrendingUser;
      return {
        badge: `+${trendingUser.followerGrowthRate}% growth`,
        subtitle: `${trendingUser.recentActivity.newRecommendations} new recs this week`,
        genres: trendingUser.topGenres.slice(0, 2),
      };
    }

    if (activeTab === 'new' && 'daysSinceJoined' in user) {
      const newUser = user as NewUser;
      const activityLabels = {
        new: 'New to REC',
        getting_started: 'Getting Started',
        active: 'Active Member',
      };
      return {
        badge: activityLabels[newUser.activityLevel],
        subtitle: `Joined ${newUser.daysSinceJoined} days ago`,
        genres: [],
      };
    }

    return {
      badge: null,
      subtitle: null,
      genres: [],
    };
  };

  const tabs = [
    {
      id: 'all' as const,
      label: 'All Users',
      icon: Users,
      count: initialUsers.length,
    },
    {
      id: 'trending' as const,
      label: 'Trending',
      icon: TrendingUp,
      count: trendingUsers.length,
    },
    {
      id: 'new' as const,
      label: 'New Members',
      icon: UserPlus,
      count: newUsers.length,
    },
    {
      id: 'suggested' as const,
      label: 'Suggested',
      icon: Sparkles,
      count: null,
    },
  ];

  const sortOptions = [
    { value: 'followers' as const, label: 'Most Followers' },
    { value: 'activity' as const, label: 'Most Active' },
    {
      value: 'recent' as const,
      label: activeTab === 'new' ? 'Recently Joined' : 'Recent Activity',
    },
    { value: 'alphabetical' as const, label: 'Alphabetical' },
  ];

  const currentUsers = getCurrentUsers();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Tab Navigation */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <div className='flex flex-wrap gap-2'>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-zinc-800 text-cosmic-latte border border-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <Icon className='w-4 h-4' />
                {tab.label}
                {tab.count !== null && (
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full ${
                      isActive
                        ? 'bg-zinc-700 text-zinc-300'
                        : 'bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sort Options */}
        {activeTab !== 'suggested' && (
          <div className='flex items-center gap-2'>
            <SortAsc className='w-4 h-4 text-zinc-400' />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortOption)}
              className='bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-1.5 focus:border-zinc-600 focus:outline-none'
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Content */}
      <div className='min-h-[400px]'>
        {activeTab === 'suggested' ? (
          <div className='space-y-6'>
            <div className='text-center py-8'>
              <Sparkles className='w-12 h-12 text-zinc-600 mx-auto mb-4' />
              <h3 className='text-xl font-semibold text-cosmic-latte mb-2'>
                AI-Powered Suggestions
              </h3>
              <p className='text-zinc-400 max-w-md mx-auto'>
                Discover users who share your music taste and have mutual
                connections
              </p>
            </div>

            <FollowSuggestions
              currentUserId={currentUserId}
              limit={10}
              showTitle={false}
              className='max-w-4xl mx-auto'
            />
          </div>
        ) : (
          <>
            {/* Loading State */}
            {isLoading && (
              <div className='flex items-center justify-center py-12'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-cosmic-latte'></div>
                <span className='ml-3 text-zinc-400'>Loading users...</span>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className='text-center py-12'>
                <p className='text-red-400 mb-4'>{error}</p>
                <button
                  onClick={() => {
                    if (activeTab === 'trending') fetchTrendingUsers();
                    if (activeTab === 'new') fetchNewUsers();
                  }}
                  className='px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors'
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Users Grid */}
            {!isLoading && !error && currentUsers.length > 0 && (
              <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6'>
                {currentUsers.map(user => {
                  const metadata = getTabMetadata(user);

                  return (
                    <div key={user.id} className='relative'>
                      <UserListItem
                        user={user}
                        currentUserId={currentUserId}
                        showFollowButton={currentUserId !== user.id}
                        className='h-full'
                      />

                      {/* Tab-specific badges */}
                      {metadata.badge && (
                        <div className='absolute top-2 right-2 px-2 py-1 bg-zinc-800/90 text-xs text-zinc-300 rounded-md backdrop-blur-sm'>
                          {metadata.badge}
                        </div>
                      )}

                      {/* Genres for trending users */}
                      {metadata.genres.length > 0 && (
                        <div className='absolute bottom-2 left-2 right-2 flex gap-1'>
                          {metadata.genres.map(genre => (
                            <span
                              key={genre}
                              className='px-2 py-0.5 bg-zinc-800/90 text-xs text-zinc-400 rounded-md backdrop-blur-sm truncate'
                            >
                              {genre}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && currentUsers.length === 0 && (
              <div className='text-center py-12'>
                <Users className='w-12 h-12 text-zinc-600 mx-auto mb-4' />
                <h3 className='text-lg font-semibold text-zinc-300 mb-2'>
                  No users found
                </h3>
                <p className='text-zinc-500'>
                  {activeTab === 'trending' &&
                    'No trending users at the moment.'}
                  {activeTab === 'new' && 'No new members in the past 30 days.'}
                  {activeTab === 'all' && 'No users to display.'}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
