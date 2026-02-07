'use client';

import { useMemo, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

import {
  useGetArtistCorrectionPreviewQuery,
  type ArtistCorrectionPreview,
  type ArtistFieldDiff,
  ChangeType,
} from '@/generated/graphql';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeletons';
import { getArtistCorrectionStore } from '@/stores/useArtistCorrectionStore';

import { ErrorState, categorizeError } from '../../shared';

export interface ArtistPreviewViewProps {
  /** Database artist ID for store lookup */
  artistId: string;
}

/**
 * Format camelCase field names to human-readable labels.
 */
function formatFieldName(field: string): string {
  const labels: Record<string, string> = {
    name: 'Name',
    disambiguation: 'Disambiguation',
    countryCode: 'Country',
    artistType: 'Type',
    area: 'Area',
    beginDate: 'Begin Date',
    endDate: 'End Date',
    gender: 'Gender',
    musicbrainzId: 'MusicBrainz ID',
    ipi: 'IPI',
    isni: 'ISNI',
  };
  return (
    labels[field] ||
    field.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())
  );
}

/**
 * Get change badge for display.
 */
function getChangeBadge(
  changeType: ChangeType
): { label: string; className: string } | null {
  switch (changeType) {
    case ChangeType.Added:
      return { label: '(New)', className: 'text-green-400' };
    case ChangeType.Modified:
      return { label: '(Modified)', className: 'text-yellow-400' };
    case ChangeType.Removed:
      return { label: '(Removed)', className: 'text-red-400' };
    case ChangeType.Unchanged:
      return null;
    default:
      return null;
  }
}

/**
 * Single field comparison display.
 */
function ArtistFieldComparisonItem({ diff }: { diff: ArtistFieldDiff }) {
  if (diff.changeType === ChangeType.Unchanged) return null;

  const badge = getChangeBadge(diff.changeType);
  const fieldLabel = formatFieldName(diff.field);

  return (
    <div className='py-3 border-b border-zinc-800 last:border-b-0'>
      <div className='flex items-center gap-2 mb-1'>
        <span className='text-sm font-medium text-zinc-300'>{fieldLabel}</span>
        {badge && (
          <span className={'text-xs ' + badge.className}>{badge.label}</span>
        )}
      </div>
      <div className='text-sm'>
        <span className='text-zinc-500 text-xs mr-2'>Current:</span>
        <span className='text-zinc-400'>{diff.current || '—'}</span>
      </div>
      <div className='text-sm mt-1'>
        <span className='text-zinc-500 text-xs mr-2'>Source:</span>
        <span className='text-zinc-200'>{diff.source || '—'}</span>
      </div>
    </div>
  );
}

/**
 * Artist preview skeleton.
 */
function ArtistPreviewSkeleton() {
  return (
    <div className='space-y-6'>
      <Skeleton className='h-20 w-full' />
      <div className='space-y-4'>
        {[...Array(5)].map((_, i) => (
          <div key={i} className='space-y-2'>
            <Skeleton className='h-4 w-24' />
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-full' />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Artist correction preview view.
 *
 * Shows all artist fields with diff highlighting.
 * Includes warning about affected albums count.
 * Reads artistMbid from store and writes preview data back to store on load.
 */
export function ArtistPreviewView({ artistId }: ArtistPreviewViewProps) {
  // Get store for this artist
  const store = getArtistCorrectionStore(artistId);
  const selectedArtistMbid = store(s => s.selectedArtistMbid);

  const { data, isLoading, error, refetch, isFetching } =
    useGetArtistCorrectionPreviewQuery(
      { artistId, artistMbid: selectedArtistMbid! },
      {
        enabled: Boolean(artistId && selectedArtistMbid),
        staleTime: 5 * 60 * 1000,
      }
    );

  // Write preview data to store when it loads
  useEffect(() => {
    if (data?.artistCorrectionPreview) {
      store
        .getState()
        .setPreviewLoaded(
          data.artistCorrectionPreview as ArtistCorrectionPreview
        );
    }
  }, [data?.artistCorrectionPreview, store]);

  // Determine which accordion sections should be expanded by default
  const defaultExpanded = useMemo(() => {
    const preview = data?.artistCorrectionPreview;
    if (!preview) return ['metadata', 'external-ids'];

    const expanded: string[] = [];

    // Check for metadata changes
    const metadataFields = [
      'name',
      'disambiguation',
      'countryCode',
      'artistType',
      'area',
      'beginDate',
      'endDate',
      'gender',
    ];
    const hasMetadataChanges = preview.fieldDiffs.some(
      d =>
        metadataFields.includes(d.field) &&
        d.changeType !== ChangeType.Unchanged
    );
    if (hasMetadataChanges) expanded.push('metadata');

    // Check for external ID changes
    const externalIdFields = ['musicbrainzId', 'ipi', 'isni'];
    const hasIdChanges = preview.fieldDiffs.some(
      d =>
        externalIdFields.includes(d.field) &&
        d.changeType !== ChangeType.Unchanged
    );
    if (hasIdChanges) expanded.push('external-ids');

    if (expanded.length === 0) return ['metadata', 'external-ids'];
    return expanded;
  }, [data?.artistCorrectionPreview]);

  // Guard: selectedArtistMbid required
  if (!selectedArtistMbid) {
    return (
      <div className='flex items-center justify-center py-12'>
        <p className='text-zinc-500'>No artist selected</p>
      </div>
    );
  }

  if (isLoading) {
    return <ArtistPreviewSkeleton />;
  }

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

  const preview = data?.artistCorrectionPreview;
  if (!preview) {
    return (
      <div className='flex items-center justify-center py-12'>
        <p className='text-zinc-500'>Preview data not available</p>
      </div>
    );
  }

  const { summary, fieldDiffs, albumCount, currentArtist } = preview;

  // Separate field diffs into categories
  const metadataFields = [
    'name',
    'disambiguation',
    'countryCode',
    'artistType',
    'area',
    'beginDate',
    'endDate',
    'gender',
  ];
  const externalIdFields = ['musicbrainzId', 'ipi', 'isni'];

  const metadataDiffs = fieldDiffs.filter(d =>
    metadataFields.includes(d.field)
  );
  const externalIdDiffs = fieldDiffs.filter(d =>
    externalIdFields.includes(d.field)
  );

  // Count changes per section
  const metadataChangeCount = metadataDiffs.filter(
    d => d.changeType !== ChangeType.Unchanged
  ).length;
  const externalIdChangeCount = externalIdDiffs.filter(
    d => d.changeType !== ChangeType.Unchanged
  ).length;

  return (
    <div className='space-y-6'>
      {/* Summary */}
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
        {summary.changedFields === 0 && summary.addedFields === 0 && (
          <span className='text-zinc-500'>No changes detected</span>
        )}
      </div>

      {/* Album count warning */}
      {albumCount > 0 && (
        <div className='flex items-center gap-3 p-3 bg-amber-900/20 border border-amber-800/50 rounded-lg'>
          <AlertTriangle className='h-5 w-5 text-amber-400 flex-shrink-0' />
          <p className='text-sm text-amber-300'>
            This artist has <strong>{albumCount}</strong> album
            {albumCount !== 1 ? 's' : ''} in the database
          </p>
        </div>
      )}

      {/* Artist info header */}
      <div className='border-b border-zinc-700 pb-4'>
        <h3 className='text-lg font-medium text-zinc-100'>
          {currentArtist.name}
        </h3>
        <p className='text-sm text-zinc-400'>Comparing with MusicBrainz data</p>
      </div>

      {/* Accordion sections */}
      <Accordion
        type='multiple'
        defaultValue={defaultExpanded}
        className='w-full'
      >
        {/* Metadata Section */}
        <AccordionItem value='metadata' className='border-zinc-700'>
          <AccordionTrigger className='text-zinc-200 hover:text-zinc-100 hover:no-underline'>
            <div className='flex items-center gap-2'>
              <span>Metadata</span>
              {metadataChangeCount > 0 && (
                <span className='text-xs text-yellow-400'>
                  ({metadataChangeCount} change
                  {metadataChangeCount !== 1 ? 's' : ''})
                </span>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className='space-y-1 divide-y divide-zinc-800'>
              {metadataDiffs.map(diff => (
                <ArtistFieldComparisonItem key={diff.field} diff={diff} />
              ))}
            </div>
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
            <div className='space-y-1 divide-y divide-zinc-800'>
              {externalIdDiffs.map(diff => (
                <ArtistFieldComparisonItem key={diff.field} diff={diff} />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
