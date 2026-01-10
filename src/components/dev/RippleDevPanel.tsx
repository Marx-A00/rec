'use client';

import React, { useState } from 'react';

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

interface RippleDevPanelProps {
  config: RippleConfig;
  onChange: (config: RippleConfig) => void;
}

const PRESET_COLORS = [
  { name: 'Cosmic Latte', value: '#FFFBEB' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Dark Red', value: '#991B1B' },
  { name: 'Black', value: '#000000' },
  { name: 'Purple', value: '#A855F7' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Cyan', value: '#06B6D4' },
];

const ACCENT_PATTERNS = [
  { value: 'none', label: 'None' },
  { value: 'every-3rd', label: 'Every 3rd' },
  { value: 'every-4th', label: 'Every 4th' },
  { value: 'random-10', label: 'Random 10%' },
  { value: 'random-20', label: 'Random 20%' },
  { value: 'random-30', label: 'Random 30%' },
] as const;

export function RippleDevPanel({ config, onChange }: RippleDevPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCode, setShowCode] = useState(false);

  const updateConfig = (key: keyof RippleConfig, value: string | number) => {
    onChange({ ...config, [key]: value });
  };

  const generateCode = () => {
    const props: string[] = [];
    if (config.mainCircleSize !== 210)
      props.push(`mainCircleSize={${config.mainCircleSize}}`);
    if (config.mainCircleOpacity !== 0.3)
      props.push(`mainCircleOpacity={${config.mainCircleOpacity}}`);
    if (config.numCircles !== 14)
      props.push(`numCircles={${config.numCircles}}`);
    if (config.color !== '#FFFBEB') props.push(`color='${config.color}'`);
    if (config.accentPattern !== 'none') {
      props.push(`accentColor='${config.accentColor}'`);
      props.push(`accentPattern='${config.accentPattern}'`);
      if (config.accentColor2 && config.accentColor2 !== '#000000') {
        props.push(`accentColor2='${config.accentColor2}'`);
      }
      if (config.randomSeed !== 42)
        props.push(`randomSeed={${config.randomSeed}}`);
    }

    return `<Ripple
  className='absolute top-60 left-5'
  ${props.join('\n  ')}
/>`;
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className='fixed bottom-4 right-4 z-50 bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 rounded-lg text-sm font-medium border border-zinc-600 shadow-lg transition-colors'
      >
        Ripple Dev
      </button>
    );
  }

  return (
    <div className='fixed bottom-4 right-4 z-50 w-80 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden'>
      {/* Header */}
      <div className='flex items-center justify-between px-4 py-3 bg-zinc-800 border-b border-zinc-700'>
        <h3 className='text-sm font-semibold text-white'>Ripple Config</h3>
        <button
          onClick={() => setIsOpen(false)}
          className='text-zinc-400 hover:text-white transition-colors'
        >
          <svg
            className='w-5 h-5'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M6 18L18 6M6 6l12 12'
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className='p-4 space-y-4 max-h-[70vh] overflow-y-auto'>
        {/* Basic Settings */}
        <div className='space-y-3'>
          <h4 className='text-xs font-medium text-zinc-400 uppercase tracking-wide'>
            Basic
          </h4>

          <div>
            <label className='flex justify-between text-xs text-zinc-300 mb-1'>
              <span>Circles</span>
              <span className='text-zinc-500'>{config.numCircles}</span>
            </label>
            <input
              type='range'
              min={4}
              max={24}
              value={config.numCircles}
              onChange={e =>
                updateConfig('numCircles', parseInt(e.target.value))
              }
              className='w-full accent-cosmic-latte'
            />
          </div>

          <div>
            <label className='flex justify-between text-xs text-zinc-300 mb-1'>
              <span>Size</span>
              <span className='text-zinc-500'>{config.mainCircleSize}px</span>
            </label>
            <input
              type='range'
              min={50}
              max={400}
              step={10}
              value={config.mainCircleSize}
              onChange={e =>
                updateConfig('mainCircleSize', parseInt(e.target.value))
              }
              className='w-full accent-cosmic-latte'
            />
          </div>

          <div>
            <label className='flex justify-between text-xs text-zinc-300 mb-1'>
              <span>Opacity</span>
              <span className='text-zinc-500'>{config.mainCircleOpacity}</span>
            </label>
            <input
              type='range'
              min={0.1}
              max={1}
              step={0.05}
              value={config.mainCircleOpacity}
              onChange={e =>
                updateConfig('mainCircleOpacity', parseFloat(e.target.value))
              }
              className='w-full accent-cosmic-latte'
            />
          </div>

          <div>
            <label className='text-xs text-zinc-300 mb-2 block'>
              Main Color
            </label>
            <div className='flex flex-wrap gap-2'>
              {PRESET_COLORS.map(c => (
                <button
                  key={c.value}
                  onClick={() => updateConfig('color', c.value)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                    config.color === c.value
                      ? 'border-white scale-110'
                      : 'border-zinc-600'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
              <input
                type='color'
                value={config.color}
                onChange={e => updateConfig('color', e.target.value)}
                className='w-6 h-6 rounded cursor-pointer'
                title='Custom color'
              />
            </div>
          </div>
        </div>

        {/* Accent Settings */}
        <div className='space-y-3 pt-2 border-t border-zinc-700'>
          <h4 className='text-xs font-medium text-zinc-400 uppercase tracking-wide'>
            Accent
          </h4>

          <div>
            <label className='text-xs text-zinc-300 mb-2 block'>Pattern</label>
            <select
              value={config.accentPattern}
              onChange={e =>
                updateConfig(
                  'accentPattern',
                  e.target.value as RippleConfig['accentPattern']
                )
              }
              className='w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cosmic-latte'
            >
              {ACCENT_PATTERNS.map(p => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {config.accentPattern !== 'none' && (
            <>
              <div>
                <label className='text-xs text-zinc-300 mb-2 block'>
                  Accent Color 1
                </label>
                <div className='flex flex-wrap gap-2'>
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c.value}
                      onClick={() => updateConfig('accentColor', c.value)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                        config.accentColor === c.value
                          ? 'border-white scale-110'
                          : 'border-zinc-600'
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
                  ))}
                  <input
                    type='color'
                    value={config.accentColor}
                    onChange={e => updateConfig('accentColor', e.target.value)}
                    className='w-6 h-6 rounded cursor-pointer'
                    title='Custom color'
                  />
                </div>
              </div>

              <div>
                <label className='text-xs text-zinc-300 mb-2 block'>
                  Accent Color 2 (optional)
                </label>
                <div className='flex flex-wrap gap-2'>
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c.value}
                      onClick={() => updateConfig('accentColor2', c.value)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                        config.accentColor2 === c.value
                          ? 'border-white scale-110'
                          : 'border-zinc-600'
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
                  ))}
                  <input
                    type='color'
                    value={config.accentColor2}
                    onChange={e => updateConfig('accentColor2', e.target.value)}
                    className='w-6 h-6 rounded cursor-pointer'
                    title='Custom color'
                  />
                </div>
              </div>

              {config.accentPattern.startsWith('random') && (
                <div>
                  <label className='flex justify-between text-xs text-zinc-300 mb-1'>
                    <span>Random Seed</span>
                    <span className='text-zinc-500'>{config.randomSeed}</span>
                  </label>
                  <div className='flex gap-2'>
                    <input
                      type='range'
                      min={1}
                      max={100}
                      value={config.randomSeed}
                      onChange={e =>
                        updateConfig('randomSeed', parseInt(e.target.value))
                      }
                      className='flex-1 accent-cosmic-latte'
                    />
                    <button
                      onClick={() =>
                        updateConfig(
                          'randomSeed',
                          Math.floor(Math.random() * 100) + 1
                        )
                      }
                      className='px-2 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-xs text-white'
                    >
                      Shuffle
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Code Output */}
        <div className='pt-2 border-t border-zinc-700'>
          <button
            onClick={() => setShowCode(!showCode)}
            className='flex items-center justify-between w-full text-xs font-medium text-zinc-400 uppercase tracking-wide hover:text-zinc-300'
          >
            <span>Copy Code</span>
            <svg
              className={`w-4 h-4 transition-transform ${showCode ? 'rotate-180' : ''}`}
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M19 9l-7 7-7-7'
              />
            </svg>
          </button>

          {showCode && (
            <div className='mt-2'>
              <pre className='bg-zinc-800 rounded-lg p-3 text-xs text-zinc-300 overflow-x-auto'>
                {generateCode()}
              </pre>
              <button
                onClick={() => navigator.clipboard.writeText(generateCode())}
                className='mt-2 w-full py-2 bg-cosmic-latte text-black text-sm font-medium rounded-lg hover:bg-cosmic-latte/90 transition-colors'
              >
                Copy to Clipboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
