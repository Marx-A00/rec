'use client';

import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface NoResultsStateProps {
  onManualEdit: () => void;
}

/**
 * Empty state shown when no search results are found.
 * Provides a helpful message and link to Manual Edit as an escape hatch.
 */
export function NoResultsState({ onManualEdit }: NoResultsStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertCircle className="h-12 w-12 text-zinc-600 mb-4" />
      <h3 className="text-lg font-medium text-cosmic-latte mb-2">
        No results found
      </h3>
      <p className="text-sm text-zinc-400 mb-6 max-w-sm">
        We couldn&apos;t find any matches in MusicBrainz. Try adjusting your
        search or enter the data manually.
      </p>
      <Button variant="outline" onClick={onManualEdit}>
        Manual Edit
      </Button>
    </div>
  );
}
