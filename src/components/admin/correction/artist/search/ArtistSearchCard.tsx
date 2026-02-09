'use client';

import { User } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { type ArtistCorrectionSearchResult } from '@/generated/graphql';

export interface ArtistSearchCardProps {
  result: ArtistCorrectionSearchResult;
  onClick: (result: ArtistCorrectionSearchResult) => void;
}

/**
 * A clickable search result card showing artist metadata and match score.
 * Used in the artist correction modal to display search results from MusicBrainz or Discogs.
 *
 * Displays:
 * - Artist name (large) with disambiguation (smaller subtitle)
 * - Type badge: Person, Group, etc.
 * - Country flag/code if available
 * - Top releases list (2-3 items with year and type)
 * - Match score as percentage
 * - Source badge (MB for MusicBrainz, DG for Discogs)
 */
export function ArtistSearchCard({ result, onClick }: ArtistSearchCardProps) {
  const handleClick = () => {
    onClick(result);
  };

  // Determine source for visual distinction
  const isDiscogs = result.source === 'discogs';
  const badgeText = isDiscogs ? 'DG' : 'MB';

  // Format match score as percentage
  const matchScore = result.mbScore;

  // Get country flag emoji from country code
  const getCountryFlag = (code: string): string => {
    // Convert country code to flag emoji
    const codePoints = [...code.toUpperCase()].map(
      c => 0x1f1e6 - 65 + c.charCodeAt(0)
    );
    return String.fromCodePoint(...codePoints);
  };

  return (
    <button
      type='button'
      onClick={handleClick}
      className={cn(
        'w-full flex gap-3 p-3 text-left transition-colors duration-150 rounded-md',
        isDiscogs
          ? 'border border-orange-900/30 hover:bg-orange-950/20 active:bg-orange-950/30'
          : 'hover:bg-zinc-800/50 active:bg-zinc-800'
      )}
      aria-label={'Select ' + result.name}
    >
      {/* Artist avatar placeholder */}
      <div className='h-12 w-12 flex-shrink-0 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center'>
        <User className='h-6 w-6 text-zinc-600' />
      </div>

      {/* Metadata stack */}
      <div className='flex-1 min-w-0 flex flex-col gap-0.5'>
        {/* Row 1: Name + Score */}
        <div className='flex items-baseline gap-2'>
          <span className='font-medium text-cosmic-latte truncate flex-1'>
            {result.name}
          </span>
          <span className='text-sm font-semibold text-emeraled-green flex-shrink-0'>
            {matchScore}% match
          </span>
        </div>

        {/* Row 2: Disambiguation */}
        {result.disambiguation && (
          <div className='text-sm text-zinc-500 truncate'>
            {result.disambiguation}
          </div>
        )}

        {/* Row 3: Type + Country + Source badge */}
        <div className='flex items-center gap-2 text-xs text-zinc-500'>
          {result.type && (
            <Badge
              variant='outline'
              className='text-zinc-400 border-zinc-700 text-[10px] px-1.5 py-0'
            >
              {result.type}
            </Badge>
          )}
          {result.country && (
            <span className='flex items-center gap-1'>
              <span>{getCountryFlag(result.country)}</span>
              <span>{result.country}</span>
            </span>
          )}
          <Badge
            variant='outline'
            className={cn(
              'ml-auto text-[10px] px-1.5 py-0',
              isDiscogs
                ? 'text-orange-400 border-orange-700'
                : 'text-zinc-500 border-zinc-700'
            )}
          >
            {badgeText}
          </Badge>
        </div>

        {/* Row 4: Top releases for disambiguation */}
        {result.topReleases && result.topReleases.length > 0 && (
          <div className='mt-1 text-xs text-zinc-600'>
            <span className='text-zinc-500'>Known for: </span>
            {result.topReleases.slice(0, 3).map((release, i) => (
              <span key={i}>
                {i > 0 && ', '}
                {release.title}
                {release.year && ' (' + release.year + ')'}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}
