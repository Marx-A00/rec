// src/components/MusicPlatformTourProvider.tsx
'use client';

import React, { ReactNode } from 'react';
import { NextStepProvider, NextStep } from 'nextstepjs';
import { musicPlatformTours } from '@/lib/tours/musicPlatformTours';
import { CustomTourCard } from '@/components/CustomTourCard';

interface MusicPlatformTourProviderProps {
  children: ReactNode;
}

/**
 * Tour Provider Component
 * 
 * This component sets up NextStep.js for the entire app.
 * It provides the tour functionality to all child components.
 * 
 * Usage:
 * - Already integrated in app/layout.tsx
 * - Use useNextStep() hook in components to start tours
 * - Call startNextStep('tour-id') to begin a tour
 * 
 * Tours are defined in: src/lib/tours/musicPlatformTours.ts
 * Custom card styling in: src/components/CustomTourCard.tsx
 */
export function MusicPlatformTourProvider({ children }: MusicPlatformTourProviderProps) {
  return (
    <NextStepProvider>
      {/* Configure NextStep with our tours and custom card component */}
      <NextStep 
        steps={musicPlatformTours}
        cardComponent={CustomTourCard}
      >
        {children}
      </NextStep>
    </NextStepProvider>
  );
}

/**
 * Hook for accessing tours (optional utility)
 * 
 * Returns:
 * - tours: Array of all available tours
 * - startTour: Function to start a tour (just logs for now)
 */
export function useMusicPlatformTours() {
  return {
    tours: musicPlatformTours,
    startTour: (tourId: string) => {
      console.log(`Starting tour: ${tourId}`);
    }
  };
} 