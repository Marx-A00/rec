'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Drama, CalendarDays, Trophy } from 'lucide-react';

import { cn } from '@/lib/utils';

const tabs = [
  { label: 'Play', href: '/game/play', icon: Drama },
  { label: 'Archive', href: '/game/archive', icon: CalendarDays },
  { label: 'Stats', href: '/game/stats', icon: Trophy },
] as const;

/**
 * Page-level header for the Uncover game section.
 * Frosted glass nav bar with pill-styled tab group.
 */
export function UncoverPageHeader() {
  const pathname = usePathname();

  // Determine active tab — /game or /game/play both map to Play
  const activeHref =
    tabs.find(t => pathname.startsWith(t.href))?.href ?? '/game/play';

  return (
    <div className='flex shrink-0 items-center justify-center pb-3 pt-4 bg-black/30 backdrop-blur-sm'>
      {/* Frosted pill tab group */}
      <div className='flex items-center gap-1 rounded-full border border-white/[0.12] bg-white/[0.08] px-1.5 py-1 backdrop-blur-md'>
        {tabs.map(tab => {
          const isActive = activeHref === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white/[0.12] text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <Icon
                className={cn(
                  'h-3.5 w-3.5',
                  isActive ? 'text-emerald-400' : 'text-zinc-500'
                )}
              />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
