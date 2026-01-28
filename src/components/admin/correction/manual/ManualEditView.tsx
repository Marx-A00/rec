'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { AlertCircle } from 'lucide-react';

import type { CurrentDataViewAlbum } from '../CurrentDataView';
import type { ManualEditFieldState, ManualEditValidationErrors } from './types';
import { createInitialEditState, hasUnsavedChanges } from './types';
import { manualEditSchema } from './validation';
import { EditableField } from './EditableField';
import { ArtistChipsInput } from './ArtistChipsInput';
import { DateInput } from './DateInput';
import { ReleaseTypeSelect } from './ReleaseTypeSelect';
import { ExternalIdInput } from './ExternalIdInput';

export interface ManualEditViewProps {
  album: CurrentDataViewAlbum;
  onPreviewClick: (editedState: ManualEditFieldState) => void;
  onCancel: () => void;
  initialState?: ManualEditFieldState;
}

/**
 * Main container for manual edit step.
 * 
 * Provides inline editing for all album fields with validation.
 * Blocks preview button until all fields are valid.
 */
export function ManualEditView({
  album,
  onPreviewClick,
  onCancel,
  initialState,
}: ManualEditViewProps) {
  const [formState, setFormState] = useState<ManualEditFieldState>(
    () => initialState ?? createInitialEditState(album)
  );
  const [errors, setErrors] = useState<ManualEditValidationErrors>({});
  const [showValidationBanner, setShowValidationBanner] = useState(false);

  const originalState = createInitialEditState(album);
  const isDirty = hasUnsavedChanges(originalState, formState);

  // Update individual field
  const updateField = <K extends keyof ManualEditFieldState>(
    field: K,
    value: ManualEditFieldState[K]
  ) => {
    setFormState(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user edits
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    // Hide banner when user starts fixing
    if (showValidationBanner) {
      setShowValidationBanner(false);
    }
  };

  // Validate entire form before preview
  const handlePreviewClick = () => {
    const result = manualEditSchema.safeParse(formState);
    
    if (!result.success) {
      // Extract errors from Zod
      const newErrors: ManualEditValidationErrors = {};
      result.error.errors.forEach(err => {
        const field = err.path[0] as keyof ManualEditFieldState;
        newErrors[field] = err.message;
      });
      
      setErrors(newErrors);
      setShowValidationBanner(true);
      return;
    }
    
    // All valid - proceed to preview
    setErrors({});
    setShowValidationBanner(false);
    onPreviewClick(formState);
  };

  // Count errors for banner
  const errorCount = Object.keys(errors).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-zinc-100">Edit Album Data</h2>
        <p className="text-sm text-zinc-400">
          Make changes directly, then preview before applying
        </p>
      </div>

      {/* Validation banner */}
      {showValidationBanner && errorCount > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-500/50 bg-amber-500/10">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-amber-200">
              {errorCount} validation {errorCount === 1 ? 'error' : 'errors'}
            </p>
            <p className="text-sm text-amber-300/80 mt-1">
              Please fix the errors below before previewing changes.
            </p>
          </div>
        </div>
      )}

      {/* Basic Info Section */}
      <div className="border border-zinc-800 rounded-lg p-6 space-y-6 bg-zinc-900/50">
        <h3 className="text-lg font-semibold text-zinc-100">Basic Information</h3>
        
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Title <span className="text-red-400">*</span>
          </label>
          <EditableField
            value={formState.title}
            onChange={(value) => updateField('title', value)}
            placeholder="Album title"
            error={errors.title}
          />
        </div>

        {/* Artists */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Artists <span className="text-red-400">*</span>
          </label>
          <ArtistChipsInput
            value={formState.artists}
            onChange={(value) => updateField('artists', value)}
            error={errors.artists}
          />
        </div>

        {/* Release Date */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Release Date
          </label>
          <DateInput
            value={formState.releaseDate}
            onChange={(value) => updateField('releaseDate', value)}
            error={errors.releaseDate}
          />
        </div>

        {/* Release Type */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Release Type
          </label>
          <ReleaseTypeSelect
            value={formState.releaseType}
            onChange={(value) => updateField('releaseType', value)}
            error={errors.releaseType}
          />
        </div>
      </div>

      {/* External IDs Section (Collapsible) */}
      <Accordion type="single" collapsible defaultValue="external-ids">
        <AccordionItem value="external-ids" className="border border-zinc-800 rounded-lg bg-zinc-900/50">
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <h3 className="text-lg font-semibold text-zinc-100">External IDs</h3>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 space-y-6">
            {/* MusicBrainz ID */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                MusicBrainz ID
              </label>
              <ExternalIdInput
                value={formState.musicbrainzId}
                onChange={(value) => updateField('musicbrainzId', value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                format="uuid"
                error={errors.musicbrainzId}
              />
            </div>

            {/* Spotify ID */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Spotify ID
              </label>
              <ExternalIdInput
                value={formState.spotifyId}
                onChange={(value) => updateField('spotifyId', value)}
                placeholder="22-character alphanumeric ID"
                format="base62"
                error={errors.spotifyId}
              />
            </div>

            {/* Discogs ID */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Discogs ID
              </label>
              <ExternalIdInput
                value={formState.discogsId}
                onChange={(value) => updateField('discogsId', value)}
                placeholder="Numeric ID"
                format="numeric"
                error={errors.discogsId}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Footer */}
      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
        <Button
          variant="outline"
          onClick={onCancel}
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        >
          Cancel
        </Button>
        <Button
          onClick={handlePreviewClick}
          disabled={!isDirty || errorCount > 0}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Preview Changes
        </Button>
      </div>
    </div>
  );
}
