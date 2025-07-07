// src/components/MusicPlatformTourProvider.tsx
'use client';

import React, { ReactNode, useEffect, useCallback } from 'react';
import { NextStepProvider, NextStep, useNextStep } from 'nextstepjs';
import { useRouter, usePathname } from 'next/navigation';
import { musicPlatformTours } from '@/lib/tours/musicPlatformTours';
import { CustomTourCard } from '@/components/CustomTourCard';

interface MusicPlatformTourProviderProps {
  children: ReactNode;
}

// Next.js Navigation Adapter for NextStep
function useNextJSNavigationAdapter() {
  const router = useRouter();
  const pathname = usePathname();

  const push = useCallback((path: string) => {
    console.log('🚀 NextStep Navigation: Pushing to', path);
    router.push(path);
  }, [router]);

  const getCurrentPath = useCallback(() => {
    console.log('🚀 NextStep Navigation: Current path is', pathname);
    return pathname;
  }, [pathname]);

  return { push, getCurrentPath };
}

// Tour State Manager Component  
function TourStateManager() {
  const { startNextStep } = useNextStep();
  const pathname = usePathname();

  useEffect(() => {
    console.log('🎯 TourStateManager mounted - ready for tours!');
  }, [startNextStep]);

  // Debug when we're on browse page
  useEffect(() => {
    if (pathname === '/browse') {
      console.log('🔍 DEBUG: On browse page');
      
      // Check for element every 100ms for 3 seconds
      let attempts = 0;
      const maxAttempts = 30;
      
      const checkElement = () => {
        attempts++;
        const element = document.querySelector('#browse-page-header');
        console.log(`🔍 Attempt ${attempts}: browse-page-header exists?`, !!element);
        
                 if (element) {
           console.log('✅ Found browse-page-header element!', element);
           
           // Also check if NextStep overlay is visible
           const nextStepOverlay = document.querySelector('[data-name="nextstep-overlay"]');
           const nextStepCards = document.querySelectorAll('[data-nextstep]');
           console.log('🔍 NextStep overlay visible?', !!nextStepOverlay);
           console.log('🔍 NextStep cards found:', nextStepCards.length);
         } else if (attempts < maxAttempts) {
           setTimeout(checkElement, 100);
         } else {
           console.log('❌ Gave up looking for browse-page-header after 3 seconds');
           
           // Check if NextStep is working even without the element
           const nextStepOverlay = document.querySelector('[data-name="nextstep-overlay"]');
           console.log('🔍 NextStep overlay visible (without element)?', !!nextStepOverlay);
         }
      };
      
      setTimeout(checkElement, 100);
    }
  }, [pathname]);

  return null;
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
  const navigationAdapter = useNextJSNavigationAdapter();

  return (
    <NextStepProvider>
      {/* Configure NextStep with our tours, custom card component, and Next.js navigation adapter */}
      <NextStep 
        steps={musicPlatformTours}
        cardComponent={CustomTourCard}
        navigationAdapter={() => navigationAdapter}
      >
        <TourStateManager />
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