'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flame } from 'lucide-react';

const tabs = [
  { label: 'Play', href: '/game/play' },
  { label: 'Archive', href: '/game/archive' },
  { label: 'Stats', href: '/game/stats' },
] as const;

/**
 * Page-level header for the Uncover game section.
 * Shows title, puzzle badge, streak, and navigation tabs.
 */
export function UncoverPageHeader() {
  const pathname = usePathname();

  // Determine active tab — /game or /game/play both map to Play
  const activeHref =
    tabs.find(t => pathname.startsWith(t.href))?.href ?? '/game/play';

  return (
    <div className='w-full px-[60px] pt-7'>
      {/* Title row */}
      <div className='flex items-center gap-3'>
        <h1 className='text-[28px] font-bold text-white'>Uncover</h1>
        <span className='rounded-md bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-500'>
          #47
        </span>
        <div className='flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 shadow-[0_0_8px_rgba(249,115,22,0.12)]'>
          <Flame className='h-3.5 w-3.5 text-orange-500' />
          <span className='text-sm font-bold text-orange-500'>5</span>
        </div>
      </div>

      {/* Subtitle */}
      <p className='mt-1.5 text-[13px] text-zinc-600'>
        Guess the album from its cover art. 4 attempts, a new puzzle every day.
      </p>

      {/* Tabs */}
      <div className='mt-4 flex border-b border-zinc-800'>
        {tabs.map(tab => {
          const isActive = activeHref === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 pb-3 pt-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-b-2 border-zinc-50 text-zinc-50'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
