// Input components
export { EditableField } from './EditableField';
export { ArtistChipsInput } from './ArtistChipsInput';
export { ExternalIdInput } from './ExternalIdInput';
export { DateInput } from './DateInput';
export { ReleaseTypeSelect } from './ReleaseTypeSelect';

// Container components
export { ManualEditView } from './ManualEditView';
export { UnsavedChangesDialog } from './UnsavedChangesDialog';

// Types
export type {
  ManualEditFieldState,
  ManualEditValidationErrors,
  ManualEditDirtyState,
} from './types';
export {
  createInitialEditState,
  hasUnsavedChanges,
  calculateDirtyState,
} from './types';

// Validation
export { manualEditSchema, RELEASE_TYPES } from './validation';

// Utilities
export { computeManualPreview } from './computeManualDiffs';
