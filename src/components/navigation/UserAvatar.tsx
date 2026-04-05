'use client';

import React, { FC } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import SignInButton from '@/components/auth/SignInButton';

interface UserAvatarProps {
  isCollapsed?: boolean;
  className?: string;
}

export const UserAvatar: FC<UserAvatarProps> = ({
  isCollapsed = false,
  className = '',
}) => {
  const { data: session, status } = useSession();
  const user = session?.user;
  const isSessionLoading = status === 'loading';

  // Show skeleton while session is loading
  if (isSessionLoading) {
    return (
      <div className={`flex items-center gap-2 p-2 ${className}`}>
        <div className='h-8 w-8 rounded-full bg-zinc-700 animate-pulse' />
        {!isCollapsed && (
          <div className='h-4 w-20 bg-zinc-700 rounded animate-pulse' />
        )}
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <SignInButton />
      </div>
    );
  }

  return (
    <Link
      href={`/profile/${user.id}`}
      data-tour-step='profile-nav'
      className='relative flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-800 transition-colors'
    >
      <Avatar className='h-8 w-8'>
        <AvatarImage
          src={user.image || undefined}
          alt={user.username || 'User'}
        />
        <AvatarFallback>
          {user.username?.charAt(0)?.toUpperCase() || '?'}
        </AvatarFallback>
      </Avatar>
    </Link>
  );
};

export default UserAvatar;
