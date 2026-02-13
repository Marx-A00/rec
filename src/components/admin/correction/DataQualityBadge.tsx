'use client';

import { Badge } from '@/components/ui/badge';
import { DataQuality } from '@/generated/graphql';
import { cn } from '@/lib/utils';

export interface DataQualityBadgeProps {
  /** Data quality enum from GraphQL */
  quality: DataQuality;
  /** True if all three external IDs (musicbrainzId, spotifyId, discogsId) are present */
  hasAllExternalIds: boolean;
  /** Optional click handler for future detail popover */
  onClick?: () => void;
}

type QualityLevel = 'Excellent' | 'Good' | 'Fair' | 'Poor';

const levelConfig: Record<QualityLevel, { bg: string; text: string }> = {
  Excellent: { bg: 'bg-emeraled-green', text: 'text-white' },
  Good: { bg: 'bg-maximum-yellow', text: 'text-black' },
  Fair: { bg: 'bg-zinc-600', text: 'text-white' },
  Poor: { bg: 'bg-dark-pastel-red', text: 'text-white' },
};

/**
 * Displays a quality badge based on DataQuality enum and external ID completeness.
 *
 * Logic:
 * - Excellent: HIGH quality AND all 3 external IDs present
 * - Good: HIGH quality (but missing some IDs)
 * - Fair: MEDIUM quality
 * - Poor: LOW quality
 */
export function DataQualityBadge({
  quality,
  hasAllExternalIds,
  onClick,
}: DataQualityBadgeProps) {
  const getLevel = (): QualityLevel => {
    if (quality === DataQuality.High && hasAllExternalIds) {
      return 'Excellent';
    }
    if (quality === DataQuality.High) {
      return 'Good';
    }
    if (quality === DataQuality.Medium) {
      return 'Fair';
    }
    return 'Poor';
  };

  const level = getLevel();
  const config = levelConfig[level];

  return (
    <Badge
      className={cn(
        config.bg,
        config.text,
        'border-transparent',
        onClick && 'cursor-pointer hover:opacity-90'
      )}
      onClick={onClick}
    >
      {level}
    </Badge>
  );
}
