// src/components/CustomTourCard.tsx
'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { Step } from 'nextstepjs';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
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
  const handleNext = () => {
    // Ensure drawer stays open before advancing to next step
    const event = new CustomEvent('open-recommendation-drawer');
    window.dispatchEvent(event);
    
    // Small delay to ensure drawer is open
    setTimeout(() => {
      nextStep();
    }, 200);
  };

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
            onClick={handleNext}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg transition-colors font-medium"
          >
            {currentStep === totalSteps - 1 ? 'Finish' : 'Continue'}
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
            onClick={handleNext}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors font-medium"
          >
            {currentStep === totalSteps - 1 ? 'Finish' : 'Open Drawer'}
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

// Search Demo Card (Interactive search demonstration)
const SearchDemoCard = ({ step, currentStep, totalSteps, nextStep, prevStep, skipTour, arrow }: CustomTourCardProps) => {
  const handleNext = () => {
    nextStep();
  };

  // Auto-fill the drawer with example albums when this step loads
  React.useEffect(() => {
    // Create static example albums for the demo - no external dependencies
    const exampleSourceAlbum = {
      id: 'demo-source-123',
      title: 'Random Access Memories',
      artists: [{ 
        id: 'daft-punk-123', 
        name: 'Daft Punk' 
      }],
      year: 2013,
      releaseDate: '2013',
      genre: ['Electronic', 'House', 'Disco'],
      label: 'Columbia Records',
      image: { 
        url: '/demo-albums/RAM-daft-punk.jpeg', // Real album cover!
        width: 400, 
        height: 400,
        alt: 'Random Access Memories cover'
      },
      tracks: [
        { id: '1', title: 'Give Life Back to Music', duration: 274, trackNumber: 1 },
        { id: '2', title: 'The Game of Love', duration: 321, trackNumber: 2 },
        { id: '3', title: 'Giorgio by Moroder', duration: 544, trackNumber: 3 },
        { id: '4', title: 'Within', duration: 228, trackNumber: 4 },
        { id: '5', title: 'Instant Crush', duration: 337, trackNumber: 5 },
        { id: '6', title: 'Lose Yourself to Dance', duration: 353, trackNumber: 6 },
        { id: '7', title: 'Touch', duration: 498, trackNumber: 7 },
        { id: '8', title: 'Get Lucky', duration: 247, trackNumber: 8 },
        { id: '9', title: 'Beyond', duration: 281, trackNumber: 9 },
        { id: '10', title: 'Motherboard', duration: 341, trackNumber: 10 },
        { id: '11', title: 'Fragments of Time', duration: 279, trackNumber: 11 },
        { id: '12', title: 'Doin\' it Right', duration: 251, trackNumber: 12 },
        { id: '13', title: 'Contact', duration: 381, trackNumber: 13 }
      ],
      metadata: {
        totalDuration: 4435, // Total seconds
        numberOfTracks: 13,
        format: 'Digital'
      }
    };

    const exampleRecommendedAlbum = {
      id: 'demo-rec-456',
      title: 'Discovery',
      artists: [{ 
        id: 'daft-punk-123', 
        name: 'Daft Punk' 
      }],
      year: 2001,
      releaseDate: '2001',
      genre: ['Electronic', 'House', 'French House'],
      label: 'Virgin Records',
      image: { 
        url: '/demo-albums/discovery-daft-punk.jpg', // Real album cover!
        width: 400, 
        height: 400,
        alt: 'Discovery cover'
      },
      tracks: [
        { id: '1', title: 'One More Time', duration: 320, trackNumber: 1 },
        { id: '2', title: 'Aerodynamic', duration: 212, trackNumber: 2 },
        { id: '3', title: 'Digital Love', duration: 301, trackNumber: 3 },
        { id: '4', title: 'Harder, Better, Faster, Stronger', duration: 225, trackNumber: 4 },
        { id: '5', title: 'Crescendolls', duration: 209, trackNumber: 5 },
        { id: '6', title: 'Nightvision', duration: 104, trackNumber: 6 },
        { id: '7', title: 'Superheroes', duration: 237, trackNumber: 7 },
        { id: '8', title: 'High Life', duration: 202, trackNumber: 8 },
        { id: '9', title: 'Something About Us', duration: 232, trackNumber: 9 },
        { id: '10', title: 'Voyager', duration: 227, trackNumber: 10 },
        { id: '11', title: 'Veridis Quo', duration: 345, trackNumber: 11 },
        { id: '12', title: 'Short Circuit', duration: 206, trackNumber: 12 },
        { id: '13', title: 'Face to Face', duration: 244, trackNumber: 13 },
        { id: '14', title: 'Too Long', duration: 600, trackNumber: 14 }
      ],
      metadata: {
        totalDuration: 3664, // Total seconds  
        numberOfTracks: 14,
        format: 'Digital'
      }
    };

    // Dispatch the event with static demo data
    const fillEvent = new CustomEvent('fill-demo-recommendation', {
      detail: {
        sourceAlbum: exampleSourceAlbum,
        recommendedAlbum: exampleRecommendedAlbum,
        similarityRating: 8 // Example similarity rating
      }
    });

    // Small delay to ensure drawer is rendered
    setTimeout(() => {
      window.dispatchEvent(fillEvent);
    }, 300);
  }, []);

  return (
    <div 
      className="bg-zinc-800/95 backdrop-blur-sm border border-zinc-600 rounded-xl shadow-xl p-6 relative"
      style={{
        width: '360px',
        maxWidth: 'calc(100vw - 32px)',
        zIndex: 50, // Much lower z-index so it doesn't block search results
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{step.icon}</div>
          <div>
            <h3 className="text-lg font-semibold text-white">{step.title}</h3>
            <p className="text-sm text-zinc-400">
              Step {currentStep} of {totalSteps}
            </p>
          </div>
        </div>
        <button
          onClick={skipTour}
          className="text-zinc-400 hover:text-white text-sm"
        >
          Skip
        </button>
      </div>

      {/* Content */}
      <p className="text-zinc-300 mb-6 leading-relaxed">{step.content}</p>

      {/* Demo hint */}
      <div className="bg-zinc-700/50 rounded-lg p-4 mb-6">
        <p className="text-zinc-300 text-sm">
          ✨ <strong>Demo Mode:</strong> We've filled in some example albums to show you how the recommendation system works!
        </p>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center">
        <button
          onClick={prevStep}
          disabled={currentStep === 1}
          className="px-4 py-2 text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

// Rating Demo Card (Shows how to use the similarity rating dial)
const RatingDemoCard = ({ step, currentStep, totalSteps, nextStep, prevStep, skipTour, arrow }: CustomTourCardProps) => {
  const handleNext = () => {
    nextStep();
  };

  return (
    <div 
      className="bg-zinc-800/95 backdrop-blur-sm border border-zinc-600 rounded-xl shadow-xl p-4 relative"
      style={{
        width: '280px',
        maxWidth: 'calc(100vw - 40px)',
        maxHeight: 'calc(100vh - 40px)',
        zIndex: 50,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="text-xl">{step.icon}</div>
          <div>
            <h3 className="text-base font-semibold text-white">{step.title}</h3>
            <p className="text-xs text-zinc-400">
              Step {currentStep} of {totalSteps}
            </p>
          </div>
        </div>
        <button
          onClick={skipTour}
          className="text-zinc-400 hover:text-white text-xs"
        >
          Skip
        </button>
      </div>

      {/* Content */}
      <p className="text-zinc-300 mb-4 leading-relaxed text-sm">{step.content}</p>

      {/* Rating hint */}
      <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-700/50 rounded-lg p-3 mb-4">
        <p className="text-yellow-300 text-xs">
          <strong>💡 Tip:</strong> Drag or click to adjust!
        </p>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center">
        <button
          onClick={prevStep}
          disabled={currentStep === 1}
          className="px-3 py-1.5 text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          className="px-4 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors text-sm"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

// Submit Demo Card (Shows how to submit the recommendation)
const SubmitDemoCard = ({ step, currentStep, totalSteps, nextStep, prevStep, skipTour, arrow }: CustomTourCardProps) => {
  const handleNext = () => {
    nextStep();
  };

  return (
    <div 
      className="bg-zinc-800/95 backdrop-blur-sm border border-zinc-600 rounded-xl shadow-xl p-4 relative"
      style={{
        width: '280px',
        maxWidth: 'calc(100vw - 40px)',
        maxHeight: 'calc(100vh - 40px)',
        zIndex: 50,
        transform: 'translateY(-60px)', // Raise the card higher
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="text-xl">{step.icon}</div>
          <div>
            <h3 className="text-base font-semibold text-white">{step.title}</h3>
            <p className="text-xs text-zinc-400">
              Step {currentStep} of {totalSteps}
            </p>
          </div>
        </div>
        <button
          onClick={skipTour}
          className="text-zinc-400 hover:text-white text-xs"
        >
          Skip
        </button>
      </div>

      {/* Content */}
      <p className="text-zinc-300 mb-4 leading-relaxed text-sm">{step.content}</p>

      {/* Submit hint */}
      <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-700/50 rounded-lg p-3 mb-4">
        <p className="text-green-300 text-xs">
          <strong>🚀 Ready?</strong> Click the green play button!
        </p>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center">
        <button
          onClick={prevStep}
          disabled={currentStep === 1}
          className="px-3 py-1.5 text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm"
        >
          Continue
        </button>
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

// Discover Demo Card (Shows discovery features and closes the drawer)
const DiscoverDemoCard = ({ step, currentStep, totalSteps, nextStep, prevStep, skipTour, arrow }: CustomTourCardProps) => {
  const router = useRouter();
  
  const handleNext = () => {
    // Close the drawer first
    const closeEvent = new CustomEvent('close-recommendation-drawer');
    window.dispatchEvent(closeEvent);
    
    // End this tour and navigate
    if (skipTour) {
      skipTour(); // This ends the current tour
    }
    
    // Set a flag to start discovery tour on the browse page
    sessionStorage.setItem('start-discovery-tour', 'true');
    
    // Navigate to browse page
    router.push('/browse');
  };

  // Close the drawer when this step loads
  React.useEffect(() => {
    const closeEvent = new CustomEvent('close-recommendation-drawer');
    window.dispatchEvent(closeEvent);
  }, []);

  return (
    <div 
      className="bg-gradient-to-br from-purple-900/90 to-blue-900/90 backdrop-blur-sm border border-purple-500/50 rounded-xl shadow-xl p-5 relative"
      style={{
        width: '350px',
        maxWidth: 'calc(100vw - 40px)',
        maxHeight: 'calc(100vh - 40px)',
        zIndex: 50,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="text-xl animate-pulse">{step.icon}</div>
          <div>
            <h3 className="text-base font-semibold text-white">{step.title}</h3>
            <p className="text-xs text-purple-200 opacity-90">Step {currentStep + 1} of {totalSteps}</p>
          </div>
        </div>
        <button
          onClick={skipTour}
          className="text-purple-300 hover:text-white text-xs px-2 py-1 rounded transition-colors"
        >
          Skip Tour
        </button>
      </div>

      {/* Content */}
      <div className="text-purple-100 mb-4 text-sm leading-relaxed">
        {step.content}
      </div>
      
      {/* Discovery Features Preview */}
      <div className="mb-4 p-3 bg-white/10 border border-white/20 rounded-lg">
        <p className="text-xs font-medium text-purple-200 mb-2">🎵 What you'll find:</p>
        <div className="text-xs text-purple-100 space-y-1">
          <div>• Trending albums & artists</div>
          <div>• New user recommendations</div>
          <div>• Music discovery features</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center pt-3 border-t border-purple-500/30">
        <button
          onClick={prevStep}
          className="px-4 py-1.5 text-xs bg-purple-800/50 hover:bg-purple-700/70 text-purple-200 rounded-md transition-all"
        >
          ← Back
        </button>
        <button
          onClick={handleNext}
          className="px-4 py-1.5 text-xs bg-purple-600 hover:bg-purple-500 text-white rounded-md transition-all font-medium"
        >
          Go to Discovery →
        </button>
      </div>
    </div>
  );
};

// Discovery Overview Card (General page overview after navigation)
const DiscoveryOverviewCard = ({ step, currentStep, totalSteps, nextStep, prevStep, skipTour, arrow }: CustomTourCardProps) => {
  console.log('🎯 DiscoveryOverviewCard is rendering!');
  
  const handleNext = () => {
    nextStep();
  };

  return (
    <div 
      className="bg-gradient-to-br from-indigo-600 to-purple-700 border-2 border-indigo-400 rounded-xl p-4 relative shadow-2xl overflow-y-auto"
      style={{
        width: '380px',
        maxWidth: 'calc(100vw - 20px)',
        maxHeight: 'calc(100vh - 20px)',
        zIndex: 99999,
        position: 'fixed',
        top: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
      }}
    >
      {arrow}
      
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="text-xl animate-bounce">{step.icon}</div>
          <div>
            <h3 className="text-base font-bold text-white">{step.title}</h3>
            <p className="text-xs text-indigo-200 opacity-90">Step {currentStep + 1} of {totalSteps}</p>
          </div>
        </div>
        <button
          onClick={skipTour}
          className="text-indigo-300 hover:text-white text-xs px-2 py-1 rounded-md hover:bg-white/10 transition-all"
        >
          Skip
        </button>
      </div>

      {/* Content */}
      <div className="text-indigo-100 mb-4 text-sm leading-relaxed">
        {step.content}
      </div>
      
      {/* Feature Highlights - More compact */}
      <div className="mb-4 p-3 bg-white/10 border border-white/20 rounded-lg">
        <p className="text-sm font-semibold text-indigo-200 mb-2 flex items-center gap-2">
          <span>🚀</span> What you can explore:
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs text-indigo-100">
          <div className="flex items-center gap-1">
            <span className="text-yellow-400">🔥</span>
            <span>Hot Albums</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-green-400">👥</span>
            <span>New Users</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-blue-400">🎯</span>
            <span>Recs</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-purple-400">✨</span>
            <span>Artists</span>
          </div>
        </div>
      </div>

      {/* Encouraging message - More compact */}
      <div className="mb-4 p-2 bg-gradient-to-r from-green-900/30 to-blue-900/30 border border-green-500/30 rounded-lg">
        <p className="text-xs text-green-200 text-center">
          💡 <strong>Tip:</strong> Click any album for details & recommendations!
        </p>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center pt-3 border-t border-indigo-500/30">
        <button
          onClick={prevStep}
          className="px-4 py-2 text-sm bg-indigo-800/50 hover:bg-indigo-700/70 text-indigo-200 rounded-lg transition-all"
        >
          ← Back
        </button>
        <button
          onClick={handleNext}
          className="px-4 py-2 text-sm bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white rounded-lg transition-all font-semibold shadow-lg"
        >
          Got it! →
        </button>
      </div>
    </div>
  );
};



// Main router component
export const CustomTourCard = (props: CustomTourCardProps) => {
  const { step } = props;

  console.log('🎯 CustomTourCard called with step:', step.title, 'icon:', step.icon);

  // Route to specific card component based on step characteristics
  // NOTE: More specific conditions should come first!
  
  if (step.title?.includes('Welcome to Discovery') && step.icon === '🎵') {
    console.log('🎯 Routing to DiscoveryOverviewCard');
    return <DiscoveryOverviewCard {...props} />;
  }
  
  if (step.title?.includes('Welcome') && step.icon === '🎵') {
    console.log('🎯 Routing to WelcomeModalCard');
    return <WelcomeModalCard {...props} />;
  }
  
  if (step.title?.includes('Share Your Music Taste') && step.icon === '🎤') {
    return <ShareMusicTourCard {...props} />;
  }
  
  if (step.title?.includes('Create Your First Recommendation') && step.icon === '✨') {
    return <RecommendationDrawerCard {...props} />;
  }
  
  if (step.title?.includes('Demo Recommendation') && step.icon === '🎯') {
    return <SearchDemoCard {...props} />;
  }
  
  if (step.title?.includes('Your Profile') && step.icon === '👤') {
    return <AvatarTourCard {...props} />;
  }
  
  if ((step.title?.includes('Build Your Collection') || step.title?.includes('Building Collections')) && step.icon === '📚') {
    return <CollectionTourCard {...props} />;
  }

  if (step.title?.includes('Rate the Similarity') && step.icon === '⭐') {
    return <RatingDemoCard {...props} />;
  }
  
  if (step.title?.includes('Submit Your Recommendation') && step.icon === '🚀') {
    return <SubmitDemoCard {...props} />;
  }

  if (step.title?.includes('Discover New Music') && step.icon === '🌟') {
    return <DiscoverDemoCard {...props} />;
  }

  // Default to standard card
  console.log('🎯 Routing to StandardTourCard (default)');
  return <StandardTourCard {...props} />;
}; 