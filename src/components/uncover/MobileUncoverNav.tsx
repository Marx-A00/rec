'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Drama, CalendarDays, Trophy, ChevronDown } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  {
    label: 'Play (Today)',
    shortLabel: 'Today',
    href: '/m/game/play',
    icon: Drama,
    matchPaths: ['/m/game/play'],
  },
  {
    label: 'Archive',
    shortLabel: 'Archive',
    href: '/m/game/archive',
    icon: CalendarDays,
    matchPaths: ['/m/game/archive'],
  },
  {
    label: 'Stats',
    shortLabel: 'Stats',
    href: '/m/game/stats',
    icon: Trophy,
    matchPaths: ['/m/game/stats'],
  },
] as const;

/**
 * Persistent navigation header for the mobile Uncover game.
 *
 * Shows "Uncover" title on the left and a dropdown pill button on the right.
 * The pill displays the current context (Today / Archive / Stats) and opens
 * a menu with all navigation options on tap.
 *
 * Rendered inside the game layout so it's visible on all /m/game/* routes.
 */
export function MobileUncoverNav() {
  const pathname = usePathname();
  const router = useRouter();

  // Determine active nav item based on current route.
  // Home (/m/game) maps to the Play item.
  const activeItem =
    NAV_ITEMS.find(item => item.matchPaths.some(p => pathname.startsWith(p))) ??
    NAV_ITEMS[0];

  const ActiveIcon = activeItem.icon;

  return (
    <div className='flex shrink-0 items-center justify-between px-6 pb-3 pt-3 bg-black/30 backdrop-blur-sm'>
      <h1 className='text-[22px] font-bold text-white'>Uncover</h1>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              'flex h-9 items-center gap-2 rounded-full border px-3',
              'bg-white/[0.08] backdrop-blur-md text-sm font-medium text-white',
              'border-white/[0.12] transition-colors',
              'data-[state=open]:border-emerald-500/60',
              'active:scale-[0.97] focus-visible:outline-none'
            )}
          >
            <ActiveIcon className='h-3.5 w-3.5 text-emerald-400' />
            <span>{activeItem.shortLabel}</span>
            <ChevronDown className='h-3.5 w-3.5 text-zinc-500 transition-transform duration-200 [[data-state=open]_&]:rotate-180' />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align='end'
          sideOffset={6}
          className='z-50 min-w-[160px] rounded-xl border-white/[0.12] bg-black/40 p-1.5 backdrop-blur-xl'
        >
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = item === activeItem;

            return (
              <DropdownMenuItem
                key={item.href}
                onSelect={() => router.push(item.href)}
                className={cn(
                  'flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium',
                  'focus:bg-zinc-800/60',
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'text-zinc-300'
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4',
                    isActive ? 'text-emerald-400' : 'text-zinc-500'
                  )}
                />
                {item.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
