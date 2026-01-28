'use client';

import * as React from 'react';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface EditableFieldProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  schema?: z.ZodType;
  className?: string;
}

/**
 * Inline editable text field component.
 * 
 * Click to edit, Enter/blur to save, Escape to cancel.
 * Validates with optional Zod schema on save.
 */
export function EditableField({
  value,
  onChange,
  label,
  placeholder,
  schema,
  className,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [localValue, setLocalValue] = React.useState(value);
  const [error, setError] = React.useState<string | undefined>();
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Sync localValue when prop changes and not editing
  React.useEffect(() => {
    if (!isEditing) {
      setLocalValue(value);
    }
  }, [value, isEditing]);

  // Focus input when entering edit mode
  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    // Validate if schema provided
    if (schema) {
      const result = schema.safeParse(localValue);
      if (!result.success) {
        const errorMessage = result.error.errors[0]?.message || 'Validation failed';
        setError(errorMessage);
        // Keep edit mode active on validation error
        return;
      }
    }

    // Clear error and save
    setError(undefined);
    onChange(localValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLocalValue(value);
    setError(undefined);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className={cn('space-y-1', className)}>
        <label className="text-sm text-zinc-400">{label}</label>
        <Input
          ref={inputRef}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          placeholder={placeholder}
          className={cn(
            'bg-zinc-800 border-zinc-700',
            error && 'border-red-500'
          )}
        />
        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-1', className)}>
      <label className="text-sm text-zinc-400">{label}</label>
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="text-zinc-100 hover:bg-zinc-800 rounded px-2 py-1 cursor-pointer text-left w-full"
      >
        {value || placeholder || 'Click to edit'}
      </button>
    </div>
  );
}
