// src/components/CustomTourCard.tsx
'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { Step } from 'nextstepjs';
import { X } from 'lucide-react';
import { AvatarTourCard } from './tour-cards/AvatarTourCard';

interface CustomTourCardProps {
  step: Step;
  currentStep: number;
  totalSteps: number;
  nextStep: () => void;
  prevStep: () => void;
  skipTour?: () => void;
  arrow: React.ReactNode;
}

// Welcome Modal Card (Portal-based)
const WelcomeModalCard = ({ step, currentStep, totalSteps, nextStep, skipTour }: CustomTourCardProps) => {
  const handleSkip = () => {
    if (skipTour) skipTour();
  };

  const modalContent = (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-lg w-full p-8 text-center relative shadow-2xl">
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors p-1"
          aria-label="Skip tour"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-7xl mb-6">🎵</div>
        <h1 className="text-3xl font-bold text-white mb-4">Welcome to Rec!</h1>
        <div className="text-zinc-300 mb-8 leading-relaxed text-lg">
          Discover amazing music through community recommendations. Let's show you how it works!
        </div>
        <div className="text-sm text-zinc-500 mb-8 font-medium">
          Step {currentStep + 1} of {totalSteps}
        </div>
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
};

// Recommendation Drawer Card (Special card for drawer overlay)
const RecommendationDrawerCard = ({ step, currentStep, totalSteps, nextStep, prevStep, skipTour, arrow }: CustomTourCardProps) => {
  return (
    <div 
      className="bg-zinc-800/90 backdrop-blur-sm border border-zinc-600 rounded-xl shadow-2xl p-6 relative"
      style={{
        width: '380px', // Standard width for drawer context
        maxWidth: 'calc(100vw - 32px)', // Responsive fallback
        zIndex: 10001, // Higher than drawer (which is usually 10000)
      }}
    >
      {arrow}
      
      <div className="flex items-center gap-3 mb-4">
        <div className="text-3xl animate-bounce">{step.icon}</div>
        <h3 className="text-xl font-semibold text-white leading-tight">{step.title}</h3>
      </div>
      
      <div className="text-zinc-200 mb-6 leading-relaxed text-sm">
        {step.content}
      </div>
      
      {/* Add a helpful tip box for drawer context */}
      <div className="mb-6 p-3 bg-orange-900/30 border border-orange-600/40 rounded-lg">
        <p className="text-xs text-orange-300 font-medium">
          🎯 <strong>Pro tip:</strong> Search for an album, then add your thoughts about why others should listen to it!
        </p>
      </div>
      
      <div className="flex justify-between items-center">
        <div className="text-xs text-zinc-400 font-medium">
          {currentStep + 1} / {totalSteps}
        </div>
        
        <div className="flex gap-2 flex-wrap">
          {currentStep > 0 && (
            <button
              onClick={prevStep}
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm rounded-lg transition-colors"
            >
              Previous
            </button>
          )}
          
          <button
            onClick={nextStep}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg transition-colors font-medium"
          >
            {currentStep === totalSteps - 1 ? 'Finish' : 'Got it!'}
          </button>
          
          {step.showSkip && skipTour && (
            <button
              onClick={skipTour}
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

// Collection Building Card (Custom styling for collection steps)
const CollectionTourCard = ({ step, currentStep, totalSteps, nextStep, prevStep, skipTour, arrow }: CustomTourCardProps) => {
  return (
    <div 
      className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl p-6 relative"
      style={{
        width: '420px', // Fixed width that's wider than standard
        maxWidth: 'calc(100vw - 32px)', // Responsive fallback
        zIndex: 1000,
      }}
    >
      {arrow}
      
      <div className="flex items-center gap-3 mb-4">
        <div className="text-3xl">{step.icon}</div>
        <h3 className="text-xl font-semibold text-white leading-tight">{step.title}</h3>
      </div>
      
      <div className="text-zinc-300 mb-6 leading-relaxed text-sm">
        {step.content}
      </div>
      
      {/* Add a helpful tip box for collections */}
      <div className="mb-6 p-3 bg-purple-900/20 border border-purple-700/30 rounded-lg">
        <p className="text-xs text-purple-400 font-medium">
          📚 <strong>Tip:</strong> Collections help you organize albums by theme, mood, or genre!
        </p>
      </div>
      
      <div className="flex justify-between items-center">
        <div className="text-xs text-zinc-500 font-medium">
          {currentStep + 1} / {totalSteps}
        </div>
        
        <div className="flex gap-2 flex-wrap">
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
              onClick={skipTour}
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

// Share Music Taste Card (Custom styling for recommendation step)
const ShareMusicTourCard = ({ step, currentStep, totalSteps, nextStep, prevStep, skipTour, arrow }: CustomTourCardProps) => {
  // Custom next handler that opens the drawer before advancing
  const handleNext = () => {
    // Check if we can access the drawer context
    const event = new CustomEvent('open-recommendation-drawer');
    window.dispatchEvent(event);
    
    // Small delay to let drawer open before advancing tour
    setTimeout(() => {
      nextStep();
    }, 100);
  };

  return (
    <div 
      className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl p-6 relative"
      style={{
        width: '420px', // Fixed width that's wider than standard
        maxWidth: 'calc(100vw - 32px)', // Responsive fallback
        zIndex: 1000,
      }}
    >
      {arrow}
      
      <div className="flex items-center gap-3 mb-4">
        <div className="text-3xl animate-pulse">{step.icon}</div>
        <h3 className="text-xl font-semibold text-white leading-tight">{step.title}</h3>
      </div>
      
      <div className="text-zinc-300 mb-6 leading-relaxed text-sm">
        {step.content}
      </div>
      
      {/* Add a helpful tip box */}
      <div className="mb-6 p-3 bg-emerald-900/20 border border-emerald-700/30 rounded-lg">
        <p className="text-xs text-emerald-400 font-medium">
          💡 <strong>Tip:</strong> Great recommendations help others discover new music!
        </p>
      </div>
      
      <div className="flex justify-between items-center">
        <div className="text-xs text-zinc-500 font-medium">
          {currentStep + 1} / {totalSteps}
        </div>
        
        <div className="flex gap-2 flex-wrap">
          {currentStep > 0 && (
            <button
              onClick={prevStep}
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-sm rounded-lg transition-colors"
            >
              Previous
            </button>
          )}
          
          <button
            onClick={handleNext}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors font-medium"
          >
            {currentStep === totalSteps - 1 ? 'Finish' : 'Next'}
          </button>
          
          {step.showSkip && skipTour && (
            <button
              onClick={skipTour}
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

// Standard Card (Normal positioning)
const StandardTourCard = ({ step, currentStep, totalSteps, nextStep, prevStep, skipTour, arrow }: CustomTourCardProps) => {
  return (
    <div 
      className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl p-6 max-w-sm relative"
      style={{
        maxWidth: 'min(380px, calc(100vw - 32px))',
        zIndex: 1000,
      }}
    >
      {arrow}
      
      <div className="flex items-center gap-3 mb-4">
        {step.icon && <div className="text-3xl">{step.icon}</div>}
        <h3 className="text-xl font-semibold text-white leading-tight">{step.title}</h3>
      </div>
      
      <div className="text-zinc-300 mb-6 leading-relaxed text-sm">
        {step.content}
      </div>
      
      <div className="flex justify-between items-center">
        <div className="text-xs text-zinc-500 font-medium">
          {currentStep + 1} / {totalSteps}
        </div>
        
        <div className="flex gap-2 flex-wrap">
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
              onClick={skipTour}
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

// Main router component
export const CustomTourCard = (props: CustomTourCardProps) => {
  const { step } = props;

  // Route to specific card component based on step characteristics
  if (step.title?.includes('Welcome') && step.icon === '🎵') {
    return <WelcomeModalCard {...props} />;
  }
  
  if (step.title?.includes('Share Your Music Taste') && step.icon === '🎤') {
    return <ShareMusicTourCard {...props} />;
  }
  
  if (step.title?.includes('Create Your First Recommendation') && step.icon === '✨') {
    return <RecommendationDrawerCard {...props} />;
  }
  
  if (step.title?.includes('Your Profile') && step.icon === '👤') {
    return <AvatarTourCard {...props} />;
  }
  
  if ((step.title?.includes('Build Your Collection') || step.title?.includes('Building Collections')) && step.icon === '📚') {
    return <CollectionTourCard {...props} />;
  }
  
  // Default to standard card
  return <StandardTourCard {...props} />;
}; 