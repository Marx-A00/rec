'use client';

import AlbumImage from '@/components/ui/AlbumImage';
import { Badge } from '@/components/ui/badge';

/**
 * Minimal type for search result display.
 * Compatible with GraphQL query results without requiring scoringStrategy.
 */
export interface SearchResultDisplay {
  releaseGroupMbid: string;
  title: string;
  disambiguation?: string | null;
  primaryArtistName: string;
  firstReleaseDate?: string | null;
  primaryType?: string | null;
  secondaryTypes?: string[] | null;
  coverArtUrl?: string | null;
  normalizedScore: number;
}

export interface SearchResultCardProps<T extends SearchResultDisplay> {
  result: T;
  onClick: (result: T) => void;
}

/**
 * A clickable search result card showing album metadata and match score.
 * Used in the correction modal to display MusicBrainz search results.
 */
export function SearchResultCard<T extends SearchResultDisplay>({
  result,
  onClick,
}: SearchResultCardProps<T>) {
  const handleClick = () => {
    onClick(result);
  };

  // Extract year from firstReleaseDate (could be YYYY or YYYY-MM-DD)
  const year = result.firstReleaseDate?.split('-')[0];

  // Build metadata parts for row 3
  const metadataParts: string[] = [];
  if (result.primaryType) {
    metadataParts.push(result.primaryType);
  }
  if (result.secondaryTypes && result.secondaryTypes.length > 0) {
    metadataParts.push(result.secondaryTypes.join(', '));
  }
  const metadataText = metadataParts.join(' · ');

  // Format match score as percentage
  const matchScore = Math.round(result.normalizedScore * 100);

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full flex gap-3 p-3 text-left transition-colors duration-150 hover:bg-zinc-800/50 active:bg-zinc-800 rounded-md"
      aria-label={`Select ${result.title} by ${result.primaryArtistName}`}
    >
      {/* Album thumbnail */}
      <div className="h-12 w-12 flex-shrink-0 rounded overflow-hidden bg-zinc-800">
        <AlbumImage
          src={result.coverArtUrl}
          alt={result.title}
          width={48}
          height={48}
          showSkeleton={false}
          className="h-full w-full object-cover"
        />
      </div>

      {/* Metadata stack */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        {/* Row 1: Title + Score */}
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-cosmic-latte truncate flex-1">
            {result.title}
            {result.disambiguation && (
              <span className="text-zinc-500 ml-1">({result.disambiguation})</span>
            )}
          </span>
          <span className="text-sm font-semibold text-emeraled-green flex-shrink-0">
            {matchScore}% match
          </span>
        </div>

        {/* Row 2: Artist + Year */}
        <div className="text-sm text-zinc-400 truncate">
          {result.primaryArtistName}
          {year && <span> · {year}</span>}
        </div>

        {/* Row 3: Metadata + Source badge */}
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          {metadataText && <span className="truncate">{metadataText}</span>}
          <Badge
            variant="outline"
            className="ml-auto text-zinc-500 border-zinc-700 text-[10px] px-1.5 py-0"
          >
            MB
          </Badge>
        </div>
      </div>
    </button>
  );
}
