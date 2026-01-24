/**
 * Barrel exports for the preview module.
 * Provides all types, normalizers, diff engine, and preview service.
 */

// Types
export type {
  ChangeType,
  TextDiff,
  TextDiffPart,
  DateDiff,
  DateComponents,
  ArrayDiff,
  ExternalIdDiff,
  TrackDiff,
  TrackListSummary,
  ArtistCreditDiff,
  FieldDiff,
  CorrectionPreview,
  MBRecording,
  MBMedium,
  MBReleaseData,
} from './types';

// Normalizers
export {
  TextNormalizer,
  normalizeForComparison,
  parseDateComponents,
  formatDateComponents,
} from './normalizers';

// Diff Engine
export { DiffEngine } from './diff-engine';

// Preview Service
export {
  CorrectionPreviewService,
  getCorrectionPreviewService,
} from './preview-service';
