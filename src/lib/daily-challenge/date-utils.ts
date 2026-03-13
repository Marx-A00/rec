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

/**
 * Get today's date in America/Chicago (Central) timezone as a UTC midnight Date.
 *
 * This is the single source of truth for "what day is it" in the Uncover system.
 * The cron fires at 7 AM Central, so when the bootstrap runs (e.g. during a
 * late-night worker restart), we need Central-time "today" — not UTC "today".
 *
 * Example: 11:30 PM Central on March 11 = 5:30 AM UTC March 12.
 *   - `new Date()` would give March 12 (wrong for Central)
 *   - `getCentralToday()` gives March 11 at UTC midnight (correct)
 */
export function getCentralToday(): Date {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(new Date());
  const year = parts.find(p => p.type === 'year')!.value;
  const month = parts.find(p => p.type === 'month')!.value;
  const day = parts.find(p => p.type === 'day')!.value;

  // Construct UTC midnight for this Central-time date
  return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
}
