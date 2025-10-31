'use client';

import Link from 'next/link';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import FollowButton from '@/components/profile/FollowButton';

interface UserListItemProps {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    bio: string | null;
    followersCount: number;
    followingCount: number;
    recommendationsCount: number;
    followedAt?: string;
    isFollowing?: boolean;
  };
  currentUserId?: string;
  showFollowButton?: boolean;
  onFollowChange?: (
    userId: string,
    isFollowing: boolean,
    newCounts: { followersCount: number; followingCount: number }
  ) => void;
  className?: string;
}

export default function UserListItem({
  user,
  currentUserId,
  showFollowButton = true,
  onFollowChange,
  className = '',
}: UserListItemProps) {
  const isOwnProfile = currentUserId === user.id;

  const handleFollowChange = (
    isFollowing: boolean,
    newCounts?: { followersCount: number; followingCount: number }
  ) => {
    if (onFollowChange) {
      onFollowChange(
        user.id,
        isFollowing,
        newCounts || { followersCount: 0, followingCount: 0 }
      );
    }
  };

  return (
    <div
      className={`bg-zinc-900 rounded-lg p-4 border border-zinc-800 hover:border-zinc-700 transition-colors ${className}`}
    >
      <div className='flex items-start gap-4'>
        {/* Avatar */}
        <Link href={`/profile/${user.id}`}>
          <Avatar className='h-12 w-12 hover:opacity-80 transition-opacity cursor-pointer'>
            <AvatarImage
              src={user.image || undefined}
              alt={user.name || 'User'}
            />
            <AvatarFallback className='bg-zinc-700 text-zinc-200'>
              {user.name?.charAt(0)?.toUpperCase() || 'A'}
            </AvatarFallback>
          </Avatar>
        </Link>

        {/* User Info */}
        <div className='flex-1 min-w-0'>
          <div className='flex items-start justify-between gap-3'>
            <div className='flex-1 min-w-0'>
              <Link href={`/profile/${user.id}`}>
                <h3 className='font-medium text-white hover:text-emeraled-green transition-colors cursor-pointer truncate'>
                  {user.name || 'Anonymous music enjoyer'}
                </h3>
              </Link>

              {/* Bio */}
              {user.bio && (
                <p className='text-sm text-zinc-300 mt-2 line-clamp-2'>
                  {user.bio}
                </p>
              )}

              {/* Stats */}
              <div className='flex gap-4 mt-3 text-xs text-zinc-400'>
                <span>
                  <strong className='text-zinc-200'>
                    {user.followersCount}
                  </strong>{' '}
                  Followers
                </span>
                <span>
                  <strong className='text-zinc-200'>
                    {user.followingCount}
                  </strong>{' '}
                  Following
                </span>
                <span>
                  <strong className='text-zinc-200'>
                    {user.recommendationsCount}
                  </strong>{' '}
                  Recs
                </span>
              </div>

              {/* Follow Date */}
              {user.followedAt && (
                <p className='text-xs text-zinc-500 mt-2'>
                  Followed {new Date(user.followedAt).toLocaleDateString()}
                </p>
              )}
            </div>

            {/* Follow Button */}
            {!isOwnProfile && showFollowButton && (
              <div className='flex-shrink-0'>
                <FollowButton
                  userId={user.id}
                  initialFollowing={user.isFollowing}
                  onFollowChange={handleFollowChange}
                  className='text-sm px-3 py-1.5'
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
