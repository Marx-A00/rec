// src/components/NextStepTest.tsx
'use client';

import { useNextStep } from 'nextstepjs';
import { Button } from '@/components/ui/button';

export function NextStepTest() {
  const { startNextStep } = useNextStep();

  const handleStartTour = () => {
    startNextStep('welcome');
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <Button onClick={handleStartTour} variant="outline" size="sm">
        🎵 Test Tour
      </Button>
      {/* Test target element */}
      <div
        id="welcome-step"
        className="mt-2 p-2 bg-zinc-800 text-white rounded text-sm"
      >
        Welcome Step Target
      </div>
    </div>
  );
} 