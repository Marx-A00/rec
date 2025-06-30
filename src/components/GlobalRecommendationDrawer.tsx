'use client';

import RecommendationDrawer from '@/components/recommendations/RecommendationDrawer';
import { useRecommendationDrawerContext } from '@/contexts/RecommendationDrawerContext';

export default function GlobalRecommendationDrawer() {
  const { isOpen, prefilledAlbum, closeDrawer, handleSuccess } = useRecommendationDrawerContext();

  return (
    <RecommendationDrawer
      isOpen={isOpen}
      onClose={closeDrawer}
      onSuccess={handleSuccess}
      prefilledAlbum={prefilledAlbum}
    />
  );
} 