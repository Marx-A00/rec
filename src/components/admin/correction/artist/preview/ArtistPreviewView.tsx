'use client';

import { type ArtistCorrectionPreview } from '@/generated/graphql';

export interface ArtistPreviewViewProps {
  artistId: string;
  artistMbid: string;
  onApplyClick?: () => void;
  onPreviewLoaded?: (preview: ArtistCorrectionPreview) => void;
}

/**
 * Placeholder - will be implemented in Task 2
 */
export function ArtistPreviewView(_props: ArtistPreviewViewProps) {
  return <div>ArtistPreviewView placeholder</div>;
}
