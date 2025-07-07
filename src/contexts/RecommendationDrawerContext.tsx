'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

import { Album } from '@/types/album';

interface RecommendationDrawerContextType {
  isOpen: boolean;
  prefilledAlbum: Album | null;
  isTourMode: boolean;
  openDrawer: (album?: Album) => void;
  openDrawerForTour: (album?: Album) => void;
  closeDrawer: () => void;
  handleSuccess: () => void;
}

const RecommendationDrawerContext = createContext<
  RecommendationDrawerContextType | undefined
>(undefined);

export function RecommendationDrawerProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [prefilledAlbum, setPrefilledAlbum] = useState<Album | null>(null);
  const [isTourMode, setIsTourMode] = useState(false);

  const openDrawer = (album?: Album) => {
    setPrefilledAlbum(album || null);
    setIsTourMode(false);
    setIsOpen(true);
  };

  const openDrawerForTour = (album?: Album) => {
    setPrefilledAlbum(album || null);
    setIsTourMode(true);
    setIsOpen(true);
  };

  const closeDrawer = () => {
    setIsOpen(false);
    setIsTourMode(false);
    // Clear prefilled album when closing
    setPrefilledAlbum(null);
  };

  const handleSuccess = () => {
    // Close drawer on successful recommendation creation
    setIsOpen(false);
    setIsTourMode(false);
    setPrefilledAlbum(null);
  };

  return (
    <RecommendationDrawerContext.Provider
      value={{
        isOpen,
        prefilledAlbum,
        isTourMode,
        openDrawer,
        openDrawerForTour,
        closeDrawer,
        handleSuccess,
      }}
    >
      {children}
    </RecommendationDrawerContext.Provider>
  );
}

export function useRecommendationDrawerContext() {
  const context = useContext(RecommendationDrawerContext);
  if (context === undefined) {
    throw new Error(
      'useRecommendationDrawerContext must be used within a RecommendationDrawerProvider'
    );
  }
  return context;
}
