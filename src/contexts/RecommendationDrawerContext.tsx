'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

import { Album } from '@/types/album';

interface RecommendationDrawerContextType {
  isOpen: boolean;
  prefilledAlbum: Album | null;
  openDrawer: (album?: Album) => void;
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

  const openDrawer = (album?: Album) => {
    setPrefilledAlbum(album || null);
    setIsOpen(true);
  };

  const closeDrawer = () => {
    setIsOpen(false);
    // Clear prefilled album when closing
    setPrefilledAlbum(null);
  };

  const handleSuccess = () => {
    // Close drawer on successful recommendation creation
    setIsOpen(false);
    setPrefilledAlbum(null);
  };

  return (
    <RecommendationDrawerContext.Provider
      value={{
        isOpen,
        prefilledAlbum,
        openDrawer,
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
