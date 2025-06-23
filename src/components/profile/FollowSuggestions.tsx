'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sparkles, RefreshCw, Users } from 'lucide-react';

import SuggestionCard from './SuggestionCard';

interface SuggestionUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  bio: string | null;
  followersCount: number;
  followingCount: number;
  recommendationsCount: number;
  mutualConnectionsCount: number;
  sharedInterests: string[];
  suggestionReason: string;
  suggestionScore: number;
}

interface FollowSuggestionsResponse {
  suggestions: SuggestionUser[];
  total: number;
  algorithms: {
    mutualConnections: number;
    musicTaste: number;
    activeUsers: number;
  };
}

interface FollowSuggestionsProps {
  currentUserId?: string;
  limit?: number;
  showTitle?: boolean;
  className?: string;
}

export default function FollowSuggestions({
  currentUserId,
  limit = 6,
  showTitle = true,
  className = '',
}: FollowSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<SuggestionUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [algorithms, setAlgorithms] = useState<
    FollowSuggestionsResponse['algorithms'] | null
  >(null);

  const fetchSuggestions = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const response = await fetch(`/api/users/suggestions?limit=${limit}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Please sign in to see suggestions');
          }
          throw new Error('Failed to fetch suggestions');
        }

        const data: FollowSuggestionsResponse = await response.json();
        setSuggestions(data.suggestions);
        setAlgorithms(data.algorithms);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [limit]
  );

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  const handleDismiss = (userId: string) => {
    setSuggestions(prev => prev.filter(user => user.id !== userId));
  };

  const handleFollowChange = (userId: string, isFollowing: boolean) => {
    if (isFollowing) {
      // Remove from suggestions when followed
      setSuggestions(prev => prev.filter(user => user.id !== userId));
    }
  };

  const handleRefresh = () => {
    fetchSuggestions(true);
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {showTitle && (
          <div className='flex items-center gap-2'>
            <Sparkles className='h-5 w-5 text-emeraled-green' />
            <h2 className='text-lg font-semibold text-cosmic-latte'>
              Suggested for You
            </h2>
          </div>
        )}
        <div className='space-y-3'>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className='bg-zinc-900 rounded-lg p-4 border border-zinc-800 animate-pulse'
            >
              <div className='flex items-start gap-3'>
                <div className='h-12 w-12 bg-zinc-700 rounded-full flex-shrink-0' />
                <div className='flex-1 space-y-2'>
                  <div className='h-4 bg-zinc-700 rounded w-32' />
                  <div className='h-3 bg-zinc-700 rounded w-48' />
                  <div className='h-3 bg-zinc-700 rounded w-24' />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-4 ${className}`}>
        {showTitle && (
          <div className='flex items-center gap-2'>
            <Sparkles className='h-5 w-5 text-emeraled-green' />
            <h2 className='text-lg font-semibold text-cosmic-latte'>
              Suggested for You
            </h2>
          </div>
        )}
        <div className='bg-zinc-900 rounded-lg p-6 border border-zinc-800 text-center'>
          <p className='text-zinc-400 mb-3'>{error}</p>
          <button
            onClick={() => fetchSuggestions()}
            className='px-4 py-2 bg-emeraled-green text-black rounded-lg hover:bg-emeraled-green/90 transition-colors'
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        {showTitle && (
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <Sparkles className='h-5 w-5 text-emeraled-green' />
              <h2 className='text-lg font-semibold text-cosmic-latte'>
                Suggested for You
              </h2>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className='p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50'
              title='Refresh suggestions'
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
        )}
        <div className='bg-zinc-900 rounded-lg p-6 border border-zinc-800 text-center'>
          <Users className='h-12 w-12 text-zinc-600 mx-auto mb-3' />
          <p className='text-zinc-400 mb-2'>No new suggestions right now</p>
          <p className='text-sm text-zinc-500'>
            Keep using the app to get personalized recommendations
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {showTitle && (
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Sparkles className='h-5 w-5 text-emeraled-green' />
            <h2 className='text-lg font-semibold text-cosmic-latte'>
              Suggested for You
            </h2>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className='p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50'
            title='Refresh suggestions'
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
      )}

      {/* Algorithm Stats (Optional Debug Info) */}
      {algorithms && process.env.NODE_ENV === 'development' && (
        <div className='text-xs text-zinc-500 bg-zinc-900 rounded p-2 border border-zinc-800'>
          Suggestions: {algorithms.mutualConnections} mutual,{' '}
          {algorithms.musicTaste} taste, {algorithms.activeUsers} active
        </div>
      )}

      {/* Suggestions Grid */}
      <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2'>
        {suggestions.map(user => (
          <SuggestionCard
            key={user.id}
            user={user}
            currentUserId={currentUserId}
            onDismiss={handleDismiss}
            onFollowChange={handleFollowChange}
          />
        ))}
      </div>

      {/* Show More Button */}
      {suggestions.length >= limit && (
        <div className='text-center'>
          <button
            onClick={() => fetchSuggestions(true)}
            disabled={refreshing}
            className='px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-colors disabled:opacity-50'
          >
            {refreshing ? 'Loading...' : 'Refresh Suggestions'}
          </button>
        </div>
      )}
    </div>
  );
}
