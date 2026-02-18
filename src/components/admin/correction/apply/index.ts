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
export { ArtistSection } from './ArtistSection';
export { TrackSection } from './TrackSection';
export { ExternalIdSection } from './ExternalIdSection';
export { CoverArtSection } from './CoverArtSection';
export { DiffSummary } from './DiffSummary';
export { ApplyView } from './ApplyView';
export type { UIFieldSelections } from './types';
export { createDefaultUISelections, toGraphQLSelections } from './types';
export { calculateHasSelections } from './ApplyView';