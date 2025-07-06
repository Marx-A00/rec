// src/components/CustomTourCard.tsx
'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { Step } from 'nextstepjs';
import { X } from 'lucide-react';

interface CustomTourCardProps {
  step: Step;
  currentStep: number;
  totalSteps: number;
  nextStep: () => void;
  prevStep: () => void;
  skipTour?: () => void;
  arrow: React.ReactNode;
}

export const CustomTourCard = ({
  step,
  currentStep,
  totalSteps,
  nextStep,
  prevStep,
  skipTour,
  arrow,
}: CustomTourCardProps) => {
  // Check if this is the welcome step
  const isWelcomeStep = step.title?.includes('Welcome') && step.icon === '🎵';

  const handleSkip = () => {
    if (skipTour) {
      skipTour();
    }
  };

  // Render welcome modal using portal to bypass NextStep positioning
  if (isWelcomeStep && typeof document !== 'undefined') {
    const modalContent = (
      <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-lg w-full p-8 text-center relative shadow-2xl">
          {/* Close button */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors p-1"
            aria-label="Skip tour"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon */}
          <div className="text-7xl mb-6">🎵</div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-white mb-4">
            Welcome to Rec!
          </h1>

          {/* Content */}
          <div className="text-zinc-300 mb-8 leading-relaxed text-lg">
            Discover amazing music through community recommendations. Let's show you how it works!
          </div>

          {/* Progress indicator */}
          <div className="text-sm text-zinc-500 mb-8 font-medium">
            Step {currentStep + 1} of {totalSteps}
          </div>

          {/* Buttons */}
          <div className="space-y-4">
            <button
              onClick={nextStep}
              className="w-full px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all transform hover:scale-105 shadow-lg"
            >
              Show me around! 🚀
            </button>
            
            <button
              onClick={handleSkip}
              className="w-full px-8 py-3 bg-transparent border border-zinc-600 hover:border-zinc-400 text-zinc-400 hover:text-white font-medium rounded-xl transition-all"
            >
              I'll explore on my own
            </button>
          </div>
        </div>
      </div>
    );

    return createPortal(modalContent, document.body);
  }

  // Render as regular positioned tour card
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl p-6 max-w-sm relative">
      {/* Arrow pointing to target element */}
      {arrow}
      
      {/* Header with icon and title */}
      <div className="flex items-center gap-3 mb-4">
        {step.icon && <div className="text-3xl">{step.icon}</div>}
        <h3 className="text-xl font-semibold text-white">{step.title}</h3>
      </div>
      
      {/* Content */}
      <div className="text-zinc-300 mb-6 leading-relaxed">
        {step.content}
      </div>
      
      {/* Footer with progress and controls */}
      <div className="flex justify-between items-center">
        <div className="text-xs text-zinc-500 font-medium">
          {currentStep + 1} / {totalSteps}
        </div>
        
        <div className="flex gap-2">
          {currentStep > 0 && (
            <button
              onClick={prevStep}
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-sm rounded-lg transition-colors"
            >
              Previous
            </button>
          )}
          
          <button
            onClick={nextStep}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors font-medium"
          >
            {currentStep === totalSteps - 1 ? 'Finish' : 'Next'}
          </button>
          
          {step.showSkip && skipTour && (
            <button
              onClick={handleSkip}
              className="px-3 py-2 text-zinc-400 hover:text-zinc-300 text-sm transition-colors"
            >
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}; 