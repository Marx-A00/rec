// src/components/providers/NextStepProvider.tsx
'use client';

import { NextStepProvider as NextStepProviderLib, NextStep } from 'nextstepjs';
import { ReactNode } from 'react';

interface NextStepProviderProps {
  children: ReactNode;
}

// Basic tour steps for testing
const testSteps = [
  {
    tour: 'welcome',
    steps: [
      {
        title: 'Welcome to Rec!',
        content: 'This is a test tour to verify NextStep is working correctly.',
        selector: '#welcome-step',
        position: 'bottom' as const,
        icon: '🎵', // Required icon property
      },
    ],
  },
];

export function NextStepProvider({ children }: NextStepProviderProps) {
  return (
    <NextStepProviderLib>
      <NextStep steps={testSteps}>
        {children}
      </NextStep>
    </NextStepProviderLib>
  );
} 