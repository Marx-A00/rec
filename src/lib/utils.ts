import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Sanitizes artist names by removing Discogs disambiguation numbers
 * e.g., "Danny Brown (2)" -> "Danny Brown", "Future (3)" -> "Future"
 */
export function sanitizeArtistName(name: string): string {
  if (!name) return name;

  // Remove disambiguation numbers in parentheses at the end
  // Matches patterns like " (2)", " (12)", " (123)" etc.
  return name.replace(/\s+\(\d+\)$/, '').trim();
}
