// src/components/NextStepControllerTest.tsx
'use client';

import { NextStepController, TourAnalytics, defaultAnalytics } from '@/components/NextStepController';
import { Button } from '@/components/ui/button';
import { useNextStep } from 'nextstepjs';

// Test tours for the controller
const testTours = [
  {
    tour: 'welcome',
    steps: [
      {
        title: 'Welcome to NextStep Controller!',
        content: 'This test verifies our enhanced NextStep controller is working with all features.',
        selector: '#nextstep-controller-test',
        position: 'bottom' as const,
        icon: '🚀',
      },
      {
        title: 'Advanced Features',
        content: 'Our controller includes accessibility features, analytics, error handling, and more!',
        selector: '#feature-showcase',
        position: 'top' as const,
        icon: '⚡',
      },
    ],
  },
];

// Enhanced analytics for testing
const testAnalytics: TourAnalytics = {
  ...defaultAnalytics,
  trackTourStart: (tourId: string) => {
    console.log('🎯 Analytics: Tour started -', tourId);
  },
  trackTourComplete: (tourId: string, duration: number) => {
    console.log('✅ Analytics: Tour completed -', tourId, 'Duration:', duration + 'ms');
  },
  trackTourSkip: (tourId: string, stepIndex: number) => {
    console.log('⏭️ Analytics: Tour skipped -', tourId, 'at step', stepIndex);
  },
  trackStepView: (tourId: string, stepIndex: number) => {
    console.log('👁️ Analytics: Step viewed -', tourId, 'step', stepIndex);
  },
  trackError: (tourId: string, error: Error) => {
    console.error('❌ Analytics: Tour error -', tourId, error);
  },
};

function NextStepControllerTestContent() {
  const { startNextStep, closeNextStep, currentTour, currentStep, isNextStepVisible } = useNextStep();

  const handleStartTour = () => {
    startNextStep('welcome');
  };

  const handleCloseTour = () => {
    closeNextStep();
  };

  return (
    <div className="fixed top-4 right-4 z-50 bg-zinc-800 p-4 rounded-lg border border-zinc-700 max-w-sm">
      <h3 className="text-white font-semibold mb-3">NextStep Controller Test</h3>
      
      <div className="space-y-2 text-sm text-zinc-300 mb-4">
        <div>Current Tour: <span className="text-cyan-400">{currentTour || 'None'}</span></div>
        <div>Current Step: <span className="text-cyan-400">{currentStep}</span></div>
        <div>Tour Visible: <span className="text-cyan-400">{isNextStepVisible ? 'Yes' : 'No'}</span></div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button onClick={handleStartTour} size="sm" variant="outline">
          🚀 Start Test Tour
        </Button>
        <Button onClick={handleCloseTour} size="sm" variant="outline">
          ❌ Close Tour
        </Button>
      </div>

      {/* Test target elements */}
      <div
        id="nextstep-controller-test"
        className="mt-4 p-2 bg-cyan-600 text-white rounded text-sm text-center"
      >
        Controller Test Target
      </div>
      
      <div
        id="feature-showcase"
        className="mt-2 p-2 bg-purple-600 text-white rounded text-sm text-center"
      >
        Feature Showcase Target
      </div>

      <div className="mt-4 text-xs text-zinc-500">
        Check console for analytics events
      </div>
    </div>
  );
}

export function NextStepControllerTest() {
  return (
    <NextStepController
      tours={testTours}
      analytics={testAnalytics}
      accessibility={{
        enableKeyboardNavigation: true,
        enableScreenReaderSupport: true,
        respectReducedMotion: true,
        highContrastMode: false,
        announceSteps: true,
        focusManagement: true,
      }}
      customTheme={{
        primaryColor: '#06b6d4',
        backgroundColor: '#18181b',
        textColor: '#ffffff',
        borderRadius: '8px',
      }}
      onTourStart={(tourId) => console.log('🎬 Tour Started:', tourId)}
      onTourComplete={(tourId) => console.log('🏁 Tour Completed:', tourId)}
      onTourSkip={(tourId, stepIndex) => console.log('⏭️ Tour Skipped:', tourId, 'at step', stepIndex)}
      onError={(error) => console.error('💥 Tour Error:', error)}
      enableErrorBoundary={true}
    >
      <NextStepControllerTestContent />
    </NextStepController>
  );
} 