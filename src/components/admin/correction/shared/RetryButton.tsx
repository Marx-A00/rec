'use client';

import { RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RetryButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export function RetryButton({
  onClick,
  isLoading = false,
  children,
  className,
}: RetryButtonProps) {
  return (
    <Button
      type='button'
      variant='ghost'
      size='sm'
      onClick={onClick}
      disabled={isLoading}
      className={cn(
        'text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100',
        className
      )}
    >
      <RefreshCw className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')} />
      {children ?? 'Try Again'}
    </Button>
  );
}
