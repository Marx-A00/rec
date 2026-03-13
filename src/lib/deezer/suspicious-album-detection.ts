// src/lib/deezer/suspicious-album-detection.ts
/**
 * Title-based detection for non-standard album releases.
 * Used by the playlist import preview to flag albums that are likely
 * compilations, deluxe reissues, live recordings, etc.
 *
 * These albums are shown with a yellow warning badge and auto-deselected
 * in the import dialog, but can still be manually selected by the user.
 */

// ============================================================================
// Types
// ============================================================================

export interface AlbumWarning {
  /** Machine-readable warning category */
  type:
    | 'compilation'
    | 'deluxe'
    | 'remastered'
    | 'anniversary'
    | 'live'
    | 'acoustic'
    | 'remix'
    | 'soundtrack'
    | 'demo';
  /** Human-readable label for the UI badge */
  label: string;
}

// ============================================================================
// Detection Patterns
// ============================================================================

/**
 * Ordered list of detection rules. First match wins.
 * Ordered by "most clearly unwanted" first.
 */
const DETECTION_RULES: Array<{
  type: AlbumWarning['type'];
  label: string;
  pattern: RegExp;
}> = [
  // Compilation-like releases
  {
    type: 'compilation',
    label: 'Compilation',
    pattern:
      /\b(greatest\s+hits|best\s+of|essentials|anthology|the\s+collection|complete\s+collection|collected|gold|platinum|definitive)\b/i,
  },
  // Deluxe / expanded editions
  {
    type: 'deluxe',
    label: 'Deluxe',
    pattern:
      /\b(deluxe\s+(edition|version)|expanded\s+edition|super\s+deluxe|deluxe)\b/i,
  },
  // Remastered releases
  {
    type: 'remastered',
    label: 'Remastered',
    pattern: /\b(re-?master(ed)?)\b/i,
  },
  // Anniversary editions
  {
    type: 'anniversary',
    label: 'Anniversary',
    pattern: /\banniversary\b/i,
  },
  // Live recordings
  {
    type: 'live',
    label: 'Live',
    pattern:
      /\b(live\s+at|live\s+in|live\s+from|unplugged)\b|\(live\)|\[live\]|\blive$/i,
  },
  // Acoustic / stripped versions
  {
    type: 'acoustic',
    label: 'Acoustic',
    pattern: /\b(acoustic|stripped)\b/i,
  },
  // Remix albums
  {
    type: 'remix',
    label: 'Remix',
    pattern: /\bremix(es|ed)?\b/i,
  },
  // Soundtracks
  {
    type: 'soundtrack',
    label: 'Soundtrack',
    pattern: /\b(soundtrack|ost)\b/i,
  },
  // Demo collections
  {
    type: 'demo',
    label: 'Demo',
    pattern: /\bdemos?\b/i,
  },
];

// ============================================================================
// Detection Function
// ============================================================================

/**
 * Check an album title against suspicious patterns.
 * Returns the first matching warning, or null if the title looks normal.
 *
 * @example
 * detectSuspiciousTitle("Abbey Road")                      // null
 * detectSuspiciousTitle("Abbey Road (Remastered)")         // { type: 'remastered', label: 'Remastered' }
 * detectSuspiciousTitle("Greatest Hits Vol. 2")            // { type: 'compilation', label: 'Compilation' }
 * detectSuspiciousTitle("MTV Unplugged in New York")       // { type: 'live', label: 'Live' }
 */
export function detectSuspiciousTitle(title: string): AlbumWarning | null {
  for (const rule of DETECTION_RULES) {
    if (rule.pattern.test(title)) {
      return { type: rule.type, label: rule.label };
    }
  }
  return null;
}
