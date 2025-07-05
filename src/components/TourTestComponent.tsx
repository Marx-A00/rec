// src/components/TourTestComponent.tsx
'use client';

import React from 'react';
import { useNextStep } from 'nextstepjs';

/**
 * Tour Test Component
 * 
 * This component provides a simple interface for testing tours during development.
 * It appears as a panel in the top-right corner with buttons to start each tour.
 * 
 * Usage:
 * - Already added to the main page for testing
 * - Click any button to start the corresponding tour
 * - Check browser console for tour start confirmations
 * 
 * Note: This is for development/testing only.
 * In production, tours would be triggered by user actions or onboarding flows.
 */
export function TourTestComponent() {
  const { startNextStep } = useNextStep();

  const handleStartTour = (tourId: string) => {
    console.log(`🚀 Starting tour: ${tourId}`);
    startNextStep(tourId);
  };

  return (
    <div className="fixed top-4 right-4 z-50 bg-zinc-900 border border-zinc-700 rounded-lg p-4 shadow-lg">
      <h3 className="text-white font-semibold mb-3">🎵 Tour Testing</h3>
      
      <div className="space-y-2">
        <button
          onClick={() => handleStartTour('welcome-onboarding')}
          className="w-full px-3 py-2 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700 transition-colors"
        >
          Welcome Tour
        </button>

        <button
          onClick={() => handleStartTour('navigation-basics')}
          className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
        >
          Navigation Tour
        </button>

        <button
          onClick={() => handleStartTour('collection-building')}
          className="w-full px-3 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 transition-colors"
        >
          Collection Tour
        </button>

        <div className="text-xs text-zinc-400 mt-3">
          💡 Tours will highlight test elements on the page
        </div>
      </div>
    </div>
  );
} 