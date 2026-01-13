'use client';

import React, { useState } from 'react';
import { useTourContext } from '@/contexts/TourContext';
import { useUserSettingsStore } from '@/stores/useUserSettingsStore';
import { useUpdateUserSettingsMutation } from '@/generated/graphql';

// Truncated step titles for debug panel
// Steps marked with navigates: true will trigger a page navigation
const stepData = [
  { title: 'Welcome', navigates: false },
  { title: 'Create Rec Button', navigates: false },
  { title: 'Welcome Rec Drawer', navigates: false },
  { title: 'Understanding Rec System', navigates: false },
  { title: 'Album Selection', navigates: false },
  { title: 'Similarity Dial', navigates: false },
  { title: 'Submit Rec', navigates: false },
  { title: 'Great Job Transition', navigates: true }, // → /browse
  { title: 'Welcome Browse', navigates: false },
  { title: 'Search Bar', navigates: true }, // → /artists/daft-punk
  { title: 'Artist Page', navigates: false },
  { title: 'Artist Discography', navigates: true }, // → /albums/RAM
  { title: 'Album Details', navigates: false },
  { title: 'Album Interactions', navigates: false },
  { title: 'Album Recs Tab', navigates: false },
  { title: 'Profile Nav', navigates: true }, // → /profile
  { title: 'Profile Header', navigates: false },
  { title: 'Profile Settings', navigates: false },
  { title: 'Tour Complete', navigates: false },
];

export function TourDebugControls() {
  const { currentStep, startFromStep, isTourActive, resetOnboarding } =
    useTourContext();
  const [isExpanded, setIsExpanded] = useState(false);
  const { settings, updateSettings } = useUserSettingsStore();
  const { mutateAsync: updateUserSettings, isPending } =
    useUpdateUserSettingsMutation();

  const showOnboardingTour = settings?.showOnboardingTour ?? null;

  const handleToggleShowTour = async () => {
    const newValue = !showOnboardingTour;
    try {
      await updateUserSettings({ showOnboardingTour: newValue });
      updateSettings({ showOnboardingTour: newValue });
      console.log(`✅ showOnboardingTour set to ${newValue}`);
    } catch (error) {
      console.error('❌ Failed to update showOnboardingTour:', error);
    }
  };

  // Only show in development
  if (process.env.NODE_ENV !== 'development') return null;

  const totalSteps = stepData.length;

  return (
    <div className='fixed top-4 right-4 z-[10002] bg-zinc-900 border-2 border-emerald-600 rounded-lg shadow-2xl'>
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className='px-3 py-2 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors'
        >
          🎯 Tour Debug
        </button>
      ) : (
        <div className='p-4 min-w-[200px]'>
          <div className='flex items-center justify-between mb-3'>
            <h3 className='text-sm font-bold text-emerald-400'>Tour Debug</h3>
            <button
              onClick={() => setIsExpanded(false)}
              className='text-zinc-400 hover:text-white transition-colors'
            >
              ✕
            </button>
          </div>

          <div className='mb-3'>
            <div className='text-xs text-zinc-400 mb-1'>Current Step:</div>
            <div className='text-sm font-medium text-white'>
              {currentStep !== null
                ? `Step ${currentStep + 1} of ${totalSteps}`
                : 'N/A'}
            </div>
          </div>

          {/* Show step selector only when tour is active */}
          {isTourActive && (
            <div className='mb-3'>
              <label
                htmlFor='step-select'
                className='text-xs text-zinc-400 mb-1 block'
              >
                Jump to Step:{' '}
                <span className='text-red-400'>(red = navigates)</span>
              </label>
              <select
                id='step-select'
                value={currentStep ?? 0}
                onChange={e => startFromStep(parseInt(e.target.value, 10))}
                className='w-full px-2 py-1 text-sm bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:border-emerald-500'
              >
                {stepData.map((step, i) => (
                  <option key={i} value={i}>
                    {step.navigates ? '🔴 ' : ''}
                    {i + 1}: {step.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* showOnboardingTour toggle */}
          <div className='mb-3 pt-3 border-t border-zinc-700'>
            <div className='flex items-center justify-between'>
              <span className='text-xs text-zinc-400'>showOnboardingTour:</span>
              <button
                onClick={handleToggleShowTour}
                disabled={isPending || showOnboardingTour === null}
                className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                  showOnboardingTour
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isPending
                  ? '...'
                  : showOnboardingTour === null
                    ? 'N/A'
                    : showOnboardingTour
                      ? 'TRUE'
                      : 'FALSE'}
              </button>
            </div>
          </div>

          {/* Start Tour button when not active */}
          {!isTourActive && (
            <button
              onClick={() => resetOnboarding()}
              className='w-full px-3 py-2 text-xs font-medium bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors'
            >
              🎬 Start Tour
            </button>
          )}
        </div>
      )}
    </div>
  );
}
