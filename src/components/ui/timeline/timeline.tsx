'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion, type HTMLMotionProps, type Transition } from 'framer-motion';
import { AlertCircle, Check, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

// ============================================================================
// Timeline Container
// ============================================================================

const timelineVariants = cva('flex flex-col', {
  variants: {
    size: {
      sm: 'gap-4',
      md: 'gap-6',
      lg: 'gap-8',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

interface TimelineProps
  extends React.HTMLAttributes<HTMLOListElement>,
    VariantProps<typeof timelineVariants> {
  animate?: boolean;
}

const Timeline = React.forwardRef<HTMLOListElement, TimelineProps>(
  ({ className, size, animate = true, children, ...props }, ref) => {
    return (
      <ol
        ref={ref}
        className={cn(timelineVariants({ size }), className)}
        role='list'
        aria-label='Timeline'
        {...props}
      >
        {React.Children.map(children, (child, index) => {
          if (React.isValidElement<TimelineItemProps>(child)) {
            return React.cloneElement(child, {
              animate,
              index,
            });
          }
          return child;
        })}
      </ol>
    );
  }
);
Timeline.displayName = 'Timeline';

// ============================================================================
// Timeline Item
// ============================================================================

const timelineItemVariants = cva('relative flex gap-4 pb-2 last:pb-0', {
  variants: {
    status: {
      completed: '',
      'in-progress': '',
      pending: 'opacity-60',
    },
  },
  defaultVariants: {
    status: 'completed',
  },
});

interface TimelineItemProps
  extends Omit<HTMLMotionProps<'li'>, 'children'>,
    VariantProps<typeof timelineItemVariants> {
  status?: 'completed' | 'in-progress' | 'pending';
  loading?: boolean;
  error?: boolean;
  animate?: boolean;
  index?: number;
  children?: React.ReactNode;
}

const MOTION_PROPS = [
  'initial',
  'animate',
  'exit',
  'transition',
  'variants',
  'whileHover',
  'whileTap',
  'whileFocus',
  'whileDrag',
  'whileInView',
  'drag',
  'dragConstraints',
  'dragElastic',
  'dragMomentum',
  'dragTransition',
  'dragPropagation',
  'dragControls',
  'dragListener',
  'dragSnapToOrigin',
  'onDrag',
  'onDragStart',
  'onDragEnd',
  'onDirectionLock',
  'onDragTransitionEnd',
  'layout',
  'layoutId',
  'layoutDependency',
  'layoutScroll',
  'layoutRoot',
  'onLayoutAnimationStart',
  'onLayoutAnimationComplete',
  'onViewportEnter',
  'onViewportLeave',
  'viewport',
  'transformTemplate',
  'custom',
];

function filterMotionProps<T extends Record<string, unknown>>(
  props: T
): Omit<T, (typeof MOTION_PROPS)[number]> {
  const filtered = { ...props };
  for (const prop of MOTION_PROPS) {
    delete filtered[prop];
  }
  return filtered;
}

const TimelineItem = React.forwardRef<HTMLLIElement, TimelineItemProps>(
  (
    {
      className,
      status = 'completed',
      loading = false,
      error = false,
      animate = true,
      index = 0,
      children,
      ...props
    },
    ref
  ) => {
    const motionProps: {
      initial?: { opacity: number; y: number };
      animate?: { opacity: number; y: number };
      transition?: Transition;
    } = animate
      ? {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: {
            duration: 0.5,
            delay: index * 0.1,
            ease: 'easeOut' as const,
          },
        }
      : {};

    const domProps = animate ? props : filterMotionProps(props);

    return (
      <motion.li
        ref={ref}
        className={cn(
          timelineItemVariants({ status }),
          error && 'border-l-2 border-l-destructive pl-2',
          className
        )}
        {...motionProps}
        {...domProps}
      >
        {children}
      </motion.li>
    );
  }
);
TimelineItem.displayName = 'TimelineItem';

// ============================================================================
// Timeline Icon
// ============================================================================

const timelineIconVariants = cva(
  'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2',
  {
    variants: {
      color: {
        primary: 'border-primary bg-primary text-primary-foreground',
        secondary:
          'border-destructive bg-destructive text-destructive-foreground',
        muted: 'border-muted-foreground/50 bg-muted text-muted-foreground',
        accent:
          'border-amber-500 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        success:
          'border-emerald-500 bg-emerald-500 text-white dark:border-emerald-400 dark:bg-emerald-500',
        error:
          'border-red-500 bg-red-500 text-white dark:border-red-400 dark:bg-red-500',
        warning:
          'border-amber-500 bg-amber-500 text-white dark:border-amber-400 dark:bg-amber-500',
      },
      size: {
        sm: 'h-6 w-6',
        md: 'h-8 w-8',
        lg: 'h-10 w-10',
      },
    },
    defaultVariants: {
      color: 'primary',
      size: 'md',
    },
  }
);

type TimelineIconColor =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'accent'
  | 'success'
  | 'error'
  | 'warning';
type TimelineIconSize = 'sm' | 'md' | 'lg';

interface TimelineIconProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color'> {
  icon?: React.ReactNode;
  loading?: boolean;
  success?: boolean;
  error?: boolean;
  color?: TimelineIconColor | null;
  size?: TimelineIconSize | null;
}

const TimelineIcon = React.forwardRef<HTMLDivElement, TimelineIconProps>(
  (
    {
      className,
      color,
      size,
      icon,
      loading = false,
      success = false,
      error = false,
      ...props
    },
    ref
  ) => {
    const renderIcon = () => {
      if (loading) {
        return <Loader2 className='h-4 w-4 animate-spin' />;
      }
      if (error) {
        return <AlertCircle className='h-4 w-4' />;
      }
      if (success) {
        return <Check className='h-4 w-4' />;
      }
      return icon;
    };

    const effectiveColor: TimelineIconColor | null | undefined = error
      ? 'secondary'
      : color;

    return (
      <div
        ref={ref}
        className={cn(
          timelineIconVariants({ color: effectiveColor, size }),
          loading && 'animate-pulse',
          className
        )}
        {...props}
      >
        {renderIcon()}
      </div>
    );
  }
);
TimelineIcon.displayName = 'TimelineIcon';

// ============================================================================
// Timeline Connector
// ============================================================================

interface TimelineConnectorProps extends React.HTMLAttributes<HTMLDivElement> {
  completed?: boolean;
}

const TimelineConnector = React.forwardRef<
  HTMLDivElement,
  TimelineConnectorProps
>(({ className, completed = false, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'absolute left-4 top-10 h-[calc(100%-2rem)] w-0.5 -translate-x-1/2',
        completed ? 'bg-primary' : 'bg-muted-foreground/30',
        className
      )}
      {...props}
    />
  );
});
TimelineConnector.displayName = 'TimelineConnector';

// ============================================================================
// Timeline Header
// ============================================================================

type TimelineHeaderProps = React.HTMLAttributes<HTMLDivElement>;

const TimelineHeader = React.forwardRef<HTMLDivElement, TimelineHeaderProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex flex-1 flex-col gap-1', className)}
        {...props}
      />
    );
  }
);
TimelineHeader.displayName = 'TimelineHeader';

// ============================================================================
// Timeline Title
// ============================================================================

type TimelineTitleProps = React.HTMLAttributes<HTMLHeadingElement>;

const TimelineTitle = React.forwardRef<HTMLHeadingElement, TimelineTitleProps>(
  ({ className, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={cn(
          'text-sm font-semibold leading-none text-foreground',
          className
        )}
        {...props}
      />
    );
  }
);
TimelineTitle.displayName = 'TimelineTitle';

// ============================================================================
// Timeline Description
// ============================================================================

type TimelineDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

const TimelineDescription = React.forwardRef<
  HTMLParagraphElement,
  TimelineDescriptionProps
>(({ className, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
});
TimelineDescription.displayName = 'TimelineDescription';

// ============================================================================
// Timeline Time
// ============================================================================

interface TimelineTimeProps extends React.HTMLAttributes<HTMLTimeElement> {
  date?: Date | string;
  relative?: boolean;
  formatOptions?: Intl.DateTimeFormatOptions;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return 'just now';
  }
  if (diffMin < 60) {
    const label = diffMin === 1 ? 'minute' : 'minutes';
    return diffMin + ' ' + label + ' ago';
  }
  if (diffHour < 24) {
    const label = diffHour === 1 ? 'hour' : 'hours';
    return diffHour + ' ' + label + ' ago';
  }
  if (diffDay < 7) {
    const label = diffDay === 1 ? 'day' : 'days';
    return diffDay + ' ' + label + ' ago';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

const TimelineTime = React.forwardRef<HTMLTimeElement, TimelineTimeProps>(
  (
    {
      className,
      date,
      relative = false,
      formatOptions = {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      },
      children,
      ...props
    },
    ref
  ) => {
    const dateObj = date instanceof Date ? date : date ? new Date(date) : null;

    const displayText = React.useMemo(() => {
      if (children) return children;
      if (!dateObj) return '';

      if (relative) {
        return formatRelativeTime(dateObj);
      }

      return new Intl.DateTimeFormat('en-US', formatOptions).format(dateObj);
    }, [children, dateObj, relative, formatOptions]);

    return (
      <time
        ref={ref}
        className={cn('text-xs text-muted-foreground', className)}
        dateTime={dateObj?.toISOString()}
        {...props}
      >
        {displayText}
      </time>
    );
  }
);
TimelineTime.displayName = 'TimelineTime';

// ============================================================================
// Timeline Content
// ============================================================================

type TimelineContentProps = React.HTMLAttributes<HTMLDivElement>;

const TimelineContent = React.forwardRef<HTMLDivElement, TimelineContentProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'mt-2 rounded-lg border bg-muted/30 p-3 text-sm',
          className
        )}
        {...props}
      />
    );
  }
);
TimelineContent.displayName = 'TimelineContent';

// ============================================================================
// Timeline Empty
// ============================================================================

interface TimelineEmptyProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
}

const TimelineEmpty = React.forwardRef<HTMLDivElement, TimelineEmptyProps>(
  (
    {
      className,
      icon,
      title = 'No activity',
      description = 'There are no items to display.',
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center py-8 text-center',
          className
        )}
        {...props}
      >
        {icon && <div className='mb-3 text-muted-foreground'>{icon}</div>}
        <h3 className='text-sm font-medium'>{title}</h3>
        <p className='mt-1 text-sm text-muted-foreground'>{description}</p>
      </div>
    );
  }
);
TimelineEmpty.displayName = 'TimelineEmpty';

// ============================================================================
// Exports
// ============================================================================

export {
  Timeline,
  TimelineItem,
  TimelineIcon,
  TimelineConnector,
  TimelineHeader,
  TimelineTitle,
  TimelineDescription,
  TimelineTime,
  TimelineContent,
  TimelineEmpty,
  timelineVariants,
  timelineItemVariants,
  timelineIconVariants,
};

export type {
  TimelineProps,
  TimelineItemProps,
  TimelineIconProps,
  TimelineConnectorProps,
  TimelineHeaderProps,
  TimelineTitleProps,
  TimelineDescriptionProps,
  TimelineTimeProps,
  TimelineContentProps,
  TimelineEmptyProps,
  TimelineIconColor,
  TimelineIconSize,
};
