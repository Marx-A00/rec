'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { useSession } from 'next-auth/react';
import { driver, DriveStep } from 'driver.js';
import type { Driver } from 'driver.js';

import { driverConfig, tourSteps } from '@/lib/tours/driverConfig';
import { useTourStore } from '@/stores/useTourStore';
import { TourDebugControls } from '@/components/tour/TourDebugControls';
import { graphqlRequest } from '@/lib/graphql-client';
import {
  GetMySettingsDocument,
  UpdateUserSettingsDocument,
} from '@/generated/graphql';

interface TourContextType {
  startTour: () => void;
  stopTour: () => void;
  resetOnboarding: () => Promise<void>;
  startFromStep: (stepIndex: number) => void;
  currentStep: number | null;
  isTourActive: boolean;
  driverInstance: Driver | null;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [driverInstance, setDriverInstance] = useState<Driver | null>(null);
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [isTourActive, setIsTourActive] = useState(false);
  const hasCheckedOnboarding = useRef(false);

  const startTour = useCallback(() => {
    console.log('🎬 Starting onboarding tour...');

    // Check viewport size - tour works better on desktop
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      console.warn('⚠️ Tour is optimized for desktop view (768px+ width)');
      console.log(
        '💡 Tour will still work on mobile, but some elements may be positioned differently'
      );
    }

    // Give elements time to mount and become visible
    setTimeout(() => {
      // Verify critical elements exist
      const step2Element = document.querySelector(
        '[data-tour-step="create-recommendation"]'
      );

      if (!step2Element) {
        console.error('❌ Tour elements not ready. Retrying in 500ms...');
        // Retry once after a short delay
        setTimeout(() => {
          const retryElement = document.querySelector(
            '[data-tour-step="create-recommendation"]'
          );
          if (!retryElement) {
            console.error(
              '❌ Unable to find tour elements. Make sure the page has fully loaded.'
            );
            alert(
              '⚠️ Tour elements not found. Please refresh the page and try again.'
            );
            return;
          }
          // Element found on retry, start tour
          initializeDriver();
        }, 500);
        return;
      }

      // Elements found, start tour immediately
      console.log('✅ Tour elements ready');
      initializeDriver();
    }, 100);

    function initializeDriver() {
      const driverObj = driver({
        ...driverConfig,
        steps: tourSteps,
        onHighlightStarted: (element, step, options) => {
          // Call the original callback from driverConfig first (for step-specific logic)
          if (driverConfig.onHighlightStarted) {
            driverConfig.onHighlightStarted(element, step, options);
          }

          // Then update TourContext state
          const stepIndex = options.state.activeIndex ?? 0;
          setCurrentStep(stepIndex);
          setIsTourActive(true);
          console.log(`📍 Tour step ${stepIndex + 1}/${tourSteps.length}`);
        },
        onDestroyStarted: (element, step, options) => {
          // Call the original callback from driverConfig (handles completion tracking)
          if (driverConfig.onDestroyStarted) {
            driverConfig.onDestroyStarted(element, step, options);
          }
          // Update local React state
          setCurrentStep(null);
          setIsTourActive(false);
        },
      });

      setDriverInstance(driverObj);
      driverObj.drive();
    }
  }, []);

  const stopTour = useCallback(() => {
    console.log('⏹️ Stopping tour...');
    if (driverInstance) {
      driverInstance.destroy();
    }
    setCurrentStep(null);
    setIsTourActive(false);
  }, [driverInstance]);

  const resetOnboarding = useCallback(async () => {
    console.log('🔄 Resetting onboarding status...');
    try {
      await graphqlRequest(UpdateUserSettingsDocument, {
        showOnboardingTour: true,
      });

      // Reset tour state in Zustand store (clears isCompleted and resumeStep)
      useTourStore.getState().reset();
      console.log('✅ Onboarding reset complete. Refresh to trigger tour.');

      // Optionally start tour immediately
      setTimeout(() => {
        startTour();
      }, 500);
    } catch (error) {
      console.error('❌ Error resetting onboarding:', error);
    }
  }, [startTour]);

  const startFromStep = useCallback(
    (stepIndex: number) => {
      console.log(`🎯 Jumping to step ${stepIndex + 1}...`);

      // Validate step index
      if (stepIndex < 0 || stepIndex >= tourSteps.length) {
        console.error(
          `❌ Invalid step index: ${stepIndex}. Valid range: 0-${tourSteps.length - 1}`
        );
        return;
      }

      // Stop existing tour if active
      if (driverInstance) {
        driverInstance.destroy();
      }

      // Give elements time to mount
      setTimeout(() => {
        // For step 2 (create recommendation button), verify it exists
        if (stepIndex === 1) {
          const step2Element = document.querySelector(
            '[data-tour-step="create-recommendation"]'
          );
          if (!step2Element) {
            console.error('❌ Step 2 element not found. Retrying in 500ms...');
            setTimeout(() => {
              const retryElement = document.querySelector(
                '[data-tour-step="create-recommendation"]'
              );
              if (!retryElement) {
                console.error('❌ Unable to find step 2 element.');
                alert(
                  '⚠️ Step 2 element not found. Make sure you are on the main page.'
                );
                return;
              }
              initializeDriverFromStep(stepIndex);
            }, 500);
            return;
          }
        }

        initializeDriverFromStep(stepIndex);
      }, 100);

      function initializeDriverFromStep(index: number) {
        const driverObj = driver({
          ...driverConfig,
          steps: tourSteps,
          onHighlightStarted: (element, step, options) => {
            // Call the original callback from driverConfig first (for step-specific logic)
            if (driverConfig.onHighlightStarted) {
              driverConfig.onHighlightStarted(element, step, options);
            }

            // Then update TourContext state
            const stepIdx = options.state.activeIndex ?? 0;
            setCurrentStep(stepIdx);
            setIsTourActive(true);
            console.log(`📍 Tour step ${stepIdx + 1}/${tourSteps.length}`);
          },
          onDestroyStarted: () => {
            console.log('🎉 Tour stopped!');
            setCurrentStep(null);
            setIsTourActive(false);
          },
        });

        setDriverInstance(driverObj);
        driverObj.drive(index);
      }
    },
    [driverInstance]
  );

  // Auto-start tour for new users
  useEffect(() => {
    if (status === 'loading') return;

    const user = session?.user;
    if (!user) return;

    // Check if tour needs to resume from a specific step after navigation
    const resumeStep = useTourStore.getState().resumeStep;
    if (resumeStep !== null) {
      console.log(`🔄 Resuming tour from step ${resumeStep + 1}...`);
      useTourStore.getState().setResumeStep(null); // Clear the resume flag
      // Delay to ensure all components are mounted and animations complete
      setTimeout(() => {
        startFromStep(resumeStep);
      }, 500);
      return;
    }

    // Only auto-start tour on the home page where tour elements exist
    // This prevents the tour from trying to start on admin, settings, or other pages
    const currentPath = window.location.pathname;
    if (currentPath !== '/') {
      return;
    }

    // Prevent multiple checks - only check once per session
    if (hasCheckedOnboarding.current) return;

    // Check if tour is already completed in local store (prevents re-fetch)
    const tourCompleted = useTourStore.getState().isCompleted;
    if (tourCompleted) return;

    // Mark as checked before making the API call
    hasCheckedOnboarding.current = true;

    // Fetch showOnboardingTour from user settings via GraphQL
    const checkOnboardingStatus = async () => {
      try {
        const data = await graphqlRequest<{
          mySettings: { showOnboardingTour: boolean } | null;
        }>(GetMySettingsDocument);

        if (data.mySettings?.showOnboardingTour) {
          console.log('👋 New user detected! Starting onboarding tour...');
          // Delay to ensure all components are mounted and animations complete
          setTimeout(() => {
            startTour();
          }, 1500);
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      }
    };

    checkOnboardingStatus();
  }, [session, status, startTour, startFromStep]);

  // Expose debug commands to window
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as unknown as { debugTour: unknown }).debugTour = {
        start: startTour,
        stop: stopTour,
        reset: resetOnboarding,
        jumpToStep: startFromStep,
        getStep: () => currentStep,
        isActive: () => isTourActive,
      };
    }
  }, [
    startTour,
    stopTour,
    resetOnboarding,
    startFromStep,
    currentStep,
    isTourActive,
  ]);

  const value: TourContextType = {
    startTour,
    stopTour,
    resetOnboarding,
    startFromStep,
    currentStep,
    isTourActive,
    driverInstance,
  };

  return (
    <TourContext.Provider value={value}>
      {children}
      <TourDebugControls />
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}

// Alias for convenience
export const useTourContext = useTour;
