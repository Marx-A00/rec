'use client';

import * as React from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';

import { cn } from '@/lib/utils';

interface MobileBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  /** Whether clicking overlay should close the sheet */
  dismissible?: boolean;
  /** Snap points for the sheet height (e.g., [0.5, 1]) */
  snapPoints?: (number | string)[];
  /** Active snap point index */
  activeSnapPoint?: number | string | null;
  /** Callback when snap point changes */
  onSnapPointChange?: (snapPoint: number | string | null) => void;
}

export function MobileBottomSheet({
  open,
  onOpenChange,
  children,
  dismissible = true,
  snapPoints,
  activeSnapPoint,
  onSnapPointChange,
}: MobileBottomSheetProps) {
  return (
    <DrawerPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      dismissible={dismissible}
      snapPoints={snapPoints}
      activeSnapPoint={activeSnapPoint}
      setActiveSnapPoint={onSnapPointChange}
    >
      {children}
    </DrawerPrimitive.Root>
  );
}

export const MobileBottomSheetTrigger = DrawerPrimitive.Trigger;
export const MobileBottomSheetClose = DrawerPrimitive.Close;

interface MobileBottomSheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content> {
  /** Whether to show the handle indicator */
  showHandle?: boolean;
  /** Max height of the content */
  maxHeight?: string;
}

export const MobileBottomSheetContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  MobileBottomSheetContentProps
>(({ className, children, showHandle = true, maxHeight, ...props }, ref) => (
  <DrawerPrimitive.Portal>
    <DrawerPrimitive.Overlay className='fixed inset-0 z-50 bg-black/60' />
    <DrawerPrimitive.Content
      ref={ref}
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 flex flex-col bg-zinc-900 rounded-t-2xl',
        'safe-area-inset-bottom',
        maxHeight ? maxHeight : 'max-h-[85vh]',
        className
      )}
      {...props}
    >
      {showHandle && (
        <div className='flex justify-center pt-4 pb-2'>
          <div className='w-12 h-1.5 rounded-full bg-zinc-600' />
        </div>
      )}
      {children}
    </DrawerPrimitive.Content>
  </DrawerPrimitive.Portal>
));
MobileBottomSheetContent.displayName = 'MobileBottomSheetContent';

interface MobileBottomSheetHeaderProps
  extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
}

export function MobileBottomSheetHeader({
  title,
  description,
  className,
  ...props
}: MobileBottomSheetHeaderProps) {
  return (
    <div className={cn('px-4 pb-3', className)} {...props}>
      <DrawerPrimitive.Title className='text-lg font-semibold text-white'>
        {title}
      </DrawerPrimitive.Title>
      {description && (
        <DrawerPrimitive.Description className='text-sm text-zinc-400 mt-1'>
          {description}
        </DrawerPrimitive.Description>
      )}
    </div>
  );
}

interface MobileBottomSheetBodyProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether the content should be scrollable */
  scrollable?: boolean;
}

export function MobileBottomSheetBody({
  className,
  scrollable = true,
  ...props
}: MobileBottomSheetBodyProps) {
  return (
    <div
      className={cn('flex-1 px-4', scrollable && 'overflow-y-auto', className)}
      {...props}
    />
  );
}

interface MobileBottomSheetFooterProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export function MobileBottomSheetFooter({
  className,
  ...props
}: MobileBottomSheetFooterProps) {
  return (
    <div
      className={cn('px-4 py-4 border-t border-zinc-800 pb-safe', className)}
      {...props}
    />
  );
}
