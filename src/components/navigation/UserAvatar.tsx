'use client';

import React, { FC } from 'react';
import { useSession } from 'next-auth/react';
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

export const UserAvatar: FC<UserAvatarProps> = ({ isCollapsed = false, className = '' }) => {
  const { data: session } = useSession();
  const user = session?.user;

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
        <button className="relative flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-800 transition-colors">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.image || undefined} alt={user.name || 'User'} />
            <AvatarFallback>{user.name?.charAt(0)?.toUpperCase() || '?'}</AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <span className="text-sm font-medium text-white">{user.name}</span>
          )}
        </button>
      </HoverCardTrigger>
      <HoverCardContent side="bottom" align="start" className="w-64">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.image || undefined} alt={user.name || 'User'} />
              <AvatarFallback>{user.name?.charAt(0)?.toUpperCase() || '?'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-zinc-400 truncate">{user.email}</p>
            </div>
          </div>
          <div className="pt-2 border-t border-zinc-800">
            <SignOutButton variant="ghost" size="sm" className="w-full justify-start" />
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

export default UserAvatar;