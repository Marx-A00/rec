'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

import { useGetTasteMatchesQuery } from '@/generated/graphql';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

type SharedArtistContext = {
  artist: {
    id: string;
    name: string;
  };
  sources: string[];
};

type TasteMatch = {
  score: number;
  overlapCount: number;
  user: {
    id: string;
    username?: string | null;
    image?: string | null;
    followersCount: number;
    recommendationsCount: number;
  };
  sharedArtists: SharedArtistContext[];
};

/** Pick the best context label for a shared artist based on source */
function getContextLabel(sources: string[]): string {
  if (sources.includes('taste_profile')) return 'You both like';
  return 'Both collect';
}

function getInitials(username?: string | null): string {
  if (!username) return '?';
  return username.slice(0, 2).toUpperCase();
}

function FeaturedUserCard({
  match,
  isFollowed,
  onFollow,
}: {
  match: TasteMatch;
  isFollowed: boolean;
  onFollow: (userId: string) => void;
}) {
  const { user, sharedArtists, overlapCount } = match;

  return (
    <Link href={`/profile/${user.id}`} className="block">
      <div className="w-[340px] bg-[#191919] border border-cosmic-latte/15 rounded-2xl p-6 flex flex-col items-center gap-4 hover:border-cosmic-latte/30 transition-colors">
        <span className="inline-flex items-center gap-1.5 bg-cosmic-latte/10 text-cosmic-latte text-[11px] font-medium rounded-full px-3 py-1">
          Best match &middot; {overlapCount} artist{overlapCount !== 1 ? 's' : ''} in common
        </span>

        <Avatar className="h-20 w-20">
          <AvatarImage src={user.image ?? undefined} alt={user.username ?? 'User'} />
          <AvatarFallback className="bg-zinc-700 text-white text-lg">
            {getInitials(user.username)}
          </AvatarFallback>
        </Avatar>

        <p className="text-[22px] font-bold text-white truncate max-w-full">
          {user.username ?? 'Unknown'}
        </p>

        {sharedArtists.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5">
            {sharedArtists.map((sa) => (
              <span
                key={sa.artist.id}
                className="bg-cosmic-latte/6 border border-cosmic-latte/15 rounded-full px-2.5 py-1 text-[11px] text-cosmic-latte/80"
              >
                {sa.artist.name}
              </span>
            ))}
          </div>
        )}

        <p className="text-zinc-500 text-xs">
          {user.followersCount} follower{user.followersCount !== 1 ? 's' : ''} &middot;{' '}
          {user.recommendationsCount} rec{user.recommendationsCount !== 1 ? 's' : ''}
        </p>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!isFollowed) onFollow(user.id);
          }}
          className={`w-full py-2 rounded-lg font-semibold text-sm transition-colors ${
            isFollowed
              ? 'bg-zinc-700 text-zinc-400 cursor-default'
              : 'bg-cosmic-latte text-[#111] hover:opacity-90'
          }`}
        >
          {isFollowed ? 'Following' : 'Follow'}
        </button>
      </div>
    </Link>
  );
}

function CompactUserRow({
  match,
  isFollowed,
  onFollow,
}: {
  match: TasteMatch;
  isFollowed: boolean;
  onFollow: (userId: string) => void;
}) {
  const { user, sharedArtists } = match;
  const topArtists = sharedArtists.slice(0, 2);
  const label = topArtists.length > 0 ? getContextLabel(topArtists[0].sources) : '';
  const displayNames = topArtists.map((sa) => sa.artist.name).join(', ');

  return (
    <Link href={`/profile/${user.id}`} className="block">
      <div className="bg-[#191919] border border-zinc-800/40 rounded-xl p-3.5 flex items-center gap-3 hover:border-zinc-700 transition-colors">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={user.image ?? undefined} alt={user.username ?? 'User'} />
          <AvatarFallback className="bg-zinc-700 text-white text-xs">
            {getInitials(user.username)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-white truncate">
            {user.username ?? 'Unknown'}
          </p>
          {displayNames && (
            <p className="text-[12px] text-zinc-500 truncate">
              {label} {displayNames}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!isFollowed) onFollow(user.id);
          }}
          className={`shrink-0 text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-colors ${
            isFollowed
              ? 'bg-zinc-700/60 text-zinc-400 border border-zinc-600/40 cursor-default'
              : 'bg-cosmic-latte/10 border border-cosmic-latte/25 text-cosmic-latte hover:bg-cosmic-latte/20'
          }`}
        >
          {isFollowed ? 'Following' : 'Follow'}
        </button>
      </div>
    </Link>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="h-3 w-24 bg-zinc-800 rounded animate-pulse" />
        <div className="h-7 w-64 bg-zinc-800 rounded animate-pulse" />
      </div>

      <div className="flex gap-6">
        {/* Featured card skeleton */}
        <div className="w-[340px] shrink-0 bg-[#191919] border border-zinc-800/40 rounded-2xl p-6 animate-pulse">
          <div className="flex flex-col items-center gap-4">
            <div className="h-5 w-40 bg-zinc-800 rounded-full" />
            <div className="h-20 w-20 bg-zinc-700/60 rounded-full" />
            <div className="h-6 w-32 bg-zinc-800 rounded" />
            <div className="flex gap-1.5">
              <div className="h-6 w-16 bg-zinc-800 rounded-full" />
              <div className="h-6 w-20 bg-zinc-800 rounded-full" />
            </div>
            <div className="h-3 w-28 bg-zinc-800 rounded" />
            <div className="h-9 w-full bg-zinc-800 rounded-lg" />
          </div>
        </div>

        {/* Compact rows skeleton */}
        <div className="flex-1 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-[#191919] border border-zinc-800/40 rounded-xl p-3.5 flex items-center gap-3 animate-pulse"
            >
              <div className="h-10 w-10 bg-zinc-700/60 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 bg-zinc-800 rounded" />
                <div className="h-3 w-36 bg-zinc-800 rounded" />
              </div>
              <div className="h-7 w-16 bg-zinc-800 rounded-lg shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TasteMatchedUsers() {
  const { data: session, status } = useSession();
  const [localFollowedIds, setLocalFollowedIds] = useState<Set<string>>(new Set());

  const { data, isLoading, error } = useGetTasteMatchesQuery(
    { limit: 10 },
    { enabled: status === 'authenticated' }
  );

  const handleFollow = async (userId: string) => {
    try {
      await fetch(`/api/users/${userId}/follow`, { method: 'POST' });
      setLocalFollowedIds((prev) => new Set([...prev, userId]));
    } catch {
      // Silently fail
    }
  };

  const isFollowed = (match: TasteMatch & { isFollowing?: boolean }) =>
    match.isFollowing || localFollowedIds.has(match.user.id);

  if (status !== 'authenticated' || !session) return null;
  if (isLoading) return <LoadingSkeleton />;
  if (error) return null;

  const matches = data?.tasteMatches ?? [];
  if (matches.length < 2) return null;

  const [featured, ...compact] = matches;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <p className="text-[11px] font-bold tracking-[2px] text-cosmic-latte/70 uppercase">
          Your People
        </p>
        <h2 className="text-2xl font-bold text-white">
          People who share your taste
        </h2>
      </div>

      <div className="flex gap-6">
        <div className="shrink-0">
          <FeaturedUserCard
            match={featured}
            isFollowed={isFollowed(featured)}
            onFollow={handleFollow}
          />
        </div>

        {compact.length > 0 && (
          <div className="flex-1 space-y-2 min-w-0">
            {compact.map((match) => (
              <CompactUserRow
                key={match.user.id}
                match={match}
                isFollowed={isFollowed(match)}
                onFollow={handleFollow}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
