'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import type { LlamaLog } from '@/generated/graphql';

// ============================================================================
// Types
// ============================================================================

interface EnrichmentSummaryStripProps {
  log: LlamaLog;
}

// ============================================================================
// Color Helpers
// ============================================================================

function getSourceColor(source: string): string {
  switch (source.toUpperCase()) {
    case 'SPOTIFY':
      return 'bg-green-500/15 text-green-400 border-green-500/30';
    case 'MUSICBRAINZ':
      return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    case 'LASTFM':
      return 'bg-red-500/15 text-red-400 border-red-500/30';
    case 'DISCOGS':
      return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
    case 'DEEZER':
      return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
    default:
      return 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30';
  }
}

function getQualityColor(quality: string): string {
  switch (quality.toUpperCase()) {
    case 'LOW':
      return 'text-red-400';
    case 'MEDIUM':
      return 'text-yellow-400';
    case 'HIGH':
      return 'text-green-400';
    default:
      return 'text-zinc-400';
  }
}

function getTriggeredByColor(triggeredBy: string): string {
  switch (triggeredBy.toUpperCase()) {
    case 'USER':
      return 'bg-blue-500/10 text-blue-300 border-blue-500/20';
    case 'SYSTEM':
      return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    case 'SCHEDULER':
      return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
    default:
      return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
  }
}

// ============================================================================
// EnrichmentSummaryStrip Component
// ============================================================================

export function EnrichmentSummaryStrip({ log }: EnrichmentSummaryStripProps) {
  const hasFieldsEnriched = log.fieldsEnriched && log.fieldsEnriched.length > 0;
  const hasSources = log.sources && log.sources.length > 0;
  const hasQualityTransition = log.dataQualityBefore && log.dataQualityAfter;
  const hasApiCalls = log.apiCallCount > 0;
  const hasTriggeredBy = !!log.triggeredBy;

  // Don't render if nothing to show
  if (
    !hasFieldsEnriched &&
    !hasSources &&
    !hasQualityTransition &&
    !hasApiCalls &&
    !hasTriggeredBy
  ) {
    return null;
  }

  return (
    <div className='flex flex-wrap items-center gap-2 py-2'>
      {/* Fields Enriched */}
      {hasFieldsEnriched &&
        log.fieldsEnriched.map(fieldName => (
          <Badge
            key={fieldName}
            variant='outline'
            className='text-xs border-green-500/30 text-green-400 bg-green-500/10'
          >
            {fieldName}
          </Badge>
        ))}

      {/* Sources */}
      {hasSources &&
        log.sources.map(source => (
          <Badge
            key={source}
            variant='outline'
            className={`text-xs ${getSourceColor(source)}`}
          >
            {source}
          </Badge>
        ))}

      {/* Quality Transition */}
      {hasQualityTransition && (
        <div className='flex items-center gap-1 text-xs'>
          <span className={getQualityColor(log.dataQualityBefore!)}>
            {log.dataQualityBefore}
          </span>
          <ArrowRight className='h-3 w-3 text-zinc-600' />
          <span className={getQualityColor(log.dataQualityAfter!)}>
            {log.dataQualityAfter}
          </span>
        </div>
      )}

      {/* API Call Count */}
      {hasApiCalls && (
        <span className='text-xs text-zinc-500'>
          {log.apiCallCount} API {log.apiCallCount === 1 ? 'call' : 'calls'}
        </span>
      )}

      {/* Triggered By */}
      {hasTriggeredBy && (
        <Badge
          variant='outline'
          className={`text-xs ${getTriggeredByColor(log.triggeredBy!)}`}
        >
          {log.triggeredBy}
        </Badge>
      )}
    </div>
  );
}
