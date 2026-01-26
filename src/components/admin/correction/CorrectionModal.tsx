'use client';

import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCorrectionModalState } from '@/hooks/useCorrectionModalState';
import { useGetAlbumDetailsAdminQuery, DataQuality } from '@/generated/graphql';
import { StepIndicator } from './StepIndicator';
import {
  CurrentDataView,
  type CurrentDataViewAlbum,
  type AlbumArtist,
} from './CurrentDataView';
import { SearchView } from './search';

export interface CorrectionModalProps {
  /** Album ID to load and correct */
  albumId: string | null;
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal should close */
  onClose: () => void;
}

/**
 * Modal shell for the 3-step album correction wizard.
 *
 * Steps:
 * 0. Current Data - Shows existing album data
 * 1. Search - Search for correct MusicBrainz match
 * 2. Apply - Preview and apply corrections (placeholder)
 *
 * The modal fetches album details internally using the albumId.
 * State is persisted per album in sessionStorage, allowing users to
 * navigate away and return to the same step.
 */
export function CorrectionModal({
  albumId,
  open,
  onClose,
}: CorrectionModalProps) {
  const modalState = useCorrectionModalState(albumId);
  const {
    currentStep,
    setCurrentStep,
    nextStep,
    prevStep,
    clearState,
    isFirstStep,
    isLastStep,
  } = modalState;

  // Fetch album details when modal is open and albumId is provided
  const { data, isLoading, error } = useGetAlbumDetailsAdminQuery(
    { id: albumId! },
    { enabled: open && !!albumId }
  );

  const albumData = data?.album;

  // Transform fetched data to CurrentDataViewAlbum format
  const album: CurrentDataViewAlbum | null = albumData
    ? {
        id: albumData.id,
        title: albumData.title,
        // Convert Date to ISO string if needed
        releaseDate: albumData.releaseDate
          ? typeof albumData.releaseDate === 'string'
            ? albumData.releaseDate
            : (albumData.releaseDate as Date).toISOString()
          : null,
        releaseType: albumData.releaseType ?? null,
        coverArtUrl: albumData.coverArtUrl ?? null,
        cloudflareImageId: albumData.cloudflareImageId ?? null,
        musicbrainzId: albumData.musicbrainzId ?? null,
        spotifyId: null, // Not exposed in GraphQL schema
        discogsId: null, // Not exposed in GraphQL schema
        dataQuality: (albumData.dataQuality as DataQuality) ?? null,
        label: albumData.label ?? null,
        barcode: albumData.barcode ?? null,
        tracks: (albumData.tracks ?? []).map(track => ({
          id: track.id,
          title: track.title,
          trackNumber: track.trackNumber,
          discNumber: track.discNumber,
          durationMs: track.durationMs ?? null,
          isrc: track.isrc ?? null,
        })),
        artists: (albumData.artists ?? []).map(
          (ac, index): AlbumArtist => ({
            artist: {
              id: ac.artist.id,
              name: ac.artist.name,
            },
            role: ac.role ?? 'primary',
            position: ac.position ?? index,
          })
        ),
      }
    : null;

  const handleClose = () => {
    clearState();
    onClose();
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      handleClose();
    }
  };

  // Handle result selection from SearchView
  const handleResultSelect = (result: { releaseGroupMbid: string }) => {
    // Store selected result MBID for preview step
    modalState.setSelectedResult(result.releaseGroupMbid);
    // Navigate to preview step
    nextStep();
  };

  // Handle manual edit request (no good results)
  const handleManualEdit = () => {
    // Navigate to manual edit (step 3 in future, for now just log)
    console.log('Manual edit requested - Phase 10');
  };

  // Get primary artist name for header
  const primaryArtist = album?.artists.find(
    ac => ac.role === 'primary' || ac.position === 0
  );
  const primaryArtistName = primaryArtist?.artist.name ?? 'Unknown Artist';
  const headerTitle = album
    ? 'Fixing: ' + album.title + ' by ' + primaryArtistName
    : 'Fixing: Album Data';

  const hasError = !!error;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='sm:!max-w-[1100px] max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800 [&>button]:text-zinc-500 [&>button]:hover:text-zinc-300'>
        <DialogHeader>
          <DialogTitle className='truncate pr-8 text-cosmic-latte'>
            {headerTitle}
          </DialogTitle>
        </DialogHeader>

        <StepIndicator currentStep={currentStep} onStepClick={setCurrentStep} />

        {/* Step content area */}
        <div className='min-h-[300px] py-4'>
          {/* Loading state */}
          {isLoading && (
            <div className='flex flex-col items-center justify-center h-[300px]'>
              <Loader2 className='h-8 w-8 animate-spin text-muted-foreground mb-4' />
              <p className='text-muted-foreground'>Loading album data...</p>
            </div>
          )}

          {/* Error state */}
          {hasError && !isLoading && (
            <div className='flex items-center justify-center h-[300px] border border-dashed border-destructive/30 rounded-lg'>
              <p className='text-destructive'>Failed to load album data</p>
            </div>
          )}

          {/* Step 0: Current Data */}
          {currentStep === 0 && !isLoading && !hasError && album && (
            <CurrentDataView album={album} />
          )}
          {currentStep === 0 && !isLoading && !hasError && !album && (
            <div className='flex items-center justify-center h-[300px] border border-dashed border-muted-foreground/30 rounded-lg'>
              <p className='text-muted-foreground'>No album data available</p>
            </div>
          )}

          {/* Step 1: Search */}
          {currentStep === 1 && !isLoading && !hasError && album && (
            <SearchView
              album={album}
              onResultSelect={handleResultSelect}
              onManualEdit={handleManualEdit}
              modalState={modalState}
            />
          )}
          {currentStep === 1 && isLoading && (
            <div className='flex items-center justify-center h-[300px]'>
              <Loader2 className='h-6 w-6 animate-spin text-zinc-400' />
            </div>
          )}
          {currentStep === 1 && hasError && !isLoading && (
            <div className='p-4 text-center text-red-400'>
              Failed to load album data. Please try again.
            </div>
          )}

          {/* Step 2: Apply */}
          {currentStep === 2 && !isLoading && (
            <div className='flex items-center justify-center h-[300px] border border-dashed border-muted-foreground/30 rounded-lg'>
              <p className='text-muted-foreground'>Apply content here</p>
            </div>
          )}
        </div>

        <DialogFooter className='sticky bottom-0 bg-zinc-900 pt-4 border-t border-zinc-800'>
          <div className='flex w-full justify-between'>
            <Button variant='outline' onClick={handleClose}>
              Cancel
            </Button>
            <div className='flex gap-2'>
              {!isFirstStep && (
                <Button variant='outline' onClick={prevStep}>
                  Back
                </Button>
              )}
              {!isLastStep && (
                <Button variant='primary' onClick={nextStep}>
                  Next
                </Button>
              )}
              {isLastStep && (
                <Button variant='primary' disabled>
                  Apply
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
