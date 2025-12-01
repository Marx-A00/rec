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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const { startTour, stopTour, resetOnboarding, startFromStep, currentStep, isTourActive } = useTour();

  // Expose button check function globally
  useEffect(() => {
    (window as unknown as { checkButton: () => Element | null }).checkButton = () => {
      const el = document.querySelector('[data-tour-step="create-recommendation"]');
      console.log('🔍 Button check:', {
        found: !!el,
        element: el,
        id: (el as HTMLElement)?.id,
        opacity: el ? window.getComputedStyle(el).opacity : 'N/A',
        visibility: el ? window.getComputedStyle(el).visibility : 'N/A',
        display: el ? window.getComputedStyle(el).display : 'N/A'
      });
      return el;
    };
  }, []);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

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
              Active: Step {currentStep !== null ? currentStep + 1 : '?'}
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
        <div className='p-4 space-y-3'>
          {/* Environment indicator */}
          <div className='text-xs text-zinc-500 font-mono'>
            ENV: {process.env.NODE_ENV} | DEV MODE
          </div>

          {/* Primary Actions */}
          <div className='space-y-2'>
            <button
              onClick={startTour}
              className='w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed'
              disabled={isTourActive}
            >
              <Play className='w-4 h-4' />
              {isTourActive ? 'Tour Running...' : 'Start Tour'}
            </button>

            <button
              onClick={() => startFromStep(1)}
              className='w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed'
              disabled={isTourActive}
            >
              🎯 Test Step 2 (Recommend Button)
            </button>

            <button
              onClick={stopTour}
              className='w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed'
              disabled={!isTourActive}
            >
              <X className='w-4 h-4' />
              Stop Tour
            </button>
          </div>

          {/* Element Detection Diagnostic */}
          <div className='border-t border-zinc-700 pt-3'>
            <div className='text-xs text-zinc-400 font-medium mb-2'>
              Element Detection
            </div>
            <button
              onClick={() => {
                const el = document.querySelector('[data-tour-step="create-recommendation"]');

                if (!el) {
                  alert('❌ Element NOT FOUND!');
                  return;
                }

                const rect = el.getBoundingClientRect();
                const computed = window.getComputedStyle(el);
                const details = {
                  found: !!el,
                  tagName: (el as HTMLElement).tagName,
                  id: (el as HTMLElement).id || 'N/A',
                  className: (el as HTMLElement).className,
                  rect: {
                    x: Math.round(rect.x),
                    y: Math.round(rect.y),
                    width: Math.round(rect.width),
                    height: Math.round(rect.height),
                  },
                  computed: {
                    display: computed.display,
                    position: computed.position,
                    width: computed.width,
                    height: computed.height,
                    padding: computed.padding,
                    opacity: computed.opacity,
                    visibility: computed.visibility,
                  },
                  parent: {
                    tagName: el.parentElement?.tagName,
                    className: el.parentElement?.className,
                  }
                };

                console.log('🔍 FULL Element Diagnostic:', details);
                console.log('📐 Raw element:', el);

                alert(
                  `Element Diagnostic\n\n` +
                  `Tag: ${details.tagName}\n` +
                  `Class: ${details.className.substring(0, 50)}...\n\n` +
                  `BOUNDING RECT:\n` +
                  `Width: ${details.rect.width}px\n` +
                  `Height: ${details.rect.height}px\n` +
                  `X: ${details.rect.x}px, Y: ${details.rect.y}px\n\n` +
                  `COMPUTED STYLES:\n` +
                  `Display: ${details.computed.display}\n` +
                  `Position: ${details.computed.position}\n` +
                  `Opacity: ${details.computed.opacity}\n\n` +
                  `Check console for FULL details!`
                );
              }}
              className='w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-all'
            >
              🔍 Check Button Dimensions
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
                onClick={resetOnboarding}
                className='w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-all'
              >
                <Trash2 className='w-4 h-4' />
                Reset & Restart Tour
              </button>
            </div>
          </div>

          {/* Info */}
          <div className='text-xs text-zinc-500 leading-relaxed pt-2 border-t border-zinc-800'>
            💡 <strong>Tip:</strong> Reset onboarding automatically restarts the tour after 500ms.
          </div>

          {/* Console Commands */}
          <div className='text-xs text-zinc-500 pt-2 border-t border-zinc-800'>
            <div className='font-medium mb-1'>Console Commands:</div>
            <code className='block bg-zinc-800 p-2 rounded text-zinc-400 font-mono text-xs'>
              window.checkButton()
              <br />
              window.debugTour.start()
              <br />
              window.debugTour.jumpToStep(1)
              <br />
              window.debugTour.stop()
              <br />
              window.debugTour.reset()
            </code>
          </div>
        </div>
      )}
    </div>
  );
}
