'use client';

import * as React from 'react';
import { z } from 'zod';
import { X } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface ExternalIdInputProps {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  schema: z.ZodType;
  placeholder: string;
  hint: string;
}

/**
 * External ID input with format validation and clear button.
 *
 * Validates on blur using Zod schema.
 * Clear button (X) explicitly sets field to null (cleared state).
 * Distinguishes between null (cleared) and empty string (invalid/in-progress).
 */
export function ExternalIdInput({
  label,
  value,
  onChange,
  schema,
  placeholder,
  hint,
}: ExternalIdInputProps) {
  const [localValue, setLocalValue] = React.useState(value ?? '');
  const [isFocused, setIsFocused] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();

  // Sync localValue when prop changes from outside
  React.useEffect(() => {
    setLocalValue(value ?? '');
  }, [value]);

  const handleBlur = () => {
    setIsFocused(false);

    const trimmed = localValue.trim();

    // Validate with schema
    const result = schema.safeParse(trimmed || null);

    if (!result.success) {
      const errorMessage = result.error.errors[0]?.message || 'Invalid format';
      setError(errorMessage);
    } else {
      setError(undefined);
      // Only update if value actually changed
      if (trimmed !== (value ?? '')) {
        onChange(trimmed || null);
      }
    }
  };

  const handleClear = () => {
    setLocalValue('');
    setError(undefined);
    onChange(null);
  };

  const showHint = isFocused && !error;
  const showError = !isFocused && error;

  return (
    <div className='space-y-1'>
      <label className='text-sm text-zinc-400'>{label}</label>
      <div className='relative'>
        <Input
          value={localValue}
          onChange={e => setLocalValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={cn(
            'bg-zinc-800 border-zinc-700 pr-8',
            error && 'border-red-500'
          )}
        />
        {localValue && (
          <button
            type='button'
            onClick={handleClear}
            className='absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors'
            aria-label={`Clear ${label}`}
          >
            <X className='h-4 w-4' />
          </button>
        )}
      </div>
      {showHint && <p className='text-xs text-zinc-500'>{hint}</p>}
      {showError && <p className='text-xs text-red-400'>{error}</p>}
    </div>
  );
}
