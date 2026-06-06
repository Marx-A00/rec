'use client';

import { useState } from 'react';
import {
  Play,
  Archive,
  Menu,
  Search,
  Bell,
  ChevronDown,
  Palette,
  X,
} from 'lucide-react';

import { SmokeBackground } from '@/components/ui/smoke-background';
import {
  SmokeButton,
  SMOKE_BUTTON_STYLES,
  type SmokeButtonStyle,
} from '@/components/ui/SmokeButton';

const STYLE_KEYS = Object.keys(SMOKE_BUTTON_STYLES) as SmokeButtonStyle[];

export function SmokeButtonPlayground() {
  const [activeStyle, setActiveStyle] = useState<SmokeButtonStyle>('ember');
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className='relative flex h-full flex-col overflow-hidden bg-black'>
      {/* Smoke background */}
      <SmokeBackground
        smokeColor='#10b981'
        speed={0.012}
        density={2.5}
        className='opacity-50'
      />

      {/* Vignette */}
      <div
        className='pointer-events-none absolute inset-0 z-[1]'
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0,0,0,0.7) 100%)',
        }}
      />

      {/* ── Header (collapsed style) ── */}
      <div className='relative z-10 flex items-center justify-between border-b border-zinc-800/60 px-4 py-2.5'>
        <div className='flex items-center gap-3'>
          <Menu className='h-5 w-5 text-zinc-400' />
          <span className='text-lg font-bold text-white'>rec</span>
        </div>
        <div className='flex items-center gap-2'>
          <div className='flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15'>
            <Search className='h-5 w-5 text-emerald-400' />
          </div>
          <div className='flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800'>
            <Bell className='h-5 w-5 text-zinc-400' />
          </div>
        </div>
      </div>

      {/* ── Pill nav ── */}
      <div className='relative z-10 flex items-center gap-2 border-b border-zinc-800/40 px-4 py-2'>
        <span className='text-sm font-semibold text-white'>Uncover</span>
        <div className='flex items-center gap-1 rounded-full bg-zinc-800 px-3 py-1.5'>
          <span className='text-xs font-medium text-zinc-300'>Today</span>
          <ChevronDown className='h-3 w-3 text-zinc-500' />
        </div>
      </div>

      {/* ── Game content ── */}
      <div className='relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-6'>
        {/* Album cover placeholder */}
        <div className='aspect-square w-full max-w-[200px] overflow-hidden rounded-lg bg-gradient-to-br from-zinc-800 via-zinc-700 to-zinc-900'>
          <div className='flex h-full w-full items-center justify-center'>
            <div className='h-20 w-20 rounded-full bg-zinc-600/30' />
          </div>
        </div>

        {/* Description */}
        <p className='text-center text-sm text-zinc-400'>
          Guess the album from its cover art. 4 attempts. New puzzle daily.
        </p>

        {/* Action buttons — smoke style */}
        <div className='flex w-full max-w-xs flex-col gap-3'>
          <SmokeButton variant={activeStyle} size='lg'>
            <Play className='h-5 w-5 fill-current' />
            Play
          </SmokeButton>

          <SmokeButton variant={activeStyle} size='md'>
            <Archive className='h-4 w-4' />
            Archive
          </SmokeButton>
        </div>
      </div>

      {/* ── Bottom nav (static) ── */}
      <div className='relative z-10 flex items-center justify-around border-t border-zinc-800/60 px-2 py-2.5'>
        {['Home', 'Search', 'Game', 'Profile'].map(label => (
          <div key={label} className='flex flex-col items-center gap-0.5'>
            <div
              className={`h-5 w-5 rounded-sm ${label === 'Game' ? 'bg-emerald-500/40' : 'bg-zinc-700/50'}`}
            />
            <span
              className={`text-[10px] ${label === 'Game' ? 'text-emerald-400' : 'text-zinc-600'}`}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Floating style selector toggle ── */}
      <button
        onClick={() => setMenuOpen(prev => !prev)}
        className='absolute bottom-20 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900/90 shadow-lg shadow-black/50 ring-1 ring-zinc-700 backdrop-blur-sm transition-transform active:scale-95'
      >
        {menuOpen ? (
          <X className='h-5 w-5 text-zinc-300' />
        ) : (
          <Palette className='h-5 w-5 text-zinc-300' />
        )}
      </button>

      {/* ── Style selector drawer ── */}
      <div
        className={`absolute bottom-20 right-4 z-20 transition-all duration-200 ease-in-out ${
          menuOpen
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-4 opacity-0'
        }`}
        style={{ marginBottom: 56 }}
      >
        <div className='rounded-2xl border border-zinc-800 bg-zinc-900/95 p-3 shadow-xl shadow-black/50 backdrop-blur-md'>
          <p className='mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500'>
            Button Style
          </p>
          <div className='flex flex-col gap-1'>
            {STYLE_KEYS.map(key => {
              const preset = SMOKE_BUTTON_STYLES[key];
              const isActive = key === activeStyle;
              return (
                <button
                  key={key}
                  onClick={() => {
                    setActiveStyle(key);
                    setMenuOpen(false);
                  }}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-zinc-400 active:bg-zinc-800'
                  }`}
                >
                  <div
                    className='h-3 w-3 rounded-full'
                    style={{ backgroundColor: preset.color }}
                  />
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
