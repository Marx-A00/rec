'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  HelpCircle,
  X,
  ChevronRight,
  Eye,
  EyeOff,
  RotateCcw,
} from 'lucide-react';

import { HINT_DEFINITIONS } from '@/config/hints';
import { useHintStore } from '@/stores/useHintStore';
import { cn } from '@/lib/utils';

export default function HintNavigator() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { dismissedHints, hasSeenHint, dismissHint, resetHints } =
    useHintStore();

  const unseenCount = HINT_DEFINITIONS.filter(
    h => !dismissedHints.includes(h.id)
  ).length;

  const handleNavigate = (hint: (typeof HINT_DEFINITIONS)[number]) => {
    // Re-show the hint so it appears when they land on the page
    if (hasSeenHint(hint.id)) {
      // Remove from dismissed so it shows again
      useHintStore.setState(state => ({
        dismissedHints: state.dismissedHints.filter(id => id !== hint.id),
      }));
    }

    if (hint.pagePath) {
      router.push(hint.pagePath);
      setIsOpen(false);
    }
  };

  const handleToggleHint = (
    e: React.MouseEvent,
    hint: (typeof HINT_DEFINITIONS)[number]
  ) => {
    e.stopPropagation();
    if (hasSeenHint(hint.id)) {
      useHintStore.setState(state => ({
        dismissedHints: state.dismissedHints.filter(id => id !== hint.id),
      }));
    } else {
      dismissHint(hint.id);
    }
  };

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed top-20 right-6 z-60 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-200',
          'bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600',
          isOpen && 'bg-zinc-700 border-zinc-600'
        )}
      >
        {isOpen ? (
          <X className='h-5 w-5 text-zinc-300' />
        ) : (
          <div className='relative'>
            <HelpCircle className='h-5 w-5 text-zinc-300' />
            {unseenCount > 0 && (
              <span className='absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white'>
                {unseenCount}
              </span>
            )}
          </div>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className='fixed top-[88px] right-6 z-60 w-80 rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl'>
          {/* Header */}
          <div className='flex items-center justify-between border-b border-zinc-800 px-4 py-3'>
            <h3 className='text-sm font-bold text-white'>Hints</h3>
            <button
              onClick={() => {
                resetHints();
              }}
              className='flex items-center gap-1.5 text-xs text-zinc-400 hover:text-cosmic-latte transition-colors'
            >
              <RotateCcw className='h-3 w-3' />
              Reset all
            </button>
          </div>

          {/* Hint list */}
          <div className='max-h-80 overflow-y-auto p-2'>
            {HINT_DEFINITIONS.map(hint => {
              const seen = hasSeenHint(hint.id);
              const isCurrentPage = hint.pagePath === pathname;
              const canNavigate = !!hint.pagePath;

              return (
                <div
                  key={hint.id}
                  role={canNavigate ? 'button' : undefined}
                  tabIndex={canNavigate ? 0 : undefined}
                  onClick={() => canNavigate && handleNavigate(hint)}
                  onKeyDown={e => {
                    if (canNavigate && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      handleNavigate(hint);
                    }
                  }}
                  className={cn(
                    'w-full rounded-lg px-3 py-2.5 text-left transition-colors',
                    canNavigate
                      ? 'hover:bg-zinc-800 cursor-pointer'
                      : 'cursor-default',
                    isCurrentPage && 'bg-zinc-800/50'
                  )}
                >
                  <div className='flex items-start justify-between gap-2'>
                    <div className='min-w-0 flex-1'>
                      <div className='flex items-center gap-2'>
                        <span
                          className={cn(
                            'text-sm font-medium',
                            seen ? 'text-zinc-500' : 'text-white'
                          )}
                        >
                          {hint.title}
                        </span>
                        <span className='text-[10px] text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded'>
                          {hint.page}
                        </span>
                      </div>
                      <p className='mt-0.5 text-xs text-zinc-500 line-clamp-2'>
                        {hint.description}
                      </p>
                    </div>
                    <div className='flex items-center gap-1 shrink-0'>
                      <button
                        onClick={e => handleToggleHint(e, hint)}
                        className='p-1 text-zinc-600 hover:text-zinc-300 transition-colors'
                        title={seen ? 'Mark as unseen' : 'Mark as seen'}
                      >
                        {seen ? (
                          <EyeOff className='h-3.5 w-3.5' />
                        ) : (
                          <Eye className='h-3.5 w-3.5' />
                        )}
                      </button>
                      {canNavigate && (
                        <ChevronRight className='h-3.5 w-3.5 text-zinc-600' />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className='border-t border-zinc-800 px-4 py-2.5'>
            <p className='text-[11px] text-zinc-600'>
              {unseenCount === 0
                ? 'All hints seen'
                : `${unseenCount} unseen hint${unseenCount === 1 ? '' : 's'}`}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
