/**
 * Daily Challenge Date Utilities
 * 
 * All dates for daily challenges are normalized to UTC midnight.
 * This ensures all players worldwide see the same challenge on the same "day".
 */

/**
 * Game epoch start date - used as reference point for day calculations.
 * This is the first day challenges can be generated.
 */
export const GAME_EPOCH = new Date('2026-01-01T00:00:00Z');

/**
 * Convert any date to UTC midnight (00:00:00.000Z).
 * This normalizes dates for consistent challenge keys.
 * 
 * @param date - Any Date object
 * @returns New Date object set to UTC midnight
 */
export function toUTCMidnight(date: Date): Date {
  const utcDate = new Date(date);
  utcDate.setUTCHours(0, 0, 0, 0);
  return utcDate;
}

/**
 * Calculate the number of days since the game epoch.
 * Used for deterministic album selection via modulo arithmetic.
 * 
 * @param date - The date to calculate from (will be normalized to UTC midnight)
 * @returns Number of days since GAME_EPOCH (0 on epoch day, 1 on next day, etc.)
 */
export function getDaysSinceEpoch(date: Date): number {
  const normalizedDate = toUTCMidnight(date);
  const epochTime = GAME_EPOCH.getTime();
  const currentTime = normalizedDate.getTime();
  
  const daysDiff = Math.floor((currentTime - epochTime) / (1000 * 60 * 60 * 24));
  
  // Return 0 for dates before epoch (shouldn't happen in production)
  return Math.max(0, daysDiff);
}

/**
 * Get today's date as UTC midnight.
 * Convenience function for common use case.
 */
export function getToday(): Date {
  return toUTCMidnight(new Date());
}

/**
 * Format a date as YYYY-MM-DD string (UTC).
 * Useful for logging and debugging.
 */
export function formatDateUTC(date: Date): string {
  return date.toISOString().split('T')[0];
}
