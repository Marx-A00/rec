/**
 * Apply step components for the correction workflow.
 *
 * Provides field selection UI with accordion sections and hierarchical checkboxes.
 */

export { FieldSelectionForm } from './FieldSelectionForm';
export type { FieldSelectionFormProps } from './FieldSelectionForm';

export { MetadataSection } from './MetadataSection';
export type { MetadataSectionProps } from './MetadataSection';

export { TrackSection } from './TrackSection';
export type { TrackSectionProps } from './TrackSection';

export { ExternalIdSection } from './ExternalIdSection';
export type { ExternalIdSectionProps } from './ExternalIdSection';

export type { UIFieldSelections } from './types';
export { createDefaultUISelections, toGraphQLSelections } from './types';
