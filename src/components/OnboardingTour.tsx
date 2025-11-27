'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { createOnboardingDriver } from '@/lib/tours/driverConfig';

/**
 * OnboardingTour Component
 *
 * Auto-starts tour for new users (profileUpdatedAt === null)
 * Provides manual trigger via window.startTour()
 *
 * This component doesn't render anything - it just manages tour state.
 */
export function OnboardingTour() {
  const { data: session, status } = useSession();
  const [hasChecked, setHasChecked] = useState(false);

  // Auto-start tour for new users
  useEffect(() => {
    // Only run once on mount when authenticated
    if (status !== 'authenticated' || hasChecked || !session?.user?.id) {
      return;
    }

    const checkAndStartTour = async () => {
      try {
        console.log('🔍 Checking if user needs onboarding tour...');

        // Check if user is new
        const response = await fetch('/api/users/onboarding-status');
        const data = await response.json();

        if (response.ok && data.isNewUser) {
          console.log('🎯 New user detected! Starting onboarding tour in 1 second...');

          // Mark as started (so they won't see it again on refresh)
          await fetch('/api/users/onboarding-status', { method: 'POST' });

          // Wait a moment for page to be fully ready, then start tour
          setTimeout(() => {
            console.log('🚀 Starting onboarding tour...');
            const driverObj = createOnboardingDriver();
            driverObj.drive();
          }, 1000);
        } else {
          console.log('ℹ️ Returning user, no tour needed');
        }
      } catch (error) {
        console.error('❌ Error checking onboarding status:', error);
      } finally {
        setHasChecked(true);
      }
    };

    checkAndStartTour();
  }, [session, status, hasChecked]);

  // Add global debug function for manual testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Main tour start command
      (window as any).startTour = () => {
        console.log('🎯 Manually starting tour...');
        const driverObj = createOnboardingDriver();
        driverObj.drive();
      };

      // Debug utilities
      (window as any).debugTour = {
        start: () => {
          console.log('🎯 Starting tour via debug...');
          const driverObj = createOnboardingDriver();
          driverObj.drive();
        },

        reset: async () => {
          console.log('🗑️ Resetting tour state...');
          localStorage.removeItem('tour-completed');
          console.log('✅ Tour state cleared from localStorage');

          try {
            const response = await fetch('/api/users/onboarding-status/reset', {
              method: 'POST',
            });
            const data = await response.json();

            if (response.ok) {
              console.log('✅ Onboarding status reset in database');
              console.log('🔄 Refresh the page to trigger auto-start tour');
              return data;
            } else {
              console.error('❌ Failed to reset onboarding:', data);
              return data;
            }
          } catch (error) {
            console.error('❌ Error resetting onboarding:', error);
            throw error;
          }
        },

        checkStatus: async () => {
          try {
            const response = await fetch('/api/users/onboarding-status');
            const data = await response.json();
            console.log('📊 Onboarding Status:', data);
            return data;
          } catch (error) {
            console.error('❌ Error checking status:', error);
            throw error;
          }
        }
      };

      console.log('💡 Tour debug commands available:');
      console.log('  - window.startTour() - Start tour manually');
      console.log('  - window.debugTour.reset() - Reset onboarding status');
      console.log('  - window.debugTour.checkStatus() - Check current status');
    }
  }, []);

  return null; // This component doesn't render anything
}
