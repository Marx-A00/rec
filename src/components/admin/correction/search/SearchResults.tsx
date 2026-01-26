'use client';

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchResultCard, type SearchResultDisplay } from './SearchResultCard';
import { NoResultsState } from './NoResultsState';

/**
 * Minimal type for grouped search result display.
 * Compatible with GraphQL query results.
 */
export interface GroupedResultDisplay<T extends SearchResultDisplay> {
  releaseGroupMbid: string;
  primaryResult: T;
}

export interface SearchResultsProps<T extends SearchResultDisplay> {
  results: GroupedResultDisplay<T>[];
  hasMore: boolean;
  isLoadingMore: boolean;
  onResultClick: (result: T) => void;
  onLoadMore: () => void;
  onManualEdit: () => void;
}

/**
 * Container component for displaying search results with pagination.
 * Shows a list of SearchResultCards or NoResultsState if empty.
 */
export function SearchResults<T extends SearchResultDisplay>({
  results,
  hasMore,
  isLoadingMore,
  onResultClick,
  onLoadMore,
  onManualEdit,
}: SearchResultsProps<T>) {
  // Show empty state when no results
  if (results.length === 0) {
    return <NoResultsState onManualEdit={onManualEdit} />;
  }

  return (
    <div className="space-y-1">
      {/* Results list */}
      <div className="divide-y divide-zinc-800/50">
        {results.map((group) => (
          <SearchResultCard
            key={group.releaseGroupMbid}
            result={group.primaryResult}
            onClick={onResultClick}
          />
        ))}
      </div>

      {/* Load more button */}
      {hasMore && (
        <div className="pt-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={onLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Load more results'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
