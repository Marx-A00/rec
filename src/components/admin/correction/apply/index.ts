/**
 * Apply workflow components for album correction.
 *
 * Entry point for the apply step, which includes:
 * - Field selection form (metadata, tracks, external IDs)
 * - Diff summary for selected changes
 * - Apply view container with confirmation
 */

export { FieldSelectionForm } from './FieldSelectionForm';
export { MetadataSection } from './MetadataSection';
export { TrackSection } from './TrackSection';
export { ExternalIdSection } from './ExternalIdSection';
export { DiffSummary } from './DiffSummary';
export { ApplyView } from './ApplyView';
export type { UIFieldSelections } from './types';
export { createDefaultUISelections, toGraphQLSelections } from './types';
