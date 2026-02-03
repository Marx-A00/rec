'use client';

import * as React from 'react';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface ClearableInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
  showClearButton?: boolean;
  clearButtonClassName?: string;
  wrapperClassName?: string;
}

const ClearableInput = React.forwardRef<HTMLInputElement, ClearableInputProps>(
  (
    {
      className,
      onClear,
      showClearButton = true,
      clearButtonClassName,
      wrapperClassName,
      value,
      ...props
    },
    ref
  ) => {
    const hasValue = value !== undefined && value !== '';

    return (
      <div className={cn('relative', wrapperClassName)}>
        <Input
          ref={ref}
          value={value}
          className={cn(hasValue && showClearButton ? 'pr-8' : '', className)}
          {...props}
        />
        {showClearButton && hasValue && onClear && (
          <button
            type='button'
            onClick={onClear}
            className={cn(
              'absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 hover:text-zinc-200 transition-colors',
              clearButtonClassName
            )}
            aria-label='Clear input'
          >
            <X className='h-4 w-4' />
          </button>
        )}
      </div>
    );
  }
);

ClearableInput.displayName = 'ClearableInput';

export { ClearableInput };
