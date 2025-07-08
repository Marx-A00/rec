// src/components/tour-cards/AvatarTourCard.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Step } from 'nextstepjs';

interface AvatarTourCardProps {
  step: Step;
  currentStep: number;
  totalSteps: number;
  nextStep: () => void;
  prevStep: () => void;
  skipTour?: () => void;
  arrow: React.ReactNode;
}

export const AvatarTourCard = ({
  step,
  currentStep,
  totalSteps,
  nextStep,
  prevStep,
  skipTour,
  arrow,
}: AvatarTourCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 100, left: 24 });
  const [forceUpdate, setForceUpdate] = useState(0);

  // Force re-calculation on mount and step changes
  useEffect(() => {
    console.log(
      '🔄 Avatar positioning effect triggered, currentStep:',
      currentStep
    );

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      calculatePosition();
    }, 50);

    return () => clearTimeout(timer);
  }, [currentStep, forceUpdate]);

  const calculatePosition = () => {
    // Try to find the avatar element and position relative to it
    const avatarElement = document.querySelector('#user-profile-menu');

    console.log('🎯 Avatar element found:', avatarElement);

    if (avatarElement) {
      const rect = avatarElement.getBoundingClientRect();
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      };

      console.log('📏 Avatar rect:', rect);
      console.log('📱 Viewport:', viewport);

      // Calculate position MUCH closer to avatar
      let newTop = rect.bottom + 4; // Only 4px below avatar (was 12px)
      let newLeft = rect.left - 8; // Slightly overlap to the left for closeness

      console.log('🎯 Initial calculated position:', { newTop, newLeft });

      // Adjust if going off right edge
      if (newLeft + 320 > viewport.width) {
        newLeft = rect.right - 320; // Align right edge with avatar right
        console.log('⚠️ Adjusted for right edge overflow, newLeft:', newLeft);
      }

      // Adjust if going off left edge
      if (newLeft < 8) {
        newLeft = 8;
        console.log('⚠️ Adjusted for left edge overflow, newLeft:', newLeft);
      }

      // If no room below (higher priority), show it to the right side instead
      if (newTop + 180 > viewport.height) {
        console.log('⚠️ No room below, trying right side positioning');
        newTop = rect.top - 4; // Align with top of avatar minus small offset
        newLeft = rect.right + 8; // 8px to the right of avatar

        // If no room to the right either, go above
        if (newLeft + 320 > viewport.width) {
          console.log('⚠️ No room to right either, going above');
          newTop = rect.top - 180 - 8; // Show above avatar
          newLeft = rect.left - 8;
        }
      }

      // Final safety: ensure it doesn't go above screen
      if (newTop < 8) {
        newTop = 8;
        console.log('⚠️ Adjusted for top edge overflow, newTop:', newTop);
      }

      const finalPosition = { top: newTop, left: newLeft };
      console.log('🎯 FINAL POSITION:', finalPosition);

      setPosition(finalPosition);

      console.log('Avatar card positioned:', {
        avatarRect: rect,
        viewport,
        finalPosition,
        strategy:
          newTop < rect.top
            ? 'above'
            : newLeft > rect.right
              ? 'right'
              : 'below',
      });
    } else {
      // Fallback if avatar not found - much higher than before
      console.warn('❌ Avatar element not found, using fallback position');
      const fallbackPosition = { top: 60, left: 16 };
      console.log('🎯 FALLBACK POSITION:', fallbackPosition);
      setPosition(fallbackPosition);
    }
  };

  const handleSkip = () => {
    if (skipTour) skipTour();
  };

  return (
    <div
      ref={cardRef}
      className='bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-6 transition-all duration-300'
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 1001,
        maxWidth: '320px',
        minWidth: '280px',
        // Add a subtle glow to make it stand out
        boxShadow:
          '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(34, 197, 94, 0.2)',
      }}
    >
      {/* Custom arrow pointing to avatar */}
      <div
        className='absolute w-4 h-4 bg-zinc-900 border-l border-t border-zinc-700 transform rotate-45'
        style={{
          top: '-8px',
          left: '32px',
        }}
      />

      {/* Header with profile icon and title */}
      <div className='flex items-center gap-3 mb-4'>
        <div className='text-4xl animate-pulse'>{step.icon}</div>
        <div className='flex-1'>
          <h3 className='text-xl font-bold text-white leading-tight'>
            {step.title}
          </h3>
          <p className='text-xs text-emerald-400 font-medium'>
            Profile Management
          </p>
          {/* Debug info */}
          <p className='text-xs text-zinc-500 font-mono'>
            Position: top={position.top}px, left={position.left}px
          </p>
        </div>
        {/* Debug button */}
        <button
          onClick={() => {
            console.log('🔄 Force recalculating position...');
            setForceUpdate(prev => prev + 1);
          }}
          className='px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-400 text-xs rounded'
          title='Recalculate position'
        >
          📍
        </button>
      </div>

      {/* Content with better formatting */}
      <div className='text-zinc-300 mb-6 leading-relaxed text-sm'>
        {step.content}

        {/* Add some helpful hints */}
        <div className='mt-4 p-3 bg-zinc-800/50 rounded-lg border-l-2 border-emerald-500'>
          <p className='text-xs text-zinc-400'>
            💡 <strong className='text-emerald-400'>Tip:</strong> Your avatar
            shows your music taste and helps others discover you!
          </p>
        </div>
      </div>

      {/* Progress indicator */}
      <div className='flex items-center gap-2 mb-6'>
        <div className='flex-1 bg-zinc-800 rounded-full h-2'>
          <div
            className='bg-gradient-to-r from-emerald-500 to-emerald-400 h-2 rounded-full transition-all duration-500'
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>
        <span className='text-xs text-zinc-500 font-medium'>
          {currentStep + 1} / {totalSteps}
        </span>
      </div>

      {/* Action buttons */}
      <div className='flex gap-3'>
        {currentStep > 0 && (
          <button
            onClick={prevStep}
            className='flex-1 px-4 py-3 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-sm rounded-lg transition-all font-medium border border-zinc-600 hover:border-zinc-500'
          >
            ← Previous
          </button>
        )}

        <button
          onClick={nextStep}
          className='flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white text-sm rounded-lg transition-all font-semibold shadow-lg hover:shadow-emerald-500/25'
        >
          {currentStep === totalSteps - 1 ? 'Finish Tour! 🎉' : 'Next →'}
        </button>
      </div>

      {/* Skip option */}
      {step.showSkip && skipTour && (
        <button
          onClick={handleSkip}
          className='w-full mt-3 px-3 py-2 text-zinc-400 hover:text-zinc-300 text-sm transition-colors border-t border-zinc-800 pt-4'
        >
          Skip this tour
        </button>
      )}
    </div>
  );
};
