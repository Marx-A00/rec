'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';

import { useUserSettingsStore } from '@/stores/useUserSettingsStore';
import {
  useGetMySettingsQuery,
  useUpdateUserSettingsMutation,
} from '@/generated/graphql';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface TourContextType {
  isTourActive: boolean;
  showWelcomeModal: boolean;
  dismissWelcomeModal: () => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [shouldCheckOnboarding, setShouldCheckOnboarding] = useState(false);

  const { setSettings, updateSettings } = useUserSettingsStore();
  const { mutateAsync: updateUserSettings } = useUpdateUserSettingsMutation();

  const { data: settingsData } = useGetMySettingsQuery(undefined, {
    enabled: shouldCheckOnboarding,
  });

  // Check if user needs onboarding
  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user) return;

    const welcomeEnabledPaths = ['/', '/home-mosaic'];
    if (!pathname || !welcomeEnabledPaths.includes(pathname)) return;

    if (!shouldCheckOnboarding) {
      setShouldCheckOnboarding(true);
    }
  }, [session, status, shouldCheckOnboarding, pathname]);

  // Show welcome modal if user hasn't been onboarded
  useEffect(() => {
    if (!settingsData?.mySettings) return;

    setSettings(settingsData.mySettings as Parameters<typeof setSettings>[0]);

    if (settingsData.mySettings.showOnboardingTour) {
      setShowWelcomeModal(true);
    }
  }, [settingsData, setSettings]);

  const dismissWelcomeModal = useCallback(async () => {
    setShowWelcomeModal(false);
    try {
      await updateUserSettings({ showOnboardingTour: false });
      updateSettings({ showOnboardingTour: false });
    } catch (error) {
      console.error('Error marking onboarding complete:', error);
    }
  }, [updateUserSettings, updateSettings]);

  const handleShowMeAround = useCallback(async () => {
    await dismissWelcomeModal();
    router.push('/help');
  }, [dismissWelcomeModal, router]);

  const value: TourContextType = {
    isTourActive: false,
    showWelcomeModal,
    dismissWelcomeModal,
  };

  return (
    <TourContext.Provider value={value}>
      {children}

      <Dialog
        open={showWelcomeModal}
        onOpenChange={open => {
          if (!open) dismissWelcomeModal();
        }}
      >
        <DialogContent className='border-zinc-700 bg-zinc-900 sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-2xl text-white'>
              Welcome to Rec!
            </DialogTitle>
            <DialogDescription className='text-zinc-300 text-base leading-relaxed pt-2'>
              Rec is a music sharing platform where you recommend albums based
              on ones you already love — and discover new music from what others
              recommend.
            </DialogDescription>
          </DialogHeader>
          <p className='text-sm text-zinc-400 leading-relaxed'>
            We won&apos;t bore you with a long tour. When you&apos;re ready to
            learn more, check out the Help page — it covers everything you need
            to know.
          </p>
          <DialogFooter className='flex-row gap-2 sm:justify-end'>
            <Button
              variant='ghost'
              onClick={dismissWelcomeModal}
              className='text-zinc-300 hover:text-white hover:bg-zinc-800'
            >
              Start Exploring
            </Button>
            <Button
              asChild
              onClick={handleShowMeAround}
              className='bg-emerald-600 hover:bg-emerald-700 text-white'
            >
              <Link href='/help'>Show Me Around</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
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

export const useTourContext = useTour;
