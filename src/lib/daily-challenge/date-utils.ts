/**
 * Daily Challenge Date Utilities
 *
 * All dates for daily challenges are normalized to UTC midnight.
 * This ensures all players worldwide see the same challenge on the same "day".
 */

/**
 * The earliest date the Uncover game launched.
 * Used by archive pages to prevent browsing before the game existed.
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
