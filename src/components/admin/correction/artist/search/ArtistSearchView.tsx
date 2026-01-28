'use client';

import { type Artist } from '@/generated/graphql';
import { type useArtistCorrectionModalState } from '@/hooks/useArtistCorrectionModalState';

export interface ArtistSearchViewProps {
  artist: Artist;
  onResultSelect: (mbid: string) => void;
  modalState: ReturnType<typeof useArtistCorrectionModalState>;
}

/**
 * Placeholder - will be implemented in Task 2
 */
export function ArtistSearchView(_props: ArtistSearchViewProps) {
  return <div>ArtistSearchView placeholder</div>;
}
