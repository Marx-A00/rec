'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';

import SocialActivityFeed from '@/components/feed/SocialActivityFeed';
import {
  ScoreColorOverrideContext,
  type ScoreColorFn,
} from '@/components/feed/ScoreColorOverrideContext';

const colorOptions: { name: string; description: string; fn: ScoreColorFn }[] =
  [
    {
      name: 'Current',
      description: 'Pastel /10 on dark — nearly invisible',
      fn: (score: number) => {
        if (score >= 10)
          return {
            heartColor: 'text-red-500 fill-red-500',
            textColor: 'text-red-600',
            bgGradient: 'from-red-50/10 to-pink-50/10',
            borderColor: 'border-red-500/30',
          };
        if (score >= 8)
          return {
            heartColor: 'text-emeraled-green fill-emeraled-green',
            textColor: 'text-emeraled-green',
            bgGradient: 'from-green-50/10 to-emerald-50/10',
            borderColor: 'border-emeraled-green/30',
          };
        return {
          heartColor: 'text-yellow-500 fill-yellow-500',
          textColor: 'text-yellow-600',
          bgGradient: 'from-yellow-50/10 to-amber-50/10',
          borderColor: 'border-yellow-500/30',
        };
      },
    },
    {
      name: 'A: Color /20 gradient',
      description: 'Score color at 20% opacity',
      fn: (score: number) => {
        if (score >= 10)
          return {
            heartColor: 'text-red-500 fill-red-500',
            textColor: 'text-red-500',
            bgGradient: 'from-red-500/20 to-pink-500/20',
            borderColor: 'border-red-500/30',
          };
        if (score >= 8)
          return {
            heartColor: 'text-emerald-500 fill-emerald-500',
            textColor: 'text-emerald-500',
            bgGradient: 'from-emerald-500/20 to-green-500/20',
            borderColor: 'border-emerald-500/30',
          };
        return {
          heartColor: 'text-yellow-500 fill-yellow-500',
          textColor: 'text-yellow-500',
          bgGradient: 'from-yellow-500/20 to-amber-500/20',
          borderColor: 'border-yellow-500/30',
        };
      },
    },
    {
      name: 'B: Solid /15',
      description: 'Solid score color at 15% opacity',
      fn: (score: number) => {
        if (score >= 10)
          return {
            heartColor: 'text-red-500 fill-red-500',
            textColor: 'text-red-500',
            bgGradient: 'from-red-500/15 to-red-500/15',
            borderColor: 'border-red-500/30',
          };
        if (score >= 8)
          return {
            heartColor: 'text-emerald-500 fill-emerald-500',
            textColor: 'text-emerald-500',
            bgGradient: 'from-emerald-500/15 to-emerald-500/15',
            borderColor: 'border-emerald-500/30',
          };
        return {
          heartColor: 'text-yellow-500 fill-yellow-500',
          textColor: 'text-yellow-500',
          bgGradient: 'from-yellow-500/15 to-yellow-500/15',
          borderColor: 'border-yellow-500/30',
        };
      },
    },
    {
      name: 'C: Deep 900 /60',
      description: 'Dark saturated tones at 60% opacity',
      fn: (score: number) => {
        if (score >= 10)
          return {
            heartColor: 'text-red-500 fill-red-500',
            textColor: 'text-red-500',
            bgGradient: 'from-red-900/60 to-pink-900/60',
            borderColor: 'border-red-500/30',
          };
        if (score >= 8)
          return {
            heartColor: 'text-emerald-500 fill-emerald-500',
            textColor: 'text-emerald-500',
            bgGradient: 'from-emerald-900/60 to-green-900/60',
            borderColor: 'border-emerald-500/30',
          };
        return {
          heartColor: 'text-yellow-500 fill-yellow-500',
          textColor: 'text-yellow-500',
          bgGradient: 'from-yellow-900/60 to-amber-900/60',
          borderColor: 'border-yellow-500/30',
        };
      },
    },
    {
      name: 'D: Color /25 + strong border',
      description: '25% gradient with 50% border',
      fn: (score: number) => {
        if (score >= 10)
          return {
            heartColor: 'text-red-500 fill-red-500',
            textColor: 'text-red-400',
            bgGradient: 'from-red-500/25 to-pink-500/15',
            borderColor: 'border-red-500/50',
          };
        if (score >= 8)
          return {
            heartColor: 'text-emerald-500 fill-emerald-500',
            textColor: 'text-emerald-400',
            bgGradient: 'from-emerald-500/25 to-green-500/15',
            borderColor: 'border-emerald-500/50',
          };
        return {
          heartColor: 'text-yellow-500 fill-yellow-500',
          textColor: 'text-yellow-400',
          bgGradient: 'from-yellow-500/25 to-amber-500/15',
          borderColor: 'border-yellow-500/50',
        };
      },
    },
    {
      name: 'E: Solid 950 + colored border',
      description: 'Darkest Tailwind shade with colored border',
      fn: (score: number) => {
        if (score >= 10)
          return {
            heartColor: 'text-red-500 fill-red-500',
            textColor: 'text-red-400',
            bgGradient: 'from-red-950 to-red-950',
            borderColor: 'border-red-500/40',
          };
        if (score >= 8)
          return {
            heartColor: 'text-emerald-500 fill-emerald-500',
            textColor: 'text-emerald-400',
            bgGradient: 'from-emerald-950 to-emerald-950',
            borderColor: 'border-emerald-500/40',
          };
        return {
          heartColor: 'text-yellow-500 fill-yellow-500',
          textColor: 'text-yellow-400',
          bgGradient: 'from-yellow-950 to-yellow-950',
          borderColor: 'border-yellow-500/40',
        };
      },
    },
  ];

export default function ScoreColorsDevPage() {
  const [selected, setSelected] = useState(0);

  return (
    <div className='min-h-screen bg-zinc-950'>
      {/* Sticky selector bar */}
      <div className='sticky top-0 z-50 bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800 p-4'>
        <h1 className='text-lg font-bold text-white mb-3'>
          Score Badge Color Comparison
        </h1>
        <div className='flex flex-wrap gap-2'>
          {colorOptions.map((opt, i) => (
            <button
              key={opt.name}
              onClick={() => setSelected(i)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                selected === i
                  ? 'bg-white text-black'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {opt.name}
            </button>
          ))}
        </div>
        <p className='text-xs text-zinc-500 mt-2'>
          {colorOptions[selected].description}
        </p>

        {/* Preview swatches for selected option */}
        <div className='flex items-center gap-3 mt-3'>
          {[5, 7, 8, 9, 10].map(score => {
            const colors = colorOptions[selected].fn(score);
            return (
              <div key={score} className='flex items-center gap-1.5'>
                <div
                  className={`flex items-center justify-center w-8 h-8 bg-linear-to-r ${colors.bgGradient} rounded-full border-2 ${colors.borderColor}`}
                >
                  <div className='flex flex-col items-center'>
                    <Heart className={`h-2 w-2 ${colors.heartColor} mb-0.5`} />
                    <span
                      className={`text-[8px] font-bold ${colors.textColor} leading-none`}
                    >
                      {score}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feed with selected color override */}
      <div className='max-w-2xl mx-auto p-4'>
        <ScoreColorOverrideContext.Provider value={colorOptions[selected].fn}>
          <SocialActivityFeed key={selected} />
        </ScoreColorOverrideContext.Provider>
      </div>
    </div>
  );
}
