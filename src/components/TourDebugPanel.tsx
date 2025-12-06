'use client';

import { useState, useEffect } from 'react';
import { Play, RotateCcw, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react';

import { useTour } from '@/contexts/TourContext';

/**
 * Tour Debug Panel - Development Testing Tool
 *
 * Floating panel for testing tour functionality in real-time.
 * Only shows in development mode.
 *
 * Features:
 * - Start tour manually
 * - Stop current tour
 * - Reset onboarding status (to test new user flow)
 * - Collapsible to stay out of the way
 */
export function TourDebugPanel() {
  // DISABLED: Tour controls moved to TopBar
  // Keeping this component for potential future use, but it won't render
  return null;

  /* eslint-disable @typescript-eslint/no-unused-vars */
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const { startTour, stopTour, resetOnboarding, currentStep, isTourActive } = useTour();

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */

  const handleCheckOnboardingStatus = async () => {
    try {
      console.log('🔍 Checking onboarding status...');
      const response = await fetch('/api/users/onboarding-status');
      const data = await response.json();

      if (response.ok) {
        console.log('📊 Onboarding status:', data);
        alert(
          `📊 Onboarding Status\n\n` +
          `Is New User: ${data.isNewUser ? 'Yes ✅' : 'No ❌'}\n` +
          `User ID: ${data.userId}\n` +
          `Profile Updated: ${data.profileUpdatedAt || 'Never'}\n` +
          `Created: ${data.createdAt}`
        );
      } else {
        alert(`❌ Error: ${data.error || 'Failed to check status'}`);
      }
    } catch (error) {
      console.error('❌ Error checking status:', error);
      alert('❌ Network error. Check console for details.');
    }
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className='fixed bottom-4 right-4 z-[9999] p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg transition-all'
        title='Show Tour Debug Panel'
      >
        <Play className='w-5 h-5' />
      </button>
    );
  }

  return (
    <div className='fixed bottom-4 right-4 z-[9999] bg-zinc-900 border-2 border-purple-600 rounded-xl shadow-2xl overflow-hidden transition-all'>
      {/* Header */}
      <div className='flex items-center justify-between gap-3 px-4 py-3 bg-purple-600 text-white'>
        <div className='flex items-center gap-2'>
          <Play className='w-4 h-4' />
          <span className='font-bold text-sm'>Tour Debug Panel</span>
          {isTourActive && (
            <span className='text-xs bg-emerald-500 px-2 py-1 rounded-full'>
              Active: Step {(currentStep ?? 0) + 1}
            </span>
          )}
        </div>
        <div className='flex items-center gap-2'>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className='p-1 hover:bg-purple-700 rounded transition-colors'
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? (
              <ChevronUp className='w-4 h-4' />
            ) : (
              <ChevronDown className='w-4 h-4' />
            )}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className='p-1 hover:bg-purple-700 rounded transition-colors'
            title='Hide panel'
          >
            <X className='w-4 h-4' />
          </button>
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className='p-3 space-y-2'>
          {/* Primary Actions */}
          <button
            onClick={startTour}
            className='w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed'
            disabled={isTourActive}
          >
            <Play className='w-4 h-4' />
            {isTourActive ? 'Tour Running...' : 'Start Tour'}
          </button>

          <button
            onClick={stopTour}
            className='w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed'
            disabled={!isTourActive}
          >
            <X className='w-4 h-4' />
            Stop Tour
          </button>

          <button
            onClick={handleCheckOnboardingStatus}
            className='w-full flex items-center justify-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg text-sm font-medium transition-all'
          >
            📊 Check Status
          </button>

          <button
            onClick={resetOnboarding}
            className='w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-all'
          >
            <Trash2 className='w-4 h-4' />
            Reset & Restart
          </button>
        </div>
      )}
    </div>
  );
}
