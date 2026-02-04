'use client';

import { useMemo, useEffect } from 'react';

import { useGetCorrectionPreviewQuery } from '@/generated/graphql';
import type {
  FieldDiff,
  ArtistCreditDiff,
  CorrectionPreview,
} from '@/lib/correction/preview/types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ErrorState, categorizeError } from '../shared';

import { PreviewSkeleton } from './PreviewSkeleton';
import { CoverArtComparison } from './CoverArtComparison';
import { FieldComparisonList } from './FieldComparisonList';
import {
  TrackComparison,
  type TrackDiff,
  type TrackListSummary,
} from './TrackComparison';

/**
 * Props for PreviewView component
 */
export interface PreviewViewProps {
  /** Database album ID to preview corrections for */
  albumId: string;
  /** MusicBrainz release group MBID from search selection */
  releaseGroupMbid: string;
  /** Callback when preview data loads successfully - exposes data to parent for ApplyView */
  onPreviewLoaded?: (preview: CorrectionPreview) => void;
}

/**
 * Container component for the correction preview workflow step.
 *
 * Fetches correction preview data via GraphQL and renders:
 * - Loading: Skeleton placeholder while fetching
 * - Error: Red error message for query failures
 * - Success: Complete preview with cover art, fields, and tracks in accordion
 *
 * Layout:
 * - Header: Cover art comparison side-by-side
 * - Accordion sections:
 *   - Basic Info: Field comparisons (title, date, type, etc.)
 *   - Tracks: Position-aligned track comparison
 *   - External IDs: MusicBrainz, Spotify, Discogs IDs
 * - Footer: "Apply This Match" button to proceed to apply step
 */
export function PreviewView({
  albumId,
  releaseGroupMbid,
  onPreviewLoaded,
}: PreviewViewProps) {
  const { data, isLoading, error, refetch, isFetching } =
    useGetCorrectionPreviewQuery(
      { input: { albumId, releaseGroupMbid } },
      {
        enabled: Boolean(albumId && releaseGroupMbid),
        staleTime: 5 * 60 * 1000, // Cache preview for 5 minutes
      }
    );

  // Notify parent when preview data loads
  useEffect(() => {
    if (data?.correctionPreview && onPreviewLoaded) {
      onPreviewLoaded(data.correctionPreview as unknown as CorrectionPreview);
    }
  }, [data?.correctionPreview, onPreviewLoaded]);

  // Determine which accordion sections should be expanded by default
  const defaultExpanded = useMemo(() => {
    const preview = data?.correctionPreview;
    if (!preview) return ['basic-info', 'tracks'];

    const expanded: string[] = [];

    // Expand basic info if there are field changes
    const fieldDiffs = preview.fieldDiffs as FieldDiff[];
    const hasFieldChanges = fieldDiffs.some(d => d.changeType !== 'UNCHANGED');
    const hasArtistChanges = preview.artistDiff?.changeType !== 'UNCHANGED';
    if (hasFieldChanges || hasArtistChanges) {
      expanded.push('basic-info');
    }

    // Expand tracks if there are track changes
    if (preview.summary.hasTrackChanges) {
      expanded.push('tracks');
    }

    // Expand external IDs if there are ID changes
    const externalIdFields = ['musicbrainzId', 'spotifyId', 'discogsId'];
    const hasIdChanges = fieldDiffs.some(
      d => externalIdFields.includes(d.field) && d.changeType !== 'UNCHANGED'
    );
    if (hasIdChanges) {
      expanded.push('external-ids');
    }

    // If nothing has changes, show all sections
    if (expanded.length === 0) {
      return ['basic-info', 'tracks', 'external-ids'];
    }

    return expanded;
  }, [data?.correctionPreview]);

  // Loading state
  if (isLoading) {
    return <PreviewSkeleton />;
  }

  // Error state
  if (error) {
    const errorType = categorizeError(error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to load preview data';

    return (
      <div className='flex items-center justify-center py-12'>
        <ErrorState
          message={errorMessage}
          type={errorType}
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      </div>
    );
  }

  const preview = data?.correctionPreview;

  // No data state (shouldn't happen if query succeeds, but guard anyway)
  if (!preview) {
    return (
      <div className='flex items-center justify-center py-12'>
        <p className='text-zinc-500'>Preview data not available</p>
      </div>
    );
  }

  // Extract and type data
  const { summary, coverArt, sourceResult, artistDiff, trackSummary } = preview;
  const fieldDiffs = preview.fieldDiffs as FieldDiff[];
  const trackDiffs = preview.trackDiffs as TrackDiff[];

  // Separate field diffs into categories
  const externalIdFields = ['musicbrainzId', 'spotifyId', 'discogsId'];
  const basicInfoDiffs = fieldDiffs.filter(
    d => !externalIdFields.includes(d.field)
  );
  const externalIdDiffs = fieldDiffs.filter(d =>
    externalIdFields.includes(d.field)
  );

  // Count changes for accordion badges
  const basicInfoChangeCount =
    basicInfoDiffs.filter(d => d.changeType !== 'UNCHANGED').length +
    (artistDiff?.changeType !== 'UNCHANGED' ? 1 : 0);
  const trackChangeCount =
    (trackSummary?.modified ?? 0) +
    (trackSummary?.added ?? 0) +
    (trackSummary?.removed ?? 0);
  const externalIdChangeCount = externalIdDiffs.filter(
    d => d.changeType !== 'UNCHANGED'
  ).length;

  return (
    <div className='space-y-6'>
      {/* Summary change counts */}
      <div className='flex items-center gap-4 p-4 bg-zinc-800/50 rounded-lg text-sm'>
        <span className='text-zinc-400'>Changes:</span>
        {summary.changedFields > 0 && (
          <span className='text-amber-400'>
            {summary.changedFields} field
            {summary.changedFields !== 1 ? 's' : ''} modified
          </span>
        )}
        {summary.addedFields > 0 && (
          <span className='text-green-400'>
            {summary.addedFields} field{summary.addedFields !== 1 ? 's' : ''}{' '}
            added
          </span>
        )}
        {summary.hasTrackChanges && (
          <span className='text-blue-400'>Track changes</span>
        )}
        {summary.changedFields === 0 &&
          summary.addedFields === 0 &&
          !summary.hasTrackChanges && (
            <span className='text-zinc-500'>No changes detected</span>
          )}
      </div>

      {/* Header: Cover art comparison */}
      <CoverArtComparison
        currentUrl={coverArt?.currentUrl ?? null}
        sourceUrl={sourceResult?.coverArtUrl ?? coverArt?.sourceUrl ?? null}
        changeType={coverArt?.changeType ?? 'UNCHANGED'}
      />

      {/* Album title + source info */}
      <div className='border-b border-zinc-700 pb-4'>
        <h3 className='text-lg font-medium text-zinc-100'>
          {preview.albumTitle}
        </h3>
        <p className='text-sm text-zinc-400'>
          Comparing with:{' '}
          <span className='text-zinc-300'>{sourceResult?.title}</span>
          {sourceResult?.disambiguation && (
            <span className='text-zinc-500'>
              {' '}
              ({sourceResult.disambiguation})
            </span>
          )}
        </p>
      </div>

      {/* Accordion sections */}
      <Accordion
        type='multiple'
        defaultValue={defaultExpanded}
        className='w-full'
      >
        {/* Basic Info Section */}
        <AccordionItem value='basic-info' className='border-zinc-700'>
          <AccordionTrigger className='text-zinc-200 hover:text-zinc-100 hover:no-underline'>
            <div className='flex items-center gap-2'>
              <span>Basic Info</span>
              {basicInfoChangeCount > 0 && (
                <span className='text-xs text-yellow-400'>
                  ({basicInfoChangeCount} change
                  {basicInfoChangeCount !== 1 ? 's' : ''})
                </span>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <FieldComparisonList
              fieldDiffs={basicInfoDiffs}
              artistDiff={artistDiff as ArtistCreditDiff}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Tracks Section */}
        <AccordionItem value='tracks' className='border-zinc-700'>
          <AccordionTrigger className='text-zinc-200 hover:text-zinc-100 hover:no-underline'>
            <div className='flex items-center gap-2'>
              <span>Tracks</span>
              {trackChangeCount > 0 && (
                <span className='text-xs text-yellow-400'>
                  ({trackChangeCount} change{trackChangeCount !== 1 ? 's' : ''})
                </span>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <TrackComparison
              trackDiffs={trackDiffs}
              summary={trackSummary as TrackListSummary}
            />
          </AccordionContent>
        </AccordionItem>

        {/* External IDs Section */}
        <AccordionItem value='external-ids' className='border-zinc-700'>
          <AccordionTrigger className='text-zinc-200 hover:text-zinc-100 hover:no-underline'>
            <div className='flex items-center gap-2'>
              <span>External IDs</span>
              {externalIdChangeCount > 0 && (
                <span className='text-xs text-yellow-400'>
                  ({externalIdChangeCount} change
                  {externalIdChangeCount !== 1 ? 's' : ''})
                </span>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <FieldComparisonList fieldDiffs={externalIdDiffs} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

    </div>
  );
}
