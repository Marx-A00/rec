'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { partialDateSchema } from './validation';

export interface DateInputProps {
  value: string | null;
  onChange: (value: string | null) => void;
  label?: string;
}

/**
 * Flexible partial date input component.
 * 
 * Accepts YYYY, YYYY-MM, or YYYY-MM-DD formats.
 * Validates on blur using partialDateSchema.
 * Clear button (X) sets value to null.
 */
export function DateInput({
  value,
  onChange,
  label = 'Release Date',
}: DateInputProps) {
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
    const result = partialDateSchema.safeParse(trimmed || null);
    
    if (!result.success) {
      const errorMessage = result.error.errors[0]?.message || 'Invalid date format';
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
    <div className="space-y-1">
      <label className="text-sm text-zinc-400">{label}</label>
      <div className="relative">
        <Input
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          placeholder="e.g., 2024 or 2024-05-15"
          className={cn(
            'bg-zinc-800 border-zinc-700 pr-8',
            error && 'border-red-500'
          )}
        />
        {localValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
            aria-label="Clear date"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {showHint && (
        <p className="text-xs text-zinc-500">Format: YYYY, YYYY-MM, or YYYY-MM-DD</p>
      )}
      {showError && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
