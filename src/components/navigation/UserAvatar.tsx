'use client';

import React, { FC } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Settings, User, Shield } from 'lucide-react';
import { UserRole } from '@prisma/client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import SignOutButton from '@/components/auth/SignOutButton';
import SignInButton from '@/components/auth/SignInButton';

interface UserAvatarProps {
  isCollapsed?: boolean;
  className?: string;
}

export const UserAvatar: FC<UserAvatarProps> = ({
  isCollapsed = false,
  className = '',
}) => {
  const { data: session } = useSession();
  const user = session?.user;
  const isAdminOrOwner =
    user?.role === UserRole.ADMIN || user?.role === UserRole.OWNER;

  if (!user) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <SignInButton />
      </div>
    );
  }

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Link
          href={`/profile/${user.id}`}
          data-tour-step='profile-nav'
          className='relative flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-800 transition-colors'
        >
          <Avatar className='h-8 w-8'>
            <AvatarImage
              src={user.image || undefined}
              alt={user.name || 'User'}
            />
            <AvatarFallback>
              {user.name?.charAt(0)?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <span className='text-sm font-medium text-white'>{user.name}</span>
          )}
        </Link>
      </HoverCardTrigger>
      <HoverCardContent
        side='bottom'
        align='start'
        className='w-72 bg-zinc-900 border-zinc-800'
      >
        <div className='space-y-3'>
          <div className='flex items-center gap-3'>
            <Avatar className='h-12 w-12'>
              <AvatarImage
                src={user.image || undefined}
                alt={user.name || 'User'}
              />
              <AvatarFallback className='bg-zinc-800 text-white'>
                {user.name?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div className='flex-1 min-w-0'>
              <p className='text-sm font-medium text-cosmic-latte truncate'>
                {user.name}
              </p>
              <p className='text-xs text-zinc-400 truncate'>{user.email}</p>
            </div>
          </div>

          <div className='space-y-1 pt-2 border-t border-zinc-700'>
            <Link
              href={`/profile/${user.id}`}
              className='flex items-center gap-3 px-2 py-2 text-sm text-zinc-300 hover:text-cosmic-latte hover:bg-zinc-800 rounded-md transition-colors'
            >
              <User className='h-4 w-4' />
              <span>Your Profile</span>
            </Link>
            {isAdminOrOwner && (
              <Link
                href='/admin'
                className='flex items-center gap-3 px-2 py-2 text-sm text-zinc-300 hover:text-cosmic-latte hover:bg-zinc-800 rounded-md transition-colors'
              >
                <Shield className='h-4 w-4' />
                <span>Admin Panel</span>
              </Link>
            )}
            <Link
              href='/settings'
              className='flex items-center gap-3 px-2 py-2 text-sm text-zinc-300 hover:text-cosmic-latte hover:bg-zinc-800 rounded-md transition-colors'
            >
              <Settings className='h-4 w-4' />
              <span>Settings</span>
            </Link>
          </div>

          <div className='pt-2 border-t border-zinc-700'>
            <SignOutButton />
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

export default UserAvatar;
