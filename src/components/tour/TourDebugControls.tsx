'use client';

import React, { useState } from 'react';
import { useTourContext } from '@/contexts/TourContext';

export function TourDebugControls() {
  const { currentStep, startFromStep, isTourActive } = useTourContext();
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't show if tour is not active
  if (!isTourActive) return null;

  const totalSteps = 15; // Update this if tour steps change

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
              {currentStep !== null ? `Step ${currentStep + 1} of ${totalSteps}` : 'N/A'}
            </div>
          </div>

          <div>
            <label htmlFor='step-select' className='text-xs text-zinc-400 mb-1 block'>
              Jump to Step:
            </label>
            <select
              id='step-select'
              value={currentStep ?? 0}
              onChange={(e) => startFromStep(parseInt(e.target.value, 10))}
              className='w-full px-2 py-1 text-sm bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:border-emerald-500'
            >
              {Array.from({ length: totalSteps }, (_, i) => (
                <option key={i} value={i}>
                  Step {i + 1}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
