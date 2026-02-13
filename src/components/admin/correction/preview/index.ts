/**
 * Preview module for correction workflow.
 *
 * Provides components for displaying side-by-side comparison
 * of current album data vs. MusicBrainz source data.
 */

// Layout components
export {
  ComparisonLayout,
  type ComparisonLayoutProps,
} from './ComparisonLayout';
export { PreviewSkeleton } from './PreviewSkeleton';
export { PreviewView, type PreviewViewProps } from './PreviewView';

// Field comparison components
export { InlineTextDiff, type InlineTextDiffProps } from './InlineTextDiff';
export { FieldComparison, type FieldComparisonProps } from './FieldComparison';
export {
  FieldComparisonList,
  type FieldComparisonListProps,
} from './FieldComparisonList';

// Track and cover art comparison
export {
  TrackComparison,
  type TrackComparisonProps,
  type TrackDiff,
  type TrackListSummary,
} from './TrackComparison';
export {
  CoverArtComparison,
  type CoverArtComparisonProps,
} from './CoverArtComparison';
