// src/components/TourTestComponent.tsx
'use client';

import React from 'react';
import { useNextStep } from 'nextstepjs';
import { useMusicPlatformTours } from '@/components/MusicPlatformTourProvider';

export function TourTestComponent() {
  const { startNextStep } = useNextStep();
  const { tours, startTour, announceToScreenReader } = useMusicPlatformTours();

  const handleStartTour = (tourId: string) => {
    const tour = tours.find(t => t.tour === tourId);
    if (tour) {
      startTour(tourId); // This will announce to screen reader
      startNextStep(tour.tour);
    }
  };

  return (
    <div 
      className="fixed top-4 right-4 z-50 bg-zinc-900 border border-zinc-700 rounded-lg p-4 shadow-lg"
      role="region"
      aria-label="Tour testing controls"
    >
      <h3 className="text-white font-semibold mb-3" id="tour-controls-heading">
        🎵 Tour Testing
      </h3>
      
      <div className="space-y-2" role="group" aria-labelledby="tour-controls-heading">
        <button
          onClick={() => handleStartTour('welcome-onboarding')}
          className="w-full px-3 py-2 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
          aria-describedby="welcome-tour-desc"
        >
          Welcome Tour
        </button>
        <div id="welcome-tour-desc" className="sr-only">
          Starts the welcome onboarding tour with 4 steps introducing the platform
        </div>

        <button
          onClick={() => handleStartTour('navigation-basics')}
          className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
          aria-describedby="nav-tour-desc"
        >
          Navigation Tour
        </button>
        <div id="nav-tour-desc" className="sr-only">
          Starts the navigation basics tour with 3 steps explaining platform navigation
        </div>

        <button
          onClick={() => handleStartTour('collection-building')}
          className="w-full px-3 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
          aria-describedby="collection-tour-desc"
        >
          Collection Tour
        </button>
        <div id="collection-tour-desc" className="sr-only">
          Starts the collection building tour with 3 steps on managing music collections
        </div>
        
        {/* Test Target Elements */}
        <div className="mt-4 pt-4 border-t border-zinc-700">
          <p className="text-zinc-400 text-xs mb-2" id="test-elements-heading">
            Test Elements:
          </p>
          <div role="group" aria-labelledby="test-elements-heading">
            <div 
              id="test-search-bar" 
              className="bg-zinc-800 p-2 rounded text-xs text-white mb-2"
              role="textbox"
              aria-label="Search bar demonstration element"
              tabIndex={0}
            >
              🔍 Search Bar (test element)
            </div>
            <div 
              id="test-collections-btn" 
              className="bg-zinc-800 p-2 rounded text-xs text-white mb-2"
              role="button"
              aria-label="Collections button demonstration element"
              tabIndex={0}
            >
              📚 Collections Button (test element)
            </div>
            <div 
              id="test-profile-menu" 
              className="bg-zinc-800 p-2 rounded text-xs text-white"
              role="button"
              aria-label="Profile menu demonstration element"
              tabIndex={0}
            >
              👤 Profile Menu (test element)
            </div>
          </div>
        </div>

        {/* Accessibility Instructions */}
        <div className="mt-4 pt-4 border-t border-zinc-700">
          <p className="text-zinc-400 text-xs mb-1" id="a11y-instructions">
            ♿ Accessibility:
          </p>
          <ul className="text-zinc-500 text-xs space-y-1" aria-labelledby="a11y-instructions">
            <li>• Tab: Navigate tour buttons</li>
            <li>• Enter/Space: Activate buttons</li>
            <li>• Escape: Close active tour</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 