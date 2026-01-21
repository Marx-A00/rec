'use client';

import Link from 'next/link';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import TimeAgo from '@/components/mobile/TimeAgo';
import { cn } from '@/lib/utils';

interface Activity {
  id: string;
  actorId: string;
  actorName: string;
  actorImage: string | null;
  targetId?: string;
  targetName?: string;
  targetImage?: string | null;
  createdAt: string;
}

interface MobileFollowCardProps {
  activity: Activity;
  className?: string;
}

export default function MobileFollowCard({
  activity,
  className,
}: MobileFollowCardProps) {
  return (
    <div
      className={cn(
        'bg-zinc-900 rounded-lg p-4 border border-zinc-800',
        className
      )}
    >
      {/* Compact follow activity */}
      <div className='flex items-center gap-3'>
        {/* Actor Avatar */}
        <Link href={`/m/profile/${activity.actorId}`}>
          <Avatar className='h-10 w-10'>
            <AvatarImage
              src={activity.actorImage || undefined}
              alt={activity.actorName}
            />
            <AvatarFallback className='bg-zinc-700 text-zinc-200 text-sm'>
              {activity.actorName.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        </Link>

        {/* Text */}
        <div className='flex-1 min-w-0'>
          <p className='text-sm'>
            <Link
              href={`/m/profile/${activity.actorId}`}
              className='font-medium text-white hover:text-emeraled-green'
            >
              {activity.actorName}
            </Link>
            <span className='text-zinc-400'> followed </span>
            <Link
              href={`/m/profile/${activity.targetId}`}
              className='font-medium text-white hover:text-emeraled-green'
            >
              {activity.targetName}
            </Link>
          </p>
          <TimeAgo
            date={activity.createdAt}
            className='text-xs text-zinc-500'
          />
        </div>

        {/* Target Avatar */}
        <Link href={`/m/profile/${activity.targetId}`}>
          <Avatar className='h-10 w-10'>
            <AvatarImage
              src={activity.targetImage || undefined}
              alt={activity.targetName || 'User'}
            />
            <AvatarFallback className='bg-zinc-700 text-zinc-200 text-sm'>
              {activity.targetName?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </div>
  );
}
