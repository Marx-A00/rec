'use client';

import AlbumImage from '@/components/ui/AlbumImage';

/**
 * Props for CoverArtComparison component
 */
export interface CoverArtComparisonProps {
  /** Current cover art URL from database */
  currentUrl: string | null;
  /** Source cover art URL from Cover Art Archive */
  sourceUrl: string | null;
  /** Change type classification */
  changeType: 'ADDED' | 'MODIFIED' | 'REMOVED' | 'UNCHANGED' | string;
  /** Cloudflare image ID for optimized current cover delivery */
  currentCloudflareId?: string | null;
}

/**
 * Get change badge content and styling
 */
function getChangeBadge(
  changeType: string
): { label: string; className: string } | null {
  switch (changeType) {
    case 'ADDED':
      return {
        label: 'New cover art available',
        className: 'text-green-400 bg-green-500/10',
      };
    case 'MODIFIED':
      return {
        label: 'Cover art differs',
        className: 'text-yellow-400 bg-yellow-500/10',
      };
    case 'REMOVED':
      return {
        label: 'Cover art would be removed',
        className: 'text-red-400 bg-red-500/10',
      };
    case 'UNCHANGED':
      return null;
    default:
      return null;
  }
}

/**
 * Cover art comparison component for preview workflow.
 *
 * Displays side-by-side cover art images (128x128 each) with:
 * - Current album cover (using AlbumImage with Cloudflare support)
 * - MusicBrainz/Cover Art Archive source cover
 * - Change badge indicating the type of change
 *
 * Handles missing images with placeholder divs.
 */
export function CoverArtComparison({
  currentUrl,
  sourceUrl,
  changeType,
  currentCloudflareId,
}: CoverArtComparisonProps) {
  const badge = getChangeBadge(changeType);

  return (
    <div className='space-y-3'>
      {/* Side-by-side images */}
      <div className='grid grid-cols-2 gap-4'>
        {/* REC database cover art */}
        <div className='space-y-2'>
          <h4 className='text-xs font-medium text-zinc-500 uppercase tracking-wide'>
            REC DATABASE
          </h4>
          <div className='w-32 h-32 rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700'>
            {currentUrl || currentCloudflareId ? (
              <AlbumImage
                src={currentUrl}
                cloudflareImageId={currentCloudflareId}
                alt='Current cover art'
                width={128}
                height={128}
                className='w-full h-full object-cover'
              />
            ) : (
              <div className='w-full h-full flex items-center justify-center text-zinc-600 text-xs'>
                No cover
              </div>
            )}
          </div>
        </div>

        {/* MusicBrainz cover art */}
        <div className='space-y-2'>
          <h4 className='text-xs font-medium text-zinc-500 uppercase tracking-wide'>
            MusicBrainz
          </h4>
          <div className='w-32 h-32 rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700'>
            {sourceUrl ? (
              <AlbumImage
                src={sourceUrl}
                alt='MusicBrainz cover art'
                width={128}
                height={128}
                className='w-full h-full object-cover'
                showSkeleton={false}
              />
            ) : (
              <div className='w-full h-full flex items-center justify-center text-zinc-600 text-xs'>
                No cover
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Change badge */}
      {badge && (
        <div
          className={`inline-block text-xs px-2 py-1 rounded ${badge.className}`}
        >
          {badge.label}
        </div>
      )}
    </div>
  );
}
