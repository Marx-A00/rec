'use client';

import { useState } from 'react';
import { Play, RotateCcw, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Tour Debug Panel - Development Testing Tool
 *
 * Floating panel for testing tour functionality in real-time.
 * Only shows in development mode.
 *
 * Features:
 * - Start tour manually
 * - Restart current tour
 * - Reset onboarding status (to test new user flow)
 * - Collapsible to stay out of the way
 */
export function TourDebugPanel() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const handleStartTour = () => {
    console.log('🎯 Starting tour...');
    // This will work with both NextStepJS (current) and Driver.js (future)
    if ((window as any).startNextStep) {
      (window as any).startNextStep('welcome-onboarding');
    } else if ((window as any).startTour) {
      (window as any).startTour();
    } else {
      alert('⚠️ Tour system not initialized. Refresh the page and try again.');
    }
  };

  const handleRestartTour = () => {
    console.log('🔄 Restarting tour...');
    // First try to stop current tour
    if ((window as any).debugTour?.restartTour) {
      (window as any).debugTour.restartTour();
    } else {
      // Fallback: just start from beginning
      handleStartTour();
    }
  };

  const handleResetOnboarding = async () => {
    const confirmed = confirm(
      '🔄 This will reset your onboarding status to make you appear as a "new user".\n\n' +
      'After clicking OK, refresh the page to trigger the auto-start tour.\n\n' +
      'Continue?'
    );

    if (!confirmed) return;

    try {
      console.log('🗑️ Resetting onboarding status...');
      const response = await fetch('/api/users/onboarding-status/reset', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Onboarding status reset!', data);
        alert(
          '✅ Success!\n\n' +
          'Your onboarding status has been reset.\n' +
          'Refresh the page to trigger the tour automatically.'
        );
      } else {
        console.error('❌ Failed to reset onboarding:', data);
        alert(`❌ Error: ${data.error || 'Failed to reset onboarding status'}`);
      }
    } catch (error) {
      console.error('❌ Error resetting onboarding:', error);
      alert('❌ Network error. Check console for details.');
    }
  };

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
        className='fixed bottom-4 left-4 z-[9999] p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg transition-all'
        title='Show Tour Debug Panel'
      >
        <Play className='w-5 h-5' />
      </button>
    );
  }

  return (
    <div className='fixed bottom-4 left-4 z-[9999] bg-zinc-900 border-2 border-purple-600 rounded-xl shadow-2xl overflow-hidden transition-all'>
      {/* Header */}
      <div className='flex items-center justify-between gap-3 px-4 py-3 bg-purple-600 text-white'>
        <div className='flex items-center gap-2'>
          <Play className='w-4 h-4' />
          <span className='font-bold text-sm'>Tour Debug Panel</span>
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
        <div className='p-4 space-y-3'>
          {/* Environment indicator */}
          <div className='text-xs text-zinc-500 font-mono'>
            ENV: {process.env.NODE_ENV} | DEV MODE
          </div>

          {/* Primary Actions */}
          <div className='space-y-2'>
            <button
              onClick={handleStartTour}
              className='w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-all shadow-lg'
            >
              <Play className='w-4 h-4' />
              Start Tour
            </button>

            <button
              onClick={handleRestartTour}
              className='w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all'
            >
              <RotateCcw className='w-4 h-4' />
              Restart Tour
            </button>
          </div>

          {/* Divider */}
          <div className='border-t border-zinc-700 pt-3'>
            <div className='text-xs text-zinc-400 font-medium mb-2'>
              Onboarding Testing
            </div>

            <div className='space-y-2'>
              <button
                onClick={handleCheckOnboardingStatus}
                className='w-full flex items-center justify-center gap-2 px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg text-sm transition-all'
              >
                📊 Check Status
              </button>

              <button
                onClick={handleResetOnboarding}
                className='w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-all'
              >
                <Trash2 className='w-4 h-4' />
                Reset Onboarding
              </button>
            </div>
          </div>

          {/* Info */}
          <div className='text-xs text-zinc-500 leading-relaxed pt-2 border-t border-zinc-800'>
            💡 <strong>Tip:</strong> Reset onboarding to test the new user auto-start flow. Refresh the page after resetting.
          </div>

          {/* Console Commands */}
          <div className='text-xs text-zinc-500 pt-2 border-t border-zinc-800'>
            <div className='font-medium mb-1'>Console Commands:</div>
            <code className='block bg-zinc-800 p-2 rounded text-zinc-400 font-mono text-xs'>
              window.startTour()
              <br />
              window.debugTour.restartTour()
            </code>
          </div>
        </div>
      )}
    </div>
  );
}
