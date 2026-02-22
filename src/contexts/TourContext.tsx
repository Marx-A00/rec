'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { createPortal } from 'react-dom';
import { useSession } from 'next-auth/react';
import { driver, DriveStep } from 'driver.js';
import type { Driver } from 'driver.js';
import { X } from 'lucide-react';

import { driverConfig, tourSteps } from '@/lib/tours/driverConfig';
import { useTourStore } from '@/stores/useTourStore';
import { useUserSettingsStore } from '@/stores/useUserSettingsStore';
import { TourDebugControls } from '@/components/tour/TourDebugControls';
import {
  useGetMySettingsQuery,
  useUpdateUserSettingsMutation,
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
  const [showEarlyExitModal, setShowEarlyExitModal] = useState(false);
  const [isCompletingTour, setIsCompletingTour] = useState(false);
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
            // eslint-disable-next-line no-alert -- Tour warning message
            window.alert(
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
        onDestroyStarted: () => {
          console.log('🎉 Tour completed or closed! Calling mutation...');
          // Update local React state
          setCurrentStep(null);
          setIsTourActive(false);

          // Mark onboarding as completed via React Query mutation
          // Using .then/.catch since driver.js doesn't wait for async callbacks
          updateUserSettings({ showOnboardingTour: false })
            .then(() => {
              updateSettings({ showOnboardingTour: false });
              console.log('✅ Onboarding marked as completed in database');
            })
            .catch(error => {
              console.error('❌ Error marking onboarding complete:', error);
            });
        },
      });

      setDriverInstance(driverObj);
      driverObj.drive();
    }
  }, [updateUserSettings, updateSettings]);

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
                // eslint-disable-next-line no-alert -- Tour warning message
                window.alert(
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
            console.log('🎉 Tour stopped! Calling mutation...');
            setCurrentStep(null);
            setIsTourActive(false);

            // Mark onboarding as completed via React Query mutation
            // Using .then/.catch since driver.js doesn't wait for async callbacks
            updateUserSettings({ showOnboardingTour: false })
              .then(() => {
                updateSettings({ showOnboardingTour: false });
                console.log('✅ Onboarding marked as completed in database');
              })
              .catch(error => {
                console.error('❌ Error marking onboarding complete:', error);
              });
          },
        });

        setDriverInstance(driverObj);
        driverObj.drive(index);
      }
    },
    [driverInstance, updateUserSettings, updateSettings]
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

      // Disable pointer events on ALL vaul drawer elements so our modal is clickable
      const drawerElements = document.querySelectorAll(
        '[data-vaul-overlay], [data-vaul-drawer]'
      ) as NodeListOf<HTMLElement>;
      drawerElements.forEach(el => {
        el.dataset.tourPointerEvents = el.style.pointerEvents;
        el.style.pointerEvents = 'none';
      });

      setShowEarlyExitModal(true);
    };

    window.addEventListener('tour-early-exit', handleEarlyExit);
    return () => window.removeEventListener('tour-early-exit', handleEarlyExit);
  }, [driverInstance]);

  // Listen for tour completion event from driverConfig
  useEffect(() => {
    const handleTourCompleted = async () => {
      console.log('🎉 Tour completed event received! Calling mutation...');
      setIsCompletingTour(true);

      // Mark onboarding as completed via React Query mutation FIRST
      try {
        await updateUserSettings({ showOnboardingTour: false });
        updateSettings({ showOnboardingTour: false });
        console.log('✅ Onboarding marked as completed in database');
      } catch (error) {
        console.error('❌ Error marking onboarding complete:', error);
      }

      // THEN destroy the driver and update state
      if (driverInstance) {
        driverInstance.destroy();
      }
      setCurrentStep(null);
      setIsTourActive(false);
      setIsCompletingTour(false);
    };

    window.addEventListener('tour-completed', handleTourCompleted);
    return () =>
      window.removeEventListener('tour-completed', handleTourCompleted);
  }, [updateUserSettings, updateSettings, driverInstance]);

  // Handle early exit modal confirmation
  const handleConfirmExit = useCallback(async () => {
    setShowEarlyExitModal(false);

    // Restore pointer events on drawer elements
    const drawerElements = document.querySelectorAll(
      '[data-vaul-overlay], [data-vaul-drawer]'
    ) as NodeListOf<HTMLElement>;
    drawerElements.forEach(el => {
      el.style.pointerEvents = el.dataset.tourPointerEvents || '';
      delete el.dataset.tourPointerEvents;
    });

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

    // Restore pointer events on drawer elements
    const drawerElements = document.querySelectorAll(
      '[data-vaul-overlay], [data-vaul-drawer]'
    ) as NodeListOf<HTMLElement>;
    drawerElements.forEach(el => {
      el.style.pointerEvents = el.dataset.tourPointerEvents || '';
      delete el.dataset.tourPointerEvents;
    });
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

      {/* Tour Completing Loading Overlay */}
      {isCompletingTour &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 2000000000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem',
              }}
            >
              <div
                style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  border: '3px solid #3f3f46',
                  borderTopColor: '#22c55e',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <p style={{ color: '#d4d4d8', fontSize: '0.875rem' }}>
                Saving your progress...
              </p>
            </div>
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>,
          document.body
        )}

      {/* Early Exit Confirmation Modal - Using inline styles to guarantee override of driver.js */}
      {showEarlyExitModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 2000000000,
              pointerEvents: 'auto',
            }}
          >
            {/* Backdrop */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                pointerEvents: 'auto',
              }}
              onClick={handleCancelExit}
            />
            {/* Modal */}
            <div
              style={{
                position: 'fixed',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '100%',
                maxWidth: '28rem',
                backgroundColor: '#18181b',
                border: '2px solid #3f3f46',
                borderRadius: '0.75rem',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                padding: '1.5rem',
                pointerEvents: 'auto',
              }}
            >
              {/* Close button on the left, styled like tour cards */}
              <button
                onClick={handleCancelExit}
                style={{
                  position: 'absolute',
                  left: '1rem',
                  top: '1rem',
                  color: '#a1a1aa',
                  padding: '0.25rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                }}
              >
                <X className='h-4 w-4' />
                <span className='sr-only'>Close</span>
              </button>

              <div style={{ paddingTop: '1rem', textAlign: 'center' }}>
                <h2
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 'bold',
                    color: 'white',
                    marginBottom: '0.75rem',
                  }}
                >
                  Exit Tour?
                </h2>
                <div
                  style={{
                    color: '#d4d4d8',
                    fontSize: '0.875rem',
                    lineHeight: '1.625',
                  }}
                >
                  <p style={{ marginBottom: '0.75rem' }}>
                    No worries! You can restart the tour anytime from your
                    profile settings.
                  </p>
                  <p style={{ color: '#a1a1aa' }}>
                    Go to{' '}
                    <span style={{ color: 'white', fontWeight: 500 }}>
                      Profile
                    </span>{' '}
                    →{' '}
                    <span style={{ color: 'white', fontWeight: 500 }}>
                      Settings
                    </span>{' '}
                    →{' '}
                    <span style={{ color: 'white', fontWeight: 500 }}>
                      Restart Tour
                    </span>
                  </p>
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid #27272a',
                  marginTop: '1rem',
                }}
              >
                <button
                  onClick={handleCancelExit}
                  style={{
                    backgroundColor: '#3f3f46',
                    color: '#d4d4d8',
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    borderRadius: '0.5rem',
                    fontWeight: 500,
                    border: 'none',
                    cursor: 'pointer',
                    pointerEvents: 'auto',
                  }}
                >
                  Continue Tour
                </button>
                <button
                  onClick={handleConfirmExit}
                  style={{
                    backgroundColor: '#dc2626',
                    color: 'white',
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    borderRadius: '0.5rem',
                    fontWeight: 500,
                    border: 'none',
                    cursor: 'pointer',
                    pointerEvents: 'auto',
                  }}
                >
                  Exit &amp; Don&apos;t Show Tour Again
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
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
