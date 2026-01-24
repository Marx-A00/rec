/**
 * Text normalization utilities for comparing strings from different sources.
 * Handles Unicode normalization, accent removal, whitespace, and case.
 */

import type { DateComponents } from './types';

// ============================================================================
// Text Normalization
// ============================================================================

/**
 * Text normalization utilities for semantic comparison.
 * Ensures consistent comparison across different encodings and representations.
 */
export class TextNormalizer {
  /**
   * Normalize text for semantic comparison.
   *
   * Steps:
   * 1. NFD decomposition to separate base characters from diacritics
   * 2. Remove combining diacritical marks (accents, umlauts, etc.)
   * 3. Lowercase for case-insensitive comparison
   * 4. Trim and collapse whitespace
   *
   * Examples:
   * - "Café" → "cafe"
   * - "naïve" → "naive"
   * - "  Multiple   Spaces  " → "multiple spaces"
   *
   * @param text - Text to normalize (can be null/undefined)
   * @returns Normalized text (empty string if input is null/undefined)
   */
  static normalize(text: string | null | undefined): string {
    if (!text) return '';

    return text
      .normalize('NFD') // Decompose Unicode (é → e + ́)
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics (combining marks)
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' '); // Collapse whitespace
  }

  /**
   * Check if two strings are semantically equal after normalization.
   *
   * @param a - First string
   * @param b - Second string
   * @returns True if normalized strings are identical
   */
  static areEqual(
    a: string | null | undefined,
    b: string | null | undefined
  ): boolean {
    return this.normalize(a) === this.normalize(b);
  }

  /**
   * Light normalization for display - preserves case and accents,
   * only trims and collapses whitespace.
   *
   * Use this when you need to clean up display text without
   * losing visual distinctiveness.
   *
   * @param text - Text to normalize
   * @returns Whitespace-normalized text
   */
  static normalizeWhitespace(text: string | null | undefined): string {
    if (!text) return '';
    return text.trim().replace(/\s+/g, ' ');
  }
}

/**
 * Convenience function for normalization.
 * Alias for TextNormalizer.normalize().
 *
 * @param text - Text to normalize
 * @returns Normalized text
 */
export function normalizeForComparison(
  text: string | null | undefined
): string {
  return TextNormalizer.normalize(text);
}

// ============================================================================
// Date Parsing and Formatting
// ============================================================================

/**
 * Parse a date string into components.
 * Handles YYYY, YYYY-MM, and YYYY-MM-DD formats.
 *
 * Examples:
 * - "2023" → { year: 2023 }
 * - "2023-05" → { year: 2023, month: 5 }
 * - "2023-05-15" → { year: 2023, month: 5, day: 15 }
 * - "invalid" → null
 *
 * @param dateString - Date string to parse
 * @returns DateComponents or null if invalid
 */
export function parseDateComponents(
  dateString: string | null | undefined
): DateComponents | null {
  if (!dateString) return null;

  const parts = dateString.split('-');
  const year = parts[0] ? parseInt(parts[0], 10) : undefined;
  const month = parts[1] ? parseInt(parts[1], 10) : undefined;
  const day = parts[2] ? parseInt(parts[2], 10) : undefined;

  if (year === undefined || isNaN(year)) return null;

  return {
    year,
    month: month !== undefined && !isNaN(month) ? month : undefined,
    day: day !== undefined && !isNaN(day) ? day : undefined,
  };
}

/**
 * Format DateComponents back to string for display.
 *
 * Examples:
 * - { year: 2023 } → "2023"
 * - { year: 2023, month: 5 } → "2023-05"
 * - { year: 2023, month: 5, day: 15 } → "2023-05-15"
 * - null → "(unknown)"
 *
 * @param components - DateComponents to format
 * @returns Formatted date string
 */
export function formatDateComponents(
  components: DateComponents | null
): string {
  if (!components || components.year === undefined) return '(unknown)';

  const parts = [components.year.toString().padStart(4, '0')];
  if (components.month !== undefined) {
    parts.push(components.month.toString().padStart(2, '0'));
    if (components.day !== undefined) {
      parts.push(components.day.toString().padStart(2, '0'));
    }
  }
  return parts.join('-');
}
