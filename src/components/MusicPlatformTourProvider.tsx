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
  const { startNextStep, isNextStepVisible, currentTour, currentStep } = useNextStep();
  const pathname = usePathname();

  useEffect(() => {
    console.log('🎯 TourStateManager mounted - ready for tours!');
  }, [startNextStep]);

  // Handle browse page tour step manually
  useEffect(() => {
    if (pathname === '/browse') {
      console.log('🔍 DEBUG: On browse page');
      
      // Check if we should auto-start the discovery tour
      const shouldStartDiscoveryTour = sessionStorage.getItem('start-discovery-tour');
      if (shouldStartDiscoveryTour) {
        console.log('🎯 Auto-starting discovery-page tour');
        sessionStorage.removeItem('start-discovery-tour');
        
        // Wait a bit for the page to render, then start the tour
        setTimeout(() => {
          startNextStep('discovery-page');
        }, 500);
        return;
      }
      
      // If we're currently on the welcome tour and on browse page, help NextStep find the element
      if (isNextStepVisible && currentTour === 'welcome-onboarding') {
        let attempts = 0;
        const maxAttempts = 50; // Increased from 30
        
        const checkElement = () => {
          attempts++;
          const element = document.querySelector('#browse-page-header');
          console.log(`🔍 Attempt ${attempts}: browse-page-header exists?`, !!element);
          
          if (element) {
            console.log('✅ Found browse-page-header element!', element);
            
            // Trigger NextStep to recognize the element by manually dispatching events
            const event = new CustomEvent('nextstep-element-found', {
              detail: { 
                selector: '#browse-page-header',
                element: element 
              }
            });
            window.dispatchEvent(event);
            
            // Also check if NextStep overlay is visible
            setTimeout(() => {
              const nextStepOverlay = document.querySelector('[data-name="nextstep-overlay"]');
              const nextStepCards = document.querySelectorAll('[data-nextstep]');
              console.log('🔍 NextStep overlay visible?', !!nextStepOverlay);
              console.log('🔍 NextStep cards found:', nextStepCards.length);
              
              // If still no overlay, try to force NextStep to update
              if (!nextStepOverlay) {
                console.log('🔧 Forcing NextStep update...');
                // Trigger a resize event to make NextStep recalculate
                window.dispatchEvent(new Event('resize'));
              }
            }, 100);
            
          } else if (attempts < maxAttempts) {
            setTimeout(checkElement, 100);
          } else {
            console.log('❌ Gave up looking for browse-page-header after 5 seconds');
            
            // Check if NextStep is working even without the element
            const nextStepOverlay = document.querySelector('[data-name="nextstep-overlay"]');
            console.log('🔍 NextStep overlay visible (without element)?', !!nextStepOverlay);
          }
        };
        
        // Start checking immediately and then every 100ms
        checkElement();
      }
    }
  }, [pathname, isNextStepVisible, currentTour, currentStep, startNextStep]);

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