'use client';

import { useEffect, useState } from 'react';
import MosaicContainer from '@/components/dashboard/MosaicContainer';
import MosaicControls from '@/components/dashboard/MosaicControls';
import WidgetLibrary from '@/components/dashboard/WidgetLibrary';
import { useHeader } from '@/contexts/HeaderContext';
import { useMosaic } from '@/contexts/MosaicContext';

// TODO: figure out why default layout half loads first on page load
export default function Home() {
  const { setRightContent } = useHeader();
  const { state: mosaicState, actions: mosaicActions } = useMosaic();
  const [isWidgetLibraryOpen, setIsWidgetLibraryOpen] = useState(false);

  useEffect(() => {
    // Set dashboard-specific header controls
    setRightContent(
      <MosaicControls
        isEditMode={mosaicState.isEditMode}
        onToggleEdit={mosaicActions.toggleEditMode}
        onAddTile={() => setIsWidgetLibraryOpen(true)}
        onSave={() => {
          // TODO: Implement save functionality
          console.log('Saving mosaic layout...');
        }}
      />
    );

    // Cleanup on unmount
    return () => setRightContent(null);
  }, [mosaicState.isEditMode, setRightContent, mosaicActions.toggleEditMode]);

  return (
    <>
      <MosaicContainer />
      <WidgetLibrary
        isOpen={isWidgetLibraryOpen}
        onClose={() => setIsWidgetLibraryOpen(false)}
      />
    </>
  );
}

// TODO: check out memory leak or whatever
// TODO: check out prisma query shits in terminal
