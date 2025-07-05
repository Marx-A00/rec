// src/components/MusicPlatformTourProvider.tsx
'use client';

import React, { ReactNode, useEffect } from 'react';
import { NextStepProvider } from 'nextstepjs';
import { musicPlatformTours } from '@/lib/tours/musicPlatformTours';

interface MusicPlatformTourProviderProps {
  children: ReactNode;
}

export function MusicPlatformTourProvider({ children }: MusicPlatformTourProviderProps) {
  // Add keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle keyboard events when a tour is active
      const tourElement = document.querySelector('[data-nextstep-tour]');
      if (!tourElement) return;

      switch (event.key) {
        case 'Escape':
          // Close tour on Escape
          event.preventDefault();
          const closeButton = document.querySelector('[data-nextstep-close]');
          if (closeButton) {
            (closeButton as HTMLElement).click();
          }
          break;
        
        case 'Enter':
        case ' ':
          // Activate focused element (next/prev buttons)
          const focusedElement = document.activeElement;
          if (focusedElement && 
              (focusedElement.hasAttribute('data-nextstep-next') || 
               focusedElement.hasAttribute('data-nextstep-prev') ||
               focusedElement.hasAttribute('data-nextstep-close'))) {
            event.preventDefault();
            (focusedElement as HTMLElement).click();
          }
          break;
        
        case 'Tab':
          // Enhanced tab navigation within tour
          const tourButtons = tourElement.querySelectorAll('button, [role="button"]');
          if (tourButtons.length > 0) {
            // Ensure focus stays within tour elements
            const firstButton = tourButtons[0] as HTMLElement;
            const lastButton = tourButtons[tourButtons.length - 1] as HTMLElement;
            
            if (event.shiftKey && document.activeElement === firstButton) {
              event.preventDefault();
              lastButton.focus();
            } else if (!event.shiftKey && document.activeElement === lastButton) {
              event.preventDefault();
              firstButton.focus();
            }
          }
          break;
      }
    };

    // Add ARIA live region for screen reader announcements
    const createAriaLiveRegion = () => {
      if (!document.getElementById('tour-announcements')) {
        const ariaLive = document.createElement('div');
        ariaLive.id = 'tour-announcements';
        ariaLive.setAttribute('aria-live', 'polite');
        ariaLive.setAttribute('aria-atomic', 'true');
        ariaLive.className = 'sr-only absolute -left-[10000px] w-[1px] h-[1px] overflow-hidden';
        document.body.appendChild(ariaLive);
      }
    };

    // Initialize accessibility features
    createAriaLiveRegion();
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <NextStepProvider>
      {children}
    </NextStepProvider>
  );
}

// Enhanced hook with accessibility helpers
export function useMusicPlatformTours() {
  const announceToScreenReader = (message: string) => {
    const ariaLive = document.getElementById('tour-announcements');
    if (ariaLive) {
      ariaLive.textContent = message;
      // Clear after announcement
      setTimeout(() => {
        ariaLive.textContent = '';
      }, 1000);
    }
  };

  const startTour = (tourId: string) => {
    console.log(`Starting tour: ${tourId}`);
    announceToScreenReader(`Starting ${tourId} tour. Use Tab to navigate, Enter to continue, Escape to close.`);
  };

  return {
    tours: musicPlatformTours,
    startTour,
    announceToScreenReader
  };
} 