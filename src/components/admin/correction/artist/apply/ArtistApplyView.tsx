'use client';

import { type ArtistCorrectionPreview } from '@/generated/graphql';

export interface UIArtistFieldSelections {
  metadata: {
    name: boolean;
    disambiguation: boolean;
    countryCode: boolean;
    artistType: boolean;
    area: boolean;
    beginDate: boolean;
    endDate: boolean;
    gender: boolean;
  };
  externalIds: {
    musicbrainzId: boolean;
    ipi: boolean;
    isni: boolean;
  };
}

export interface ArtistApplyViewProps {
  preview: ArtistCorrectionPreview;
  onApply: (selections: UIArtistFieldSelections) => void;
  onBack: () => void;
  isApplying?: boolean;
  error?: Error | null;
}

/**
 * Placeholder - will be implemented in Task 3
 */
export function ArtistApplyView(_props: ArtistApplyViewProps) {
  return <div>ArtistApplyView placeholder</div>;
}
