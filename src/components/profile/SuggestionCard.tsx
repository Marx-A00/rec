'use client';

import { useState } from 'react';
import Link from 'next/link';
import { X, UserPlus, Users } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import FollowButton from '@/components/profile/FollowButton';

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

interface SuggestionCardProps {
  user: SuggestionUser;
  currentUserId?: string;
  onDismiss?: (userId: string) => void;
  onFollowChange?: (userId: string, isFollowing: boolean) => void;
  className?: string;
}

export default function SuggestionCard({
  user,
  currentUserId,
  onDismiss,
  onFollowChange,
  className = '',
}: SuggestionCardProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  const handleDismiss = async () => {
    if (isDismissing) return;

    setIsDismissing(true);

    try {
      const response = await fetch('/api/users/suggestions/dismiss', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dismissedUserId: user.id,
          reason: 'user_dismissed',
        }),
      });

      if (response.ok) {
        setIsDismissed(true);
        if (onDismiss) {
          onDismiss(user.id);
        }
      } else {
        console.error('Failed to dismiss suggestion');
      }
    } catch (error) {
      console.error('Error dismissing suggestion:', error);
    } finally {
      setIsDismissing(false);
    }
  };

  const handleFollowChange = (isFollowing: boolean) => {
    if (onFollowChange) {
      onFollowChange(user.id, isFollowing);
    }
  };

  if (isDismissed) {
    return null; // Hide dismissed suggestions
  }

  return (
    <div
      className={`bg-zinc-900 rounded-lg p-4 border border-zinc-800 hover:border-zinc-700 transition-colors relative ${className}`}
    >
      {/* Dismiss Button */}
      <button
        onClick={handleDismiss}
        disabled={isDismissing}
        className='absolute top-3 right-3 p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-full transition-colors disabled:opacity-50'
        title='Dismiss this suggestion'
      >
        <X className='h-4 w-4' />
      </button>

      {/* User Info */}
      <div className='flex items-start gap-3 mb-3'>
        <Link href={`/profile/${user.id}`}>
          <Avatar className='h-12 w-12 hover:opacity-80 transition-opacity cursor-pointer flex-shrink-0'>
            <AvatarImage
              src={user.image || undefined}
              alt={user.name || 'User'}
            />
            <AvatarFallback className='bg-zinc-700 text-zinc-200'>
              {user.name?.charAt(0)?.toUpperCase() || 'A'}
            </AvatarFallback>
          </Avatar>
        </Link>

        <div className='flex-1 min-w-0'>
          <div className='flex items-center justify-between gap-2 mb-1'>
            <Link
              href={`/profile/${user.id}`}
              className='font-medium text-cosmic-latte hover:text-emeraled-green transition-colors truncate'
            >
              {user.name || 'Anonymous music enjoyer'}
            </Link>
          </div>

          {/* Bio */}
          {user.bio && (
            <p className='text-sm text-zinc-400 line-clamp-2 mb-2'>
              {user.bio}
            </p>
          )}

          {/* Stats */}
          <div className='flex items-center gap-4 text-xs text-zinc-500 mb-2'>
            <span className='flex items-center gap-1'>
              <Users className='h-3 w-3' />
              {user.followersCount} followers
            </span>
            <span>{user.recommendationsCount} recommendations</span>
          </div>

          {/* Suggestion Reason */}
          <div className='mb-3'>
            <p className='text-sm text-emeraled-green font-medium'>
              {user.suggestionReason}
            </p>

            {/* Shared Interests */}
            {user.sharedInterests.length > 0 && (
              <div className='flex flex-wrap gap-1 mt-1'>
                {user.sharedInterests.slice(0, 3).map((interest, index) => (
                  <span
                    key={index}
                    className='inline-block px-2 py-0.5 bg-zinc-800 text-zinc-300 text-xs rounded-full'
                  >
                    {interest}
                  </span>
                ))}
                {user.sharedInterests.length > 3 && (
                  <span className='text-xs text-zinc-500'>
                    +{user.sharedInterests.length - 3} more
                  </span>
                )}
              </div>
            )}

            {/* Mutual Connections */}
            {user.mutualConnectionsCount > 0 && (
              <div className='flex items-center gap-1 mt-1'>
                <Users className='h-3 w-3 text-zinc-400' />
                <span className='text-xs text-zinc-400'>
                  {user.mutualConnectionsCount} mutual connection
                  {user.mutualConnectionsCount !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          {/* Follow Button */}
          <div className='flex items-center gap-2'>
            <FollowButton
              userId={user.id}
              onFollowChange={handleFollowChange}
              className='flex-1 text-sm px-3 py-1.5'
            />
            <Link
              href={`/profile/${user.id}`}
              className='px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-colors'
            >
              View Profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
