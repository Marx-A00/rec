import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const mobileCardVariants = cva('rounded-lg transition-colors', {
  variants: {
    variant: {
      default: 'bg-zinc-900 border border-zinc-800',
      elevated: 'bg-zinc-900 shadow-lg',
      outlined: 'bg-transparent border border-zinc-700',
    },
    padding: {
      none: 'p-0',
      sm: 'p-2',
      md: 'p-4',
      lg: 'p-6',
    },
  },
  defaultVariants: {
    variant: 'default',
    padding: 'md',
  },
});

export interface MobileCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof mobileCardVariants> {
  onPress?: () => void;
}

const MobileCard = React.forwardRef<HTMLDivElement, MobileCardProps>(
  ({ className, variant, padding, onPress, children, ...props }, ref) => {
    const isClickable = !!onPress;

    return (
      <div
        ref={ref}
        className={cn(
          mobileCardVariants({ variant, padding, className }),
          isClickable && 'cursor-pointer active:scale-[0.99] active:bg-zinc-800'
        )}
        onClick={onPress}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onKeyDown={
          isClickable
            ? e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onPress();
                }
              }
            : undefined
        }
        {...props}
      >
        {children}
      </div>
    );
  }
);
MobileCard.displayName = 'MobileCard';

// Card subcomponents for structured content
const MobileCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1 pb-2', className)}
    {...props}
  />
));
MobileCardHeader.displayName = 'MobileCardHeader';

const MobileCardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-base font-semibold text-white', className)}
    {...props}
  />
));
MobileCardTitle.displayName = 'MobileCardTitle';

const MobileCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-zinc-400', className)} {...props} />
));
MobileCardDescription.displayName = 'MobileCardDescription';

const MobileCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('', className)} {...props} />
));
MobileCardContent.displayName = 'MobileCardContent';

const MobileCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center pt-2', className)}
    {...props}
  />
));
MobileCardFooter.displayName = 'MobileCardFooter';

export {
  MobileCard,
  MobileCardHeader,
  MobileCardTitle,
  MobileCardDescription,
  MobileCardContent,
  MobileCardFooter,
  mobileCardVariants,
};
