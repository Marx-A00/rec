'use client';

import { useState } from 'react';

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

  const isDev = process.env.NODE_ENV === 'development';

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

      {/* Content */}
      <div className='relative z-20 w-full max-w-sm px-4 py-4 h-full flex justify-center items-center'>
        <div className='w-full max-h-[90dvh] overflow-y-auto scrollbar-hide overscroll-contain'>
          {children}
        </div>
      </div>

      {/* Dev Panel - only in development */}
      {isDev && <RippleDevPanel config={config} onChange={setConfig} />}
    </div>
  );
}
