'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
    <div className='flex w-full flex-col items-center pt-7'>
      {/* Title */}
      <h1 className='text-[28px] font-bold text-white'>Uncover</h1>

      {/* Tabs */}
      <div className='mt-4 flex border-b border-zinc-700/40'>
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
