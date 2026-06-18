'use client';

import { useState } from 'react';

import ArcadeButton from '@/components/ui/ArcadeButton';

const PRESET_SWATCHES = [
  '#CC4B24',
  '#10b981',
  '#3b82f6',
  '#a855f7',
  '#eab308',
  '#ec4899',
  '#f97316',
  '#14b8a6',
];

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function ArcadeButtonPlayground() {
  const [color, setColor] = useState('#CC4B24');
  const [draftHex, setDraftHex] = useState('#CC4B24');
  const [showButton, setShowButton] = useState(true);

  const commitHex = (value: string) => {
    setDraftHex(value);
    if (HEX_RE.test(value)) setColor(value);
  };

  return (
    <div className='flex min-h-screen flex-col items-center gap-10 bg-black px-6 py-10 text-white'>
      <div className='text-center'>
        <h1 className='text-xl font-bold text-cosmic-latte'>
          Arcade Button — Customization Preview
        </h1>
        <p className='mt-1 text-sm text-zinc-500'>
          Prototype only. Nothing is saved.
        </p>
      </div>

      {/* Live preview */}
      <div className='flex min-h-[220px] items-center justify-center'>
        {showButton ? (
          <ArcadeButton color={color} />
        ) : (
          <p className='text-sm text-zinc-600'>Button hidden</p>
        )}
      </div>

      {/* Controls */}
      <div className='w-full max-w-sm space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5'>
        {/* Show / hide */}
        <label className='flex items-center justify-between text-sm text-zinc-200'>
          <span>Show button</span>
          <input
            type='checkbox'
            checked={showButton}
            onChange={e => setShowButton(e.target.checked)}
            className='h-4 w-4 accent-dark-pastel-red'
          />
        </label>

        {/* Color picker */}
        <div className='space-y-3'>
          <span className='text-sm font-medium text-zinc-200'>Button color</span>

          <div className='flex items-center gap-3'>
            <input
              type='color'
              value={color}
              onChange={e => commitHex(e.target.value)}
              className='h-10 w-14 cursor-pointer rounded-md border border-zinc-600 bg-transparent'
              aria-label='Pick button color'
            />
            <input
              type='text'
              value={draftHex}
              onChange={e => commitHex(e.target.value)}
              spellCheck={false}
              className='w-32 rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 font-mono text-sm uppercase text-white focus:outline-hidden focus:ring-2 focus:ring-cosmic-latte'
              placeholder='#CC4B24'
            />
          </div>

          {/* Quick swatches */}
          <div className='flex flex-wrap gap-2'>
            {PRESET_SWATCHES.map(swatch => (
              <button
                key={swatch}
                type='button'
                onClick={() => {
                  setColor(swatch);
                  setDraftHex(swatch);
                }}
                style={{ backgroundColor: swatch }}
                className={`h-7 w-7 rounded-full ring-2 transition-transform active:scale-90 ${
                  color.toLowerCase() === swatch.toLowerCase()
                    ? 'ring-white'
                    : 'ring-transparent'
                }`}
                aria-label={`Use ${swatch}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
