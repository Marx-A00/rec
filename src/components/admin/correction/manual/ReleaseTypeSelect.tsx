'use client';

import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RELEASE_TYPES } from './validation';

export interface ReleaseTypeSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  label?: string;
}

/**
 * Release type dropdown component.
 * 
 * Uses Radix UI Select with common release type options.
 * Includes "None" option to allow clearing the field.
 */
export function ReleaseTypeSelect({
  value,
  onChange,
  label = 'Release Type',
}: ReleaseTypeSelectProps) {
  return (
    <div className="space-y-1">
      <label className="text-sm text-zinc-400">{label}</label>
      <Select
        value={value ?? 'none'}
        onValueChange={(val) => onChange(val === 'none' ? null : val)}
      >
        <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
          <SelectValue placeholder="Select type" />
        </SelectTrigger>
        <SelectContent className="bg-zinc-800 border-zinc-700">
          <SelectItem value="none" className="text-zinc-400">
            None
          </SelectItem>
          {RELEASE_TYPES.map((type) => (
            <SelectItem key={type} value={type} className="text-zinc-100">
              {type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
