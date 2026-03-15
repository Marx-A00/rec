/**
 * Utilities for handling date-only database fields (`@db.Date` in Prisma).
 *
 * Prisma serialises `@db.Date` columns as UTC-midnight ISO strings, e.g.
 * `"2026-03-15T00:00:00.000Z"`. Calling `new Date()` on that value creates a
 * Date at UTC midnight, but any formatter that uses the **local** timezone
 * (e.g. `toLocaleDateString()`, date-fns `format()`) will shift it back one
 * day in western-hemisphere timezones.
 *
 * The functions below extract the `YYYY-MM-DD` portion first and construct a
 * **local** Date, so the displayed date always matches the stored value.
 */

/**
 * Parse a date-only DB value into a local `Date` without timezone shift.
 *
 * Accepts ISO strings (`"2026-03-15T00:00:00.000Z"`), plain date strings
 * (`"2026-03-15"`), or existing `Date` objects.
 */
export function parseDateOnly(value: string | Date): Date {
  const raw = typeof value === 'string' ? value : value.toISOString();
  const datePart = raw.includes('T') ? raw.split('T')[0] : raw;
  const [y, m, d] = datePart.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Format a date-only DB value for display, avoiding the UTC-midnight
 * timezone-shift bug.
 *
 * @param value  The raw date value from GraphQL / Prisma
 * @param opts   `Intl.DateTimeFormat` options (defaults to short date)
 *
 * @example
 *   formatDateOnly(album.releaseDate)
 *   // => "Mar 15, 2026"
 *
 *   formatDateOnly(challenge.date, { weekday: 'short', month: 'short', day: 'numeric' })
 *   // => "Sun, Mar 15"
 */
export function formatDateOnly(
  value: string | Date,
  opts: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }
): string {
  return parseDateOnly(value).toLocaleDateString('en-US', opts);
}
