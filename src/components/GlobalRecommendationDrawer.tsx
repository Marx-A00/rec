'use client';

import { useEffect } from 'react';

import RecommendationDrawer from '@/components/recommendations/RecommendationDrawer';
import { useRecommendationDrawerContext } from '@/contexts/RecommendationDrawerContext';

export default function GlobalRecommendationDrawer() {
  const {
    isOpen,
    prefilledAlbum,
    closeDrawer,
    handleSuccess,
    openDrawer,
    openDrawerForTour,
  } = useRecommendationDrawerContext();

  // Listen for tour events to open the drawer
  useEffect(() => {
    const handleOpenDrawer = () => {
      openDrawerForTour();
    };

    const handleCloseDrawer = () => {
      closeDrawer();
    };

    // Add event listeners for tour integration
    window.addEventListener('open-recommendation-drawer', handleOpenDrawer);
    window.addEventListener('close-recommendation-drawer', handleCloseDrawer);

    return () => {
      window.removeEventListener(
        'open-recommendation-drawer',
        handleOpenDrawer
      );
      window.removeEventListener(
        'close-recommendation-drawer',
        handleCloseDrawer
      );
    };
  }, [openDrawerForTour, closeDrawer]);

  return (
    <RecommendationDrawer
      isOpen={isOpen}
      onClose={closeDrawer}
      onSuccess={handleSuccess}
      prefilledAlbum={prefilledAlbum}
    />
  );
}
