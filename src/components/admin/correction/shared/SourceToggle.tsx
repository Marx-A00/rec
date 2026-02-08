'use client';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { CorrectionSource } from '@/stores/useCorrectionStore';

export interface SourceToggleProps {
  /** Currently selected source */
  value: CorrectionSource;
  /** Callback when source changes */
  onChange: (value: CorrectionSource) => void;
  /** Additional class names */
  className?: string;
  /** Disable toggle (e.g., during search) */
  disabled?: boolean;
}

/**
 * Toggle between MusicBrainz and Discogs correction sources.
 *
 * Uses Radix Toggle Group for accessibility:
 * - Full keyboard navigation
 * - ARIA attributes
 * - Focus management
 *
 * Note: Discogs search is NOT implemented yet (Phase 22+).
 * Toggle exists but Discogs selection will show "Coming soon" state.
 */
export function SourceToggle({
  value,
  onChange,
  className,
  disabled = false,
}: SourceToggleProps) {
  return (
    <div className={className}>
      <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
        Search Source
      </label>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={v => {
          // Guard against undefined (double-click on same button)
          if (v) {
            onChange(v as CorrectionSource);
          }
        }}
        disabled={disabled}
        className="justify-start"
      >
        <ToggleGroupItem
          value="musicbrainz"
          className="px-3 py-1.5 text-sm"
          aria-label="Search MusicBrainz"
        >
          MusicBrainz
        </ToggleGroupItem>
        <ToggleGroupItem
          value="discogs"
          className="px-3 py-1.5 text-sm"
          aria-label="Search Discogs"
        >
          Discogs
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
