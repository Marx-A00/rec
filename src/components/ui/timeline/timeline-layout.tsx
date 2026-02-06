'use client';

import * as React from 'react';
import { motion } from 'framer-motion';

import {
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
  type TimelineProps,
  type TimelineItemProps,
  type TimelineIconProps,
} from './timeline';

// ============================================================================
// Timeline Layout Types
// ============================================================================

export interface TimelineLayoutItem {
  /** Unique identifier for the item */
  id: string;
  /** Title text to display */
  title: string;
  /** Description or subtitle text */
  description?: string;
  /** Date/time for the item */
  date?: Date | string;
  /** Icon to display (React element) */
  icon?: React.ReactNode;
  /** Icon color variant */
  iconColor?: TimelineIconProps['color'];
  /** Status of the item */
  status?: TimelineItemProps['status'];
  /** Whether item is loading */
  loading?: boolean;
  /** Whether item has an error */
  error?: boolean;
  /** Additional content to show when expanded */
  content?: React.ReactNode;
  /** Child items for nested timelines */
  children?: TimelineLayoutItem[];
}

export interface TimelineLayoutProps extends Omit<TimelineProps, 'children'> {
  /** Array of items to render */
  items: TimelineLayoutItem[];
  /** Whether to show relative time format */
  relativeTime?: boolean;
  /** Empty state props */
  emptyState?: {
    icon?: React.ReactNode;
    title?: string;
    description?: string;
  };
  /** Whether to reverse item order (newest first) */
  reverseOrder?: boolean;
  /** Hide connector on last item */
  hideLastConnector?: boolean;
}

// ============================================================================
// Timeline Layout Component
// ============================================================================

/**
 * Pre-built timeline layout component.
 * Renders timeline items with animations and proper connector handling.
 *
 * @example
 * ```tsx
 * <TimelineLayout
 *   items={[
 *     { id: '1', title: 'Task completed', date: new Date() },
 *     { id: '2', title: 'Task started', date: yesterday },
 *   ]}
 *   relativeTime
 *   reverseOrder
 * />
 * ```
 */
export function TimelineLayout({
  items,
  relativeTime = false,
  emptyState,
  reverseOrder = true,
  hideLastConnector = true,
  animate = true,
  ...timelineProps
}: TimelineLayoutProps) {
  // Reverse order for newest-first display
  const orderedItems = reverseOrder ? [...items].reverse() : items;

  // Show empty state when no items
  if (orderedItems.length === 0) {
    return (
      <TimelineEmpty
        icon={emptyState?.icon}
        title={emptyState?.title}
        description={emptyState?.description}
      />
    );
  }

  return (
    <Timeline animate={animate} {...timelineProps}>
      {orderedItems.map((item, index) => {
        const isLast = index === orderedItems.length - 1;

        return (
          <TimelineItem
            key={item.id}
            status={item.status}
            loading={item.loading}
            error={item.error}
          >
            {/* Icon column with connector */}
            <div className="relative flex flex-col items-center">
              <TimelineIcon
                icon={item.icon}
                color={item.iconColor}
                loading={item.loading}
                error={item.error}
                success={item.status === 'completed' && !item.icon}
              />
              {/* Show connector unless it's the last item and hideLastConnector is true */}
              {!(isLast && hideLastConnector) && (
                <TimelineConnector completed={item.status === 'completed'} />
              )}
            </div>

            {/* Content column */}
            <div className="flex-1 pb-4">
              <TimelineHeader>
                <div className="flex items-start justify-between gap-2">
                  <TimelineTitle>{item.title}</TimelineTitle>
                  {item.date && (
                    <TimelineTime
                      date={item.date}
                      relative={relativeTime}
                    />
                  )}
                </div>
                {item.description && (
                  <TimelineDescription>{item.description}</TimelineDescription>
                )}
              </TimelineHeader>

              {/* Additional content */}
              {item.content && (
                <motion.div
                  initial={animate ? { opacity: 0, height: 0 } : undefined}
                  animate={animate ? { opacity: 1, height: 'auto' } : undefined}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  <TimelineContent>{item.content}</TimelineContent>
                </motion.div>
              )}

              {/* Nested children */}
              {item.children && item.children.length > 0 && (
                <div className="mt-4 ml-4 border-l-2 border-muted-foreground/20 pl-4">
                  <TimelineLayout
                    items={item.children}
                    relativeTime={relativeTime}
                    reverseOrder={false}
                    hideLastConnector={hideLastConnector}
                    animate={animate}
                    size="sm"
                  />
                </div>
              )}
            </div>
          </TimelineItem>
        );
      })}
    </Timeline>
  );
}

export default TimelineLayout;
