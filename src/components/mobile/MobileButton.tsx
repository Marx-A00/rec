import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

const mobileButtonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary:
          'bg-cosmic-latte text-black shadow hover:bg-cosmic-latte/90 focus-visible:ring-cosmic-latte/50',
        secondary: 'bg-zinc-800 text-white shadow-sm hover:bg-zinc-700',
        outline:
          'border border-zinc-600 bg-transparent text-zinc-200 shadow-sm hover:bg-zinc-800',
        ghost: 'hover:bg-zinc-800 text-zinc-300',
        destructive: 'bg-red-600 text-white shadow-sm hover:bg-red-700',
        success:
          'bg-emeraled-green text-black shadow hover:bg-emeraled-green/90 focus-visible:ring-emeraled-green/50',
      },
      size: {
        sm: 'h-9 min-w-[44px] px-3 text-sm',
        md: 'h-11 min-w-[44px] px-4 text-base',
        lg: 'h-13 min-w-[44px] px-6 text-base',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  }
);

export interface MobileButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof mobileButtonVariants> {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const MobileButton = React.forwardRef<HTMLButtonElement, MobileButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      loading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        className={cn(
          mobileButtonVariants({ variant, size, fullWidth, className })
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <Loader2 className='mr-2 h-4 w-4 animate-spin' />
        ) : leftIcon ? (
          <span className='mr-2'>{leftIcon}</span>
        ) : null}
        {children}
        {rightIcon && !loading && <span className='ml-2'>{rightIcon}</span>}
      </button>
    );
  }
);
MobileButton.displayName = 'MobileButton';

export { MobileButton, mobileButtonVariants };
