'use client';

import { cn } from '@/lib/utils';

export interface StepIndicatorProps {
  /** Current step index (0-2) */
  currentStep: number;
  /** Callback when a step is clicked */
  onStepClick: (step: number) => void;
  /** Step labels (default: ["Current Data", "Search", "Apply"]) */
  steps?: string[];
}

/**
 * Step indicator showing 3-step wizard progress with clickable navigation.
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
  steps = ['Current Data', 'Search', 'Apply'],
}: StepIndicatorProps) {
  return (
    <nav aria-label="Progress" className="w-full py-4">
      <ol className="flex items-center justify-center">
        {steps.map((label, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isClickable = true; // All steps are clickable for free navigation

          return (
            <li
              key={label}
              className={cn('flex items-center', index !== steps.length - 1 && 'flex-1')}
            >
              {/* Step circle and label */}
              <button
                type="button"
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
                    isCurrent && 'border-cosmic-latte bg-cosmic-latte text-black',
                    isCompleted && 'border-cosmic-latte bg-cosmic-latte/20 text-cosmic-latte',
                    !isCurrent && !isCompleted && 'border-muted-foreground text-muted-foreground',
                    isClickable && !isCurrent && 'group-hover:border-cosmic-latte/60'
                  )}
                >
                  {index + 1}
                </span>
                {/* Label - hidden on small screens */}
                <span
                  className={cn(
                    'mt-2 text-xs font-medium hidden sm:inline',
                    isCurrent && 'text-cosmic-latte',
                    isCompleted && 'text-cosmic-latte/80',
                    !isCurrent && !isCompleted && 'text-muted-foreground'
                  )}
                >
                  {label}
                </span>
              </button>

              {/* Connecting line (except for last step) */}
              {index !== steps.length - 1 && (
                <div
                  className={cn(
                    'mx-2 h-0.5 flex-1 transition-colors sm:mx-4',
                    index < currentStep ? 'bg-cosmic-latte' : 'bg-muted-foreground/30'
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
