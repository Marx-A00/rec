'use client';

import { useState, useEffect } from 'react';

import { RippleDevPanel } from '@/components/dev/RippleDevPanel';
import { Ripple } from '@/components/ui/ripple';

interface RippleConfig {
  mainCircleSize: number;
  mainCircleOpacity: number;
  numCircles: number;
  color: string;
  accentColor: string;
  accentPattern:
    | 'none'
    | 'every-3rd'
    | 'every-4th'
    | 'random-10'
    | 'random-20'
    | 'random-30';
  accentColor2: string;
  randomSeed: number;
}

const DEFAULT_CONFIG: RippleConfig = {
  mainCircleSize: 210,
  mainCircleOpacity: 0.3,
  numCircles: 14,
  color: '#FFFBEB',
  accentColor: '#EF4444',
  accentPattern: 'none',
  accentColor2: '#000000',
  randomSeed: 42,
};

export function AuthLayoutClient({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<RippleConfig>(DEFAULT_CONFIG);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const isDev = process.env.NODE_ENV === 'development';

  // Handle keyboard visibility on mobile devices
  useEffect(() => {
    // Detect keyboard visibility via visual viewport API (best mobile support)
    const handleViewportResize = () => {
      if (typeof window !== 'undefined' && window.visualViewport) {
        const viewportHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;
        // Keyboard is likely visible if viewport is significantly smaller than window
        setIsKeyboardVisible(viewportHeight < windowHeight * 0.75);
      }
    };

    // Handle focus events to scroll inputs into view
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      ) {
        // Delay to allow keyboard to appear
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    };

    // Subscribe to visual viewport changes
    if (typeof window !== 'undefined' && window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize);
    }

    // Subscribe to focus events
    document.addEventListener('focusin', handleFocusIn);

    return () => {
      if (typeof window !== 'undefined' && window.visualViewport) {
        window.visualViewport.removeEventListener(
          'resize',
          handleViewportResize
        );
      }
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, []);

  return (
    <div className='relative min-h-screen min-h-dvh bg-black flex items-center justify-center overflow-hidden'>
      {/* Ripple Background */}
      <Ripple
        className='absolute top-60 left-5'
        mainCircleSize={config.mainCircleSize}
        mainCircleOpacity={config.mainCircleOpacity}
        numCircles={config.numCircles}
        color={config.color}
        accentColor={config.accentColor}
        accentPattern={config.accentPattern}
        accentColor2={config.accentColor2}
        randomSeed={config.randomSeed}
      />

      {/* Gradient overlay to ensure content readability */}
      <div className='absolute inset-0 z-10 bg-gradient-to-t from-black/60 via-black/20 to-black/40' />

      {/* Content - Adjusts position when keyboard is visible */}
      <div
        className={`relative z-20 w-full max-w-sm px-4 py-4 h-full flex justify-center transition-all duration-300 ${
          isKeyboardVisible ? 'items-start pt-8' : 'items-center'
        }`}
      >
        <div className='w-full max-h-[90dvh] overflow-y-auto scrollbar-hide overscroll-contain'>
          {children}
        </div>
      </div>

      {/* Dev Panel - only in development */}
      {isDev && <RippleDevPanel config={config} onChange={setConfig} />}
    </div>
  );
}
