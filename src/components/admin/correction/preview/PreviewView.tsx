'use client';

import { useGetCorrectionPreviewQuery } from '@/generated/graphql';
import { ComparisonLayout } from './ComparisonLayout';
import { PreviewSkeleton } from './PreviewSkeleton';

/**
 * Props for PreviewView component
 */
export interface PreviewViewProps {
  /** Database album ID to preview corrections for */
  albumId: string;
  /** MusicBrainz release group MBID from search selection */
  releaseGroupMbid: string;
}

/**
 * Container component for the correction preview workflow step.
 *
 * Fetches correction preview data via GraphQL and renders:
 * - Loading: Skeleton placeholder while fetching
 * - Error: Red error message for query failures
 * - Success: Side-by-side comparison layout with preview data
 *
 * The actual field and track comparison components will be added
 * in Plans 08-02 (field comparison) and 08-03 (track comparison).
 * This component provides the shell and data fetching.
 */
export function PreviewView({ albumId, releaseGroupMbid }: PreviewViewProps) {
  const { data, isLoading, error } = useGetCorrectionPreviewQuery(
    { input: { albumId, releaseGroupMbid } },
    {
      enabled: Boolean(albumId && releaseGroupMbid),
      staleTime: 5 * 60 * 1000, // Cache preview for 5 minutes
    }
  );

  // Loading state
  if (isLoading) {
    return <PreviewSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-red-400 font-medium">Failed to load preview data</p>
          <p className="text-sm text-zinc-500 mt-1">
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </p>
        </div>
      </div>
    );
  }

  const preview = data?.correctionPreview;

  // No data state (shouldn't happen if query succeeds, but guard anyway)
  if (!preview) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-zinc-500">Preview data not available</p>
      </div>
    );
  }

  // Extract data for display
  const { summary, coverArt, sourceResult } = preview;

  return (
    <div className="space-y-6">
      {/* Summary change counts */}
      <div className="flex items-center gap-4 p-4 bg-zinc-800/50 rounded-lg text-sm">
        <span className="text-zinc-400">Changes:</span>
        {summary.changedFields > 0 && (
          <span className="text-amber-400">
            {summary.changedFields} field{summary.changedFields !== 1 ? 's' : ''} modified
          </span>
        )}
        {summary.addedFields > 0 && (
          <span className="text-green-400">
            {summary.addedFields} field{summary.addedFields !== 1 ? 's' : ''} added
          </span>
        )}
        {summary.hasTrackChanges && (
          <span className="text-blue-400">Track changes</span>
        )}
        {summary.changedFields === 0 && summary.addedFields === 0 && !summary.hasTrackChanges && (
          <span className="text-zinc-500">No changes detected</span>
        )}
      </div>

      {/* Cover art comparison */}
      <div className="grid grid-cols-2 gap-6">
        {/* Current cover art */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">
            Cover Art
          </h4>
          <div className="w-32 h-32 rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700">
            {coverArt?.currentUrl ? (
              <img
                src={coverArt.currentUrl}
                alt="Current cover art"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
                No cover
              </div>
            )}
          </div>
        </div>

        {/* MusicBrainz cover art */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">
            Cover Art
          </h4>
          <div className="w-32 h-32 rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700">
            {coverArt?.sourceUrl ? (
              <img
                src={coverArt.sourceUrl}
                alt="MusicBrainz cover art"
                className="w-full h-full object-cover"
              />
            ) : sourceResult?.coverArtUrl ? (
              <img
                src={sourceResult.coverArtUrl}
                alt="MusicBrainz cover art"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
                No cover
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Side-by-side comparison (placeholder content for Plans 08-02/03) */}
      <ComparisonLayout
        current={
          <div className="p-4 bg-zinc-800/30 rounded-lg border border-zinc-700/50">
            <p className="text-zinc-400 text-sm">
              Current data: <span className="text-zinc-200">{preview.albumTitle}</span>
            </p>
            <p className="text-zinc-500 text-xs mt-1">
              Field comparisons will be rendered here (Plan 08-02)
            </p>
          </div>
        }
        source={
          <div className="p-4 bg-zinc-800/30 rounded-lg border border-zinc-700/50">
            <p className="text-zinc-400 text-sm">
              MusicBrainz source: <span className="text-zinc-200">{sourceResult?.title ?? 'Unknown'}</span>
            </p>
            <p className="text-zinc-500 text-xs mt-1">
              Field comparisons will be rendered here (Plan 08-02)
            </p>
          </div>
        }
      />

      {/* Track comparison placeholder */}
      <div className="p-4 bg-zinc-800/30 rounded-lg border border-zinc-700/50">
        <h4 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-2">
          Track Comparison
        </h4>
        <p className="text-zinc-500 text-xs">
          Track-by-track comparison will be rendered here (Plan 08-03)
        </p>
        {preview.trackSummary && (
          <div className="flex gap-4 mt-3 text-xs">
            <span className="text-zinc-400">
              Current: {preview.trackSummary.totalCurrent} tracks
            </span>
            <span className="text-zinc-400">
              Source: {preview.trackSummary.totalSource} tracks
            </span>
            {preview.trackSummary.modified > 0 && (
              <span className="text-amber-400">
                {preview.trackSummary.modified} modified
              </span>
            )}
            {preview.trackSummary.added > 0 && (
              <span className="text-green-400">
                {preview.trackSummary.added} added
              </span>
            )}
            {preview.trackSummary.removed > 0 && (
              <span className="text-red-400">
                {preview.trackSummary.removed} removed
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
