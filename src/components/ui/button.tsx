import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-zinc-900 text-white shadow hover:bg-zinc-800',
        destructive: 'bg-red-600 text-white shadow-sm hover:bg-red-700',
        outline:
          'border border-zinc-500 bg-transparent text-zinc-200 shadow-sm hover:bg-zinc-800 hover:text-white hover:border-zinc-400',
        secondary: 'bg-zinc-800 text-white shadow-sm hover:bg-zinc-700',
        ghost: 'hover:bg-zinc-800 hover:text-white text-zinc-300',
        link: 'text-zinc-400 underline-offset-4 hover:underline',
        primary:
          'bg-cosmic-latte text-black shadow hover:bg-cosmic-latte/90 focus-visible:ring-cosmic-latte/50',
        success:
          'bg-emeraled-green text-white shadow hover:bg-emeraled-green/90 focus-visible:ring-emeraled-green/50',
        warning:
          'bg-maximum-yellow text-black shadow hover:bg-maximum-yellow/90 focus-visible:ring-maximum-yellow/50',
        danger:
          'bg-dark-pastel-red text-white shadow hover:bg-dark-pastel-red/90 focus-visible:ring-dark-pastel-red/50',
        'primary-outline':
          'border border-cosmic-latte bg-transparent text-cosmic-latte shadow-sm hover:bg-cosmic-latte hover:text-black focus-visible:ring-cosmic-latte/50',
        'success-outline':
          'border border-emeraled-green bg-transparent text-emeraled-green shadow-sm hover:bg-emeraled-green hover:text-white focus-visible:ring-emeraled-green/50',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        xl: 'h-12 rounded-lg px-8 text-base',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild: _asChild = false, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
