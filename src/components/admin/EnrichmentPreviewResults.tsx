// src/components/admin/EnrichmentPreviewResults.tsx
'use client';

import React from 'react';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
  Database,
  Eye,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PreviewEnrichmentResult } from '@/generated/graphql';

interface EnrichmentPreviewResultsProps {
  result: PreviewEnrichmentResult;
  onClose: () => void;
  entityType: 'album' | 'artist';
}

export function EnrichmentPreviewResults({
  result,
  onClose,
  entityType,
}: EnrichmentPreviewResultsProps) {
  const [rawDataExpanded, setRawDataExpanded] = React.useState(false);

  const getMatchConfidenceColor = (score: number | null | undefined) => {
    if (!score) return 'text-zinc-400';
    if (score >= 0.9) return 'text-green-400';
    if (score >= 0.8) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getMatchConfidenceBg = (score: number | null | undefined) => {
    if (!score) return 'bg-zinc-500/10 border-zinc-500/20';
    if (score >= 0.9) return 'bg-green-500/10 border-green-500/20';
    if (score >= 0.8) return 'bg-yellow-500/10 border-yellow-500/20';
    return 'bg-red-500/10 border-red-500/20';
  };

  return (
    <div className='mb-4 rounded-lg border border-purple-500/30 bg-purple-500/5 p-4 space-y-4'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <Eye className='h-5 w-5 text-purple-400' />
          <h3 className='text-sm font-semibold text-white'>
            Preview Enrichment Results
          </h3>
          <Badge
            variant='outline'
            className='bg-purple-500/10 text-purple-400 border-purple-500/20'
          >
            Dry Run
          </Badge>
        </div>
        <Button
          variant='ghost'
          size='sm'
          onClick={onClose}
          className='text-zinc-400 hover:text-white'
        >
          <XCircle className='h-4 w-4' />
        </Button>
      </div>

      {/* Status */}
      <div className='flex items-center gap-4'>
        {result.success ? (
          <div className='flex items-center gap-2 text-green-400'>
            <CheckCircle className='h-4 w-4' />
            <span className='text-sm'>Data found</span>
          </div>
        ) : (
          <div className='flex items-center gap-2 text-red-400'>
            <XCircle className='h-4 w-4' />
            <span className='text-sm'>No data found</span>
          </div>
        )}

        {result.matchScore !== null && result.matchScore !== undefined && (
          <div
            className={`flex items-center gap-2 ${getMatchConfidenceColor(result.matchScore)}`}
          >
            <AlertCircle className='h-4 w-4' />
            <span className='text-sm'>
              Match confidence: {(result.matchScore * 100).toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {/* Matched Entity */}
      {result.matchedEntity && (
        <div className='text-sm'>
          <span className='text-zinc-500'>Matched: </span>
          <span className='text-zinc-300'>{result.matchedEntity}</span>
        </div>
      )}

      {/* Message */}
      {result.message && (
        <div className='text-sm text-zinc-400 bg-zinc-800/50 p-2 rounded'>
          {result.message}
        </div>
      )}

      {/* Sources */}
      {result.sources && result.sources.length > 0 && (
        <div className='flex items-center gap-2'>
          <Database className='h-4 w-4 text-zinc-500' />
          <span className='text-xs text-zinc-500'>Sources:</span>
          <div className='flex gap-1'>
            {result.sources.map(source => (
              <Badge
                key={source}
                variant='outline'
                className='text-xs bg-zinc-800 text-zinc-300 border-zinc-700'
              >
                {source}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Fields to Update */}
      {result.fieldsToUpdate && result.fieldsToUpdate.length > 0 && (
        <div className='space-y-2'>
          <h4 className='text-sm font-medium text-white flex items-center gap-2'>
            <ArrowRight className='h-4 w-4 text-purple-400' />
            Fields that would be updated ({result.fieldsToUpdate.length})
          </h4>
          <div className='space-y-2'>
            {result.fieldsToUpdate.map((field, index) => (
              <div
                key={index}
                className='flex items-start gap-3 p-2 bg-zinc-800/50 rounded text-xs'
              >
                <Badge
                  variant='outline'
                  className='bg-blue-500/10 text-blue-300 border-blue-500/20 shrink-0'
                >
                  {field.field}
                </Badge>
                <div className='flex-1 min-w-0 space-y-1'>
                  <div className='flex items-center gap-2'>
                    <span className='text-zinc-500 shrink-0'>Current:</span>
                    <span className='text-red-400 truncate'>
                      {field.currentValue || '(empty)'}
                    </span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <span className='text-zinc-500 shrink-0'>New:</span>
                    <span className='text-green-400 truncate'>
                      {field.newValue || '(empty)'}
                    </span>
                  </div>
                </div>
                <Badge
                  variant='outline'
                  className='text-xs bg-zinc-700 text-zinc-400 border-zinc-600 shrink-0'
                >
                  {field.source}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.fieldsToUpdate?.length === 0 && result.success && (
        <div className='text-sm text-zinc-500 text-center py-2'>
          No fields would be updated - all data is already up to date
        </div>
      )}

      {/* Raw Data (Collapsible) */}
      {result.rawData && (
        <div className='border-t border-zinc-700 pt-3'>
          <button
            onClick={() => setRawDataExpanded(!rawDataExpanded)}
            className='flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-300 transition-colors'
          >
            {rawDataExpanded ? (
              <ChevronDown className='h-4 w-4' />
            ) : (
              <ChevronRight className='h-4 w-4' />
            )}
            Raw API Data
          </button>
          {rawDataExpanded && (
            <pre className='mt-2 p-3 bg-zinc-900 rounded text-xs text-zinc-400 overflow-x-auto max-h-96 custom-scrollbar'>
              {JSON.stringify(result.rawData, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
