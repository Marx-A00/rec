/**
 * Utilities for detecting and handling album title variations
 * (editions, versions, remixes, etc.) for MusicBrainz matching
 */

/**
 * Keywords that indicate an album is a special edition/version
 * These typically exist as separate RELEASES under a RELEASE-GROUP in MusicBrainz
 */
const EDITION_KEYWORDS = [
  'deluxe',
  'anniversary',
  'edition',
  'special',
  'extended',
  'expanded',
  'remaster',
  'remastered',
  'collector',
  "collector's",
  'limited',
  'bonus',
  'complete',
];

const VERSION_KEYWORDS = [
  'remix',
  'mix',
  'live',
  'unplugged',
  'acoustic',
  'symphonic',
  'orchestral',
  'instrumental',
  'version',
  'ver.',
  'sped up',
  'slowed',
  'super slowed',
  // Spanish/Portuguese live
  'en vivo',
  'ao vivo',
];

/**
 * Featuring patterns - these are artist credit issues, not edition issues
 * We detect these separately so we don't confuse them with editions
 */
const FEATURING_PATTERNS = [
  /\(feat\.\s+[^)]+\)/i,
  /\(ft\.\s+[^)]+\)/i,
  /\(with\s+[^)]+\)/i,
  /\(featuring\s+[^)]+\)/i,
  /\[feat\.\s+[^\]]+\]/i,
  /\[ft\.\s+[^\]]+\]/i,
  /\[with\s+[^\]]+\]/i,
];

export interface TitleAnalysis {
  /** Original title as provided */
  originalTitle: string;
  /** Whether this appears to be a special edition/version */
  isEditionOrVersion: boolean;
  /** Whether this has a featuring artist in the title */
  hasFeaturing: boolean;
  /** The detected edition/version text (e.g., "10th Anniversary Edition") */
  editionText: string | null;
  /** The detected featuring text (e.g., "feat. Travis Scott") */
  featuringText: string | null;
  /** Base title with edition/version stripped (for release-group search) */
  baseTitle: string;
  /** Specific keywords detected */
  detectedKeywords: string[];
}

/**
 * Analyze an album title to detect editions, versions, and featuring artists
 *
 * @example
 * analyzeTitle("This Is Acting (10th Anniversary Edition)")
 * // Returns:
 * // {
 * //   originalTitle: "This Is Acting (10th Anniversary Edition)",
 * //   isEditionOrVersion: true,
 * //   hasFeaturing: false,
 * //   editionText: "10th Anniversary Edition",
 * //   featuringText: null,
 * //   baseTitle: "This Is Acting",
 * //   detectedKeywords: ["anniversary", "edition"]
 * // }
 *
 * @example
 * analyzeTitle("Rosary (feat. Travis Scott)")
 * // Returns:
 * // {
 * //   originalTitle: "Rosary (feat. Travis Scott)",
 * //   isEditionOrVersion: false,
 * //   hasFeaturing: true,
 * //   editionText: null,
 * //   featuringText: "feat. Travis Scott",
 * //   baseTitle: "Rosary (feat. Travis Scott)", // Keep featuring in base title
 * //   detectedKeywords: []
 * // }
 */
export function analyzeTitle(title: string): TitleAnalysis {
  const result: TitleAnalysis = {
    originalTitle: title,
    isEditionOrVersion: false,
    hasFeaturing: false,
    editionText: null,
    featuringText: null,
    baseTitle: title,
    detectedKeywords: [],
  };

  // Check for featuring patterns first
  for (const pattern of FEATURING_PATTERNS) {
    const match = title.match(pattern);
    if (match) {
      result.hasFeaturing = true;
      // Extract just the inner text without parentheses/brackets
      result.featuringText = match[0].replace(/^[\[(]|[\])]$/g, '').trim();
      break;
    }
  }

  // Find parenthetical or bracketed content
  const parentheticalMatches = title.match(/\([^)]+\)|\[[^\]]+\]/g) || [];

  for (const match of parentheticalMatches) {
    const innerText = match.slice(1, -1).toLowerCase(); // Remove parens/brackets

    // Skip if this is a featuring pattern
    if (
      innerText.startsWith('feat') ||
      innerText.startsWith('ft') ||
      innerText.startsWith('with ') ||
      innerText.startsWith('featuring')
    ) {
      continue;
    }

    // Check for edition keywords
    for (const keyword of EDITION_KEYWORDS) {
      if (innerText.includes(keyword)) {
        result.isEditionOrVersion = true;
        result.editionText = match.slice(1, -1); // Original case
        result.detectedKeywords.push(keyword);
      }
    }

    // Check for version keywords
    for (const keyword of VERSION_KEYWORDS) {
      if (innerText.includes(keyword)) {
        result.isEditionOrVersion = true;
        result.editionText = match.slice(1, -1); // Original case
        if (!result.detectedKeywords.includes(keyword)) {
          result.detectedKeywords.push(keyword);
        }
      }
    }
  }

  // If we detected an edition/version, create the base title
  if (result.isEditionOrVersion && result.editionText) {
    // Remove the edition/version parenthetical from title
    const editionPattern = new RegExp(
      `\\s*[\\(\\[]${escapeRegex(result.editionText)}[\\)\\]]`,
      'i'
    );
    result.baseTitle = title.replace(editionPattern, '').trim();
  }

  return result;
}

/**
 * Check if a title appears to be a special edition or version
 * Quick check without full analysis
 */
export function isEditionOrVersion(title: string): boolean {
  const lowerTitle = title.toLowerCase();

  // Check parenthetical/bracketed content
  const parentheticalMatches = title.match(/\([^)]+\)|\[[^\]]+\]/g) || [];

  for (const match of parentheticalMatches) {
    const innerText = match.slice(1, -1).toLowerCase();

    // Skip featuring patterns
    if (
      innerText.startsWith('feat') ||
      innerText.startsWith('ft') ||
      innerText.startsWith('with ') ||
      innerText.startsWith('featuring')
    ) {
      continue;
    }

    // Check all keywords
    const allKeywords = [...EDITION_KEYWORDS, ...VERSION_KEYWORDS];
    for (const keyword of allKeywords) {
      if (innerText.includes(keyword)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Extract the base title (without edition/version suffix) for release-group search
 */
export function getBaseTitle(title: string): string {
  const analysis = analyzeTitle(title);
  return analysis.baseTitle;
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
