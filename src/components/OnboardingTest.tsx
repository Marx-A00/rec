// src/components/OnboardingTest.tsx
'use client';

import { useNextStepOnboarding } from '@/contexts/NextStepOnboardingContext';
import { Button } from '@/components/ui/button';

export function OnboardingTest() {
  const {
    currentTour,
    currentStep,
    isOnboardingActive,
    tourProgress,
    startOnboarding,
    skipOnboarding,
    nextStep,
    prevStep,
    availableTours,
    getTourProgress,
  } = useNextStepOnboarding();

  const handleStartTour = () => {
    startOnboarding('welcome');
  };

  return (
    <div className="fixed top-20 right-4 z-50 bg-zinc-800 p-4 rounded-lg border border-zinc-700 max-w-xs">
      <h3 className="text-white font-semibold mb-3">Onboarding Context Test</h3>
      
      <div className="space-y-2 text-sm text-zinc-300 mb-4">
        <div>Current Tour: {currentTour || 'None'}</div>
        <div>Current Step: {currentStep}</div>
        <div>Is Active: {isOnboardingActive ? 'Yes' : 'No'}</div>
        <div>Available Tours: {availableTours.length}</div>
        {tourProgress && (
          <div>Progress: {tourProgress.completedSteps.length}/{tourProgress.totalSteps}</div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Button 
          onClick={handleStartTour} 
          variant="outline" 
          size="sm"
          disabled={isOnboardingActive}
        >
          Start Welcome Tour
        </Button>
        
        {isOnboardingActive && (
          <>
            <Button onClick={prevStep} variant="outline" size="sm">
              Previous Step
            </Button>
            <Button onClick={nextStep} variant="outline" size="sm">
              Next Step
            </Button>
            <Button onClick={skipOnboarding} variant="destructive" size="sm">
              Skip Tour
            </Button>
          </>
        )}
      </div>

      {/* Test target element */}
      <div
        id="welcome-step"
        className="mt-3 p-2 bg-zinc-700 text-white rounded text-xs"
      >
        Welcome Tour Target
      </div>
    </div>
  );
} 