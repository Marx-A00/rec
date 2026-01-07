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
import { useUserSettingsStore } from '@/stores/useUserSettingsStore';
import { TourDebugControls } from '@/components/tour/TourDebugControls';
import {
  useGetMySettingsQuery,
  useUpdateUserSettingsMutation,
} from '@/generated/graphql';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogPortal,
  DialogOverlay,
  DialogClose,
} from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

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
  const [showEarlyExitModal, setShowEarlyExitModal] = useState(false);
  const [shouldCheckOnboarding, setShouldCheckOnboarding] = useState(false);

  // Zustand store for user settings
  const { setSettings, updateSettings } = useUserSettingsStore();

  const { mutateAsync: updateUserSettings } = useUpdateUserSettingsMutation();

  // Query user settings to check if tour should auto-start
  const { data: settingsData } = useGetMySettingsQuery(undefined, {
    enabled: shouldCheckOnboarding,
  });

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
    console.log('🔄 Manually restarting tour...');
    // No need to update DB - the flag only controls auto-start for new users
    // If they're manually restarting, they're explicitly choosing to see it
    setTimeout(() => {
      startTour();
    }, 500);
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

    // Only auto-start tour on pages where tour elements exist
    // This prevents the tour from trying to start on admin, settings, or other pages
    const currentPath = window.location.pathname;
    const tourEnabledPaths = ['/', '/home-mosaic'];
    console.log('🔍 Tour check - currentPath:', currentPath);
    if (!tourEnabledPaths.includes(currentPath)) {
      console.log('🔍 Tour check - not on tour-enabled page, skipping');
      return;
    }

    // Enable the settings query to check onboarding status
    if (!shouldCheckOnboarding) {
      setShouldCheckOnboarding(true);
    }
  }, [session, status, startFromStep, shouldCheckOnboarding]);

  // React to settings data to start tour if needed
  useEffect(() => {
    if (!settingsData?.mySettings) return;

    // Sync settings to Zustand store
    setSettings(settingsData.mySettings as Parameters<typeof setSettings>[0]);

    console.log('🔍 Tour check - mySettings:', settingsData.mySettings);
    console.log(
      '🔍 Tour check - showOnboardingTour:',
      settingsData.mySettings.showOnboardingTour
    );

    if (settingsData.mySettings.showOnboardingTour) {
      console.log('👋 New user detected! Starting onboarding tour...');
      // Delay to ensure all components are mounted and animations complete
      setTimeout(() => {
        startTour();
      }, 1500);
    } else {
      console.log('🔍 Tour check - tour already completed');
    }
  }, [settingsData, startTour, setSettings]);

  // Listen for early exit event from driverConfig
  useEffect(() => {
    const handleEarlyExit = () => {
      console.log('🔔 Early exit event received');

      // Check Zustand store for current showOnboardingTour value
      // If it's false, user manually restarted the tour - no need for confirmation
      const currentSettings = useUserSettingsStore.getState().settings;
      const showOnboardingTour = currentSettings?.showOnboardingTour ?? true;
      console.log('🔍 showOnboardingTour from store:', showOnboardingTour);

      // If showOnboardingTour is false, tour was manually restarted
      // No need to show confirmation - just close the tour
      if (!showOnboardingTour) {
        console.log(
          '🔄 Tour was manually restarted (showOnboardingTour=false) - skipping exit confirmation'
        );
        if (driverInstance) {
          driverInstance.destroy();
        }
        setCurrentStep(null);
        setIsTourActive(false);
        return;
      }

      // Hide the driver.js popover while showing our modal
      const popover = document.querySelector('.driver-popover') as HTMLElement;
      const overlay = document.querySelector('.driver-overlay') as HTMLElement;
      if (popover) popover.style.display = 'none';
      if (overlay) overlay.style.display = 'none';
      setShowEarlyExitModal(true);
    };

    window.addEventListener('tour-early-exit', handleEarlyExit);
    return () => window.removeEventListener('tour-early-exit', handleEarlyExit);
  }, [driverInstance]);

  // Handle early exit modal confirmation
  const handleConfirmExit = useCallback(async () => {
    setShowEarlyExitModal(false);

    // Mark onboarding as completed via React Query mutation and Zustand store
    try {
      await updateUserSettings({ showOnboardingTour: false });
      updateSettings({ showOnboardingTour: false });
      console.log('✅ Onboarding marked as completed (early exit)');
    } catch (error) {
      console.error('❌ Error marking onboarding complete:', error);
    }

    if (driverInstance) {
      driverInstance.destroy();
    }
    setCurrentStep(null);
    setIsTourActive(false);
  }, [driverInstance, updateUserSettings, updateSettings]);

  // Handle cancel exit (resume tour)
  const handleCancelExit = useCallback(() => {
    setShowEarlyExitModal(false);
    // Show the driver.js popover again
    const popover = document.querySelector('.driver-popover') as HTMLElement;
    const overlay = document.querySelector('.driver-overlay') as HTMLElement;
    if (popover) popover.style.display = '';
    if (overlay) overlay.style.display = '';
  }, []);

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

      {/* Early Exit Confirmation Modal - Styled to match driver.js tour cards */}
      <Dialog open={showEarlyExitModal} onOpenChange={setShowEarlyExitModal}>
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Content className='fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] bg-zinc-900 border-2 border-zinc-700 rounded-xl shadow-2xl p-6 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'>
            {/* Close button on the left, styled like tour cards */}
            <DialogClose className='absolute left-4 top-4 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md p-1 transition-colors'>
              <X className='h-4 w-4' />
              <span className='sr-only'>Close</span>
            </DialogClose>

            <DialogHeader className='pt-4 text-center'>
              <DialogTitle className='text-xl font-bold text-white mb-3 text-center'>
                Exit Tour?
              </DialogTitle>
              <DialogDescription asChild>
                <div className='text-zinc-300 text-sm leading-relaxed space-y-3 text-center'>
                  <p>
                    No worries! You can restart the tour anytime from your
                    profile settings.
                  </p>
                  <p className='text-zinc-400'>
                    Go to{' '}
                    <span className='text-white font-medium'>Profile</span> →{' '}
                    <span className='text-white font-medium'>Settings</span> →{' '}
                    <span className='text-white font-medium'>Restart Tour</span>
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className='flex flex-row items-center justify-center gap-3 pt-4 border-t border-zinc-800 mt-4 sm:justify-center'>
              <Button
                variant='ghost'
                onClick={handleCancelExit}
                className='bg-zinc-700 hover:bg-zinc-600 text-zinc-300 px-4 py-2 text-sm rounded-lg font-medium'
              >
                Continue Tour
              </Button>
              <Button
                variant='destructive'
                onClick={handleConfirmExit}
                className='px-4 py-2 text-sm rounded-lg font-medium shadow-lg'
              >
                Exit & Don't Show Tour Again
              </Button>
            </DialogFooter>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
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
