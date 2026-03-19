'use client';

import { useState } from 'react';
import { Archive, Play } from 'lucide-react';

import { MobileButton } from '@/components/mobile/MobileButton';
import { SmokeBackground } from '@/components/ui/smoke-background';

const SMOKE_COLORS = [
  { name: 'Gray', value: '#808080' },
  { name: 'Emerald', value: '#0d9668' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'White', value: '#e4e4e7' },
] as const;

const FROST_TINTS = [
  { name: 'None', value: 'transparent' },
  { name: 'White', value: 'rgba(255,255,255,0.08)' },
  { name: 'White+', value: 'rgba(255,255,255,0.15)' },
  { name: 'Emerald', value: 'rgba(16,185,129,0.12)' },
  { name: 'Emerald+', value: 'rgba(16,185,129,0.25)' },
  { name: 'Dark', value: 'rgba(0,0,0,0.3)' },
  { name: 'Dark+', value: 'rgba(0,0,0,0.5)' },
] as const;

const BLUR_LEVELS = [
  { name: 'None', value: 'backdrop-blur-none' },
  { name: 'SM', value: 'backdrop-blur-sm' },
  { name: 'MD', value: 'backdrop-blur-md' },
  { name: 'LG', value: 'backdrop-blur-lg' },
  { name: 'XL', value: 'backdrop-blur-xl' },
  { name: '2XL', value: 'backdrop-blur-2xl' },
] as const;

const SPEED_OPTIONS = [
  { name: 'Slow', value: 0.01 },
  { name: 'Med', value: 0.025 },
  { name: 'Fast', value: 0.05 },
  { name: 'Turbo', value: 0.1 },
] as const;

export function TestUIClient() {
  const [smokeColor, setSmokeColor] = useState('#0d9668');
  const [frostTint, setFrostTint] = useState('rgba(16,185,129,0.12)');
  const [blur, setBlur] = useState('backdrop-blur-md');
  const [speed, setSpeed] = useState(0.1);
  const [smokeOpacity, setSmokeOpacity] = useState(50);

  return (
    <div className='flex h-full flex-col items-center justify-center gap-6 px-6'>
      {/* Placeholder image — same position as the album cover */}
      <div className='w-full max-w-[200px]'>
        <div className='aspect-square w-full overflow-hidden rounded-lg bg-zinc-800/60 border border-zinc-700/50 flex items-center justify-center'>
          <span className='text-zinc-500 text-xs'>Album Cover</span>
        </div>
      </div>

      {/* Description — same spot as game description */}
      <p className='text-center text-sm text-zinc-400'>
        Guess the album from its cover art. 4 attempts. New puzzle daily.
      </p>

      {/* Button preview — same layout as Play + Archive on game page */}
      <div className='flex w-full max-w-xs flex-col gap-3'>
        {/* Frosted smoke button */}
        <button className='relative w-full overflow-hidden rounded-xl h-14 active:scale-[0.98] transition-transform'>
          {/* Live smoke inside the button */}
          <div
            className='absolute inset-0'
            style={{ opacity: smokeOpacity / 100 }}
          >
            <SmokeBackground
              smokeColor={smokeColor}
              speed={speed}
              density={4.0}
            />
          </div>

          {/* Frosted glass overlay */}
          <div
            className={`absolute inset-0 ${blur} border border-white/[0.15] rounded-xl`}
            style={{ backgroundColor: frostTint }}
          />

          {/* Button content */}
          <div className='relative z-10 flex items-center justify-center gap-2 text-white font-semibold text-base'>
            <Play className='h-5 w-5 fill-current' />
            Play
          </div>
        </button>

        <MobileButton
          variant='outline'
          size='lg'
          fullWidth
          leftIcon={<Archive className='h-4 w-4' />}
        >
          Archive
        </MobileButton>
      </div>

      {/* Controls */}
      <div className='w-full max-w-xs rounded-xl bg-zinc-900/70 p-4 backdrop-blur-sm'>
        {/* Smoke color */}
        <p className='mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400'>
          Smoke Color
        </p>
        <div className='mb-4 flex flex-wrap gap-2'>
          {SMOKE_COLORS.map(c => (
            <button
              key={c.value}
              onClick={() => setSmokeColor(c.value)}
              className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${
                smokeColor === c.value
                  ? 'scale-110 border-white'
                  : 'border-zinc-600'
              }`}
              style={{ backgroundColor: c.value }}
              title={c.name}
            />
          ))}
          <input
            type='color'
            value={smokeColor}
            onChange={e => setSmokeColor(e.target.value)}
            className='h-7 w-7 rounded cursor-pointer'
            title='Custom'
          />
        </div>

        {/* Frost tint */}
        <p className='mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400'>
          Frost Tint
        </p>
        <div className='mb-4 flex flex-wrap gap-1.5'>
          {FROST_TINTS.map(t => (
            <button
              key={t.name}
              onClick={() => setFrostTint(t.value)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                frostTint === t.value
                  ? 'bg-white text-black'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>

        {/* Blur */}
        <p className='mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400'>
          Blur
        </p>
        <div className='mb-4 flex flex-wrap gap-1.5'>
          {BLUR_LEVELS.map(b => (
            <button
              key={b.value}
              onClick={() => setBlur(b.value)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                blur === b.value
                  ? 'bg-white text-black'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>

        {/* Speed */}
        <p className='mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400'>
          Smoke Speed
        </p>
        <div className='mb-4 flex flex-wrap gap-1.5'>
          {SPEED_OPTIONS.map(s => (
            <button
              key={s.value}
              onClick={() => setSpeed(s.value)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                speed === s.value
                  ? 'bg-white text-black'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>

        {/* Smoke opacity */}
        <p className='mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400'>
          Smoke Opacity — {smokeOpacity}%
        </p>
        <input
          type='range'
          min={10}
          max={100}
          step={5}
          value={smokeOpacity}
          onChange={e => setSmokeOpacity(parseInt(e.target.value))}
          className='w-full accent-emerald-500'
        />
      </div>
    </div>
  );
}
