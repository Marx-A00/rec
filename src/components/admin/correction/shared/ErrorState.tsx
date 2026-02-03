'use client';

import { AlertCircle, WifiOff, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RetryButton } from './RetryButton';

export type ErrorType = 'network' | 'rate-limit' | 'validation' | 'unknown';

interface ErrorStateProps {
  title?: string;
  message: string;
  type?: ErrorType;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}

const errorConfig: Record<
  ErrorType,
  { title: string; hint: string; Icon: typeof AlertCircle }
> = {
  network: {
    title: 'Connection Error',
    hint: 'Check your internet connection and try again.',
    Icon: WifiOff,
  },
  'rate-limit': {
    title: 'Too Many Requests',
    hint: 'MusicBrainz rate limit reached. Please wait a moment.',
    Icon: Clock,
  },
  validation: {
    title: 'Invalid Request',
    hint: 'The request could not be processed. Check your input.',
    Icon: AlertTriangle,
  },
  unknown: {
    title: 'Something Went Wrong',
    hint: 'An unexpected error occurred.',
    Icon: AlertCircle,
  },
};

/**
 * Categorize an error based on its message or status code
 */
export function categorizeError(error: unknown): ErrorType {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();

  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('failed to fetch') ||
    message.includes('econnrefused')
  ) {
    return 'network';
  }

  if (
    message.includes('rate') ||
    message.includes('429') ||
    message.includes('too many') ||
    message.includes('throttle')
  ) {
    return 'rate-limit';
  }

  if (
    message.includes('invalid') ||
    message.includes('validation') ||
    message.includes('400')
  ) {
    return 'validation';
  }

  return 'unknown';
}

export function ErrorState({
  title,
  message,
  type = 'unknown',
  onRetry,
  isRetrying = false,
  className,
}: ErrorStateProps) {
  const config = errorConfig[type];
  const Icon = config.Icon;
  const displayTitle = title ?? config.title;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-red-500/20 bg-zinc-800/50 p-6 text-center',
        className
      )}
    >
      <div className='mb-3 rounded-full bg-red-500/10 p-3'>
        <Icon className='h-6 w-6 text-red-500' />
      </div>

      <h3 className='mb-1 text-lg font-medium text-zinc-100'>{displayTitle}</h3>

      <p className='mb-2 max-w-md text-sm text-zinc-400'>{message}</p>

      <p className='mb-4 text-xs text-zinc-500'>{config.hint}</p>

      {onRetry && <RetryButton onClick={onRetry} isLoading={isRetrying} />}
    </div>
  );
}
