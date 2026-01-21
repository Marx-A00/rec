import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface MobileInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  type?: 'text' | 'email' | 'password' | 'search' | 'tel' | 'number' | 'url';
}

const MobileInput = React.forwardRef<HTMLInputElement, MobileInputProps>(
  (
    {
      className,
      label,
      error,
      leftIcon,
      rightIcon,
      type = 'text',
      disabled,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;

    return (
      <div className='w-full'>
        {label && (
          <label className='mb-1.5 block text-sm font-medium text-zinc-300'>
            {label}
          </label>
        )}
        <div className='relative'>
          {leftIcon && (
            <div className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500'>
              {leftIcon}
            </div>
          )}
          <input
            type={inputType}
            className={cn(
              'flex h-12 w-full rounded-md border bg-zinc-800 px-3 text-base text-white shadow-sm transition-colors',
              'placeholder:text-zinc-500',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emeraled-green focus-visible:border-emeraled-green',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error
                ? 'border-red-500 focus-visible:ring-red-500'
                : 'border-zinc-700',
              leftIcon && 'pl-10',
              (rightIcon || isPassword) && 'pr-10',
              className
            )}
            ref={ref}
            disabled={disabled}
            autoCapitalize={
              type === 'email' || type === 'password' ? 'none' : undefined
            }
            autoCorrect={
              type === 'email' || type === 'password' ? 'off' : undefined
            }
            {...props}
          />
          {isPassword && (
            <button
              type='button'
              className='absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2'
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className='h-5 w-5' />
              ) : (
                <Eye className='h-5 w-5' />
              )}
            </button>
          )}
          {rightIcon && !isPassword && (
            <div className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500'>
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className='mt-1.5 text-sm text-red-500'>{error}</p>}
      </div>
    );
  }
);
MobileInput.displayName = 'MobileInput';

export { MobileInput };
