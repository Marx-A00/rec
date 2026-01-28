'use client';

import { cn } from '@/lib/utils';

export interface StepIndicatorProps {
  /** Current step index (0-based) */
  currentStep: number;
  /** Callback when a step is clicked */
  onStepClick: (step: number) => void;
  /** Modal mode affects step labels and count */
  mode?: 'search' | 'manual';
  /** Step labels (optional override) */
  steps?: string[];
}

/**
 * Step indicator showing wizard progress with clickable navigation.
 *
 * Supports two modes:
 * - Search mode (default): 4 steps - Current Data, Search, Preview, Apply
 * - Manual mode: 3 steps - Current Data, Edit, Apply
 *
 * Visual design:
 * - Horizontal layout with numbered circles connected by lines
 * - Current step: cosmic-latte fill
 * - Other steps: border only with muted text
 * - Completed line segments: cosmic-latte color
 * - Pending line segments: muted color
 */
export function StepIndicator({
  currentStep,
  onStepClick,
  mode = 'search',
  steps,
}: StepIndicatorProps) {
  // Default step labels based on mode
  const defaultSteps =
    mode === 'manual'
      ? ['Current Data', 'Edit', 'Apply']
      : ['Current Data', 'Search', 'Preview', 'Apply'];

  const stepLabels = steps ?? defaultSteps;

  return (
    <nav aria-label='Progress' className='w-full py-4'>
      <ol className='flex items-center justify-center'>
        {stepLabels.map((label, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isClickable = true; // All steps are clickable for free navigation

          return (
            <li
              key={label}
              className={cn(
                'flex items-center',
                index !== stepLabels.length - 1 && 'flex-1'
              )}
            >
              {/* Step circle and label */}
              <button
                type='button'
                onClick={() => isClickable && onStepClick(index)}
                disabled={!isClickable}
                className={cn(
                  'group flex flex-col items-center',
                  isClickable && 'cursor-pointer'
                )}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {/* Circle */}
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors',
                    isCurrent && 'border-zinc-100 bg-zinc-100 text-zinc-900',
                    isCompleted && 'border-zinc-500 bg-zinc-700 text-zinc-300',
                    !isCurrent &&
                      !isCompleted &&
                      'border-zinc-600 text-zinc-500',
                    isClickable && !isCurrent && 'group-hover:border-zinc-400'
                  )}
                >
                  {index + 1}
                </span>
                {/* Label - hidden on small screens */}
                <span
                  className={cn(
                    'mt-2 text-xs font-medium hidden sm:inline',
                    isCurrent && 'text-zinc-100',
                    isCompleted && 'text-zinc-400',
                    !isCurrent && !isCompleted && 'text-zinc-500'
                  )}
                >
                  {label}
                </span>
              </button>

              {/* Connecting line (except for last step) */}
              {index !== stepLabels.length - 1 && (
                <div
                  className={cn(
                    'mx-2 h-0.5 flex-1 transition-colors sm:mx-4',
                    index < currentStep ? 'bg-zinc-500' : 'bg-zinc-700'
                  )}
                  aria-hidden='true'
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
