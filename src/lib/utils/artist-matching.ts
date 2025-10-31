// src/lib/utils/artist-matching.ts
/**
 * Intelligent artist matching between Spotify and MusicBrainz
 * Uses multiple signals to correctly match artists with the same name
 */

import { normalizeString } from './string-similarity';

// ========================================
// Types
// ========================================

export interface MusicBrainzArtistForMatching {
  id: string;
  name: string;
  disambiguation?: string;
  country?: string;
  type?: string;
  lifeSpan?: {
    begin?: string;
    end?: string;
    ended?: boolean;
  };
}

export interface SpotifyArtistForMatching {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
}

export interface ArtistMatchResult {
  spotifyId: string;
  score: number;
  signals: {
    genreDisambiguationMatch: number;
    countryMatch: number;
    formationYearSimilarity: number;
    nameMatch: number;
    popularityBonus: number;
  };
}

// ========================================
// Genre/Disambiguation Keyword Extraction
// ========================================

/**
 * Extract genre/style keywords from MusicBrainz disambiguation field
 * e.g., "UK death metal band" → ["death metal", "metal"]
 */
function extractDisambiguationKeywords(disambiguation?: string): string[] {
  if (!disambiguation) return [];

  const normalized = disambiguation.toLowerCase();
  const keywords: string[] = [];

  // Common genre patterns in disambiguation
  const genrePatterns = [
    // Specific genres
    /death metal/g,
    /black metal/g,
    /thrash metal/g,
    /heavy metal/g,
    /doom metal/g,
    /power metal/g,
    /progressive metal/g,
    /metalcore/g,
    /deathcore/g,
    /grindcore/g,
    /hardcore/g,
    /punk rock/g,
    /hard rock/g,
    /alternative rock/g,
    /indie rock/g,
    /post-punk/g,
    /new wave/g,
    /synthwave/g,
    /electronic/g,
    /techno/g,
    /house music/g,
    /hip hop/g,
    /rap/g,
    /r&b/g,
    /soul/g,
    /jazz/g,
    /blues/g,
    /country/g,
    /folk/g,
    /classical/g,
    /pop/g,
    /rock/g,
    /metal/g,
  ];

  for (const pattern of genrePatterns) {
    const matches = normalized.match(pattern);
    if (matches) {
      keywords.push(...matches.map(m => m.trim()));
    }
  }

  return [...new Set(keywords)]; // Remove duplicates
}

/**
 * Extract country/location keywords from disambiguation
 * e.g., "UK death metal band" → "gb"
 * e.g., "Canadian rock band" → "ca"
 */
function extractCountryFromDisambiguation(
  disambiguation?: string
): string | undefined {
  if (!disambiguation) return undefined;

  const normalized = disambiguation.toLowerCase();

  // Country name mappings
  const countryMappings: Record<string, string> = {
    uk: 'GB',
    'united kingdom': 'GB',
    british: 'GB',
    england: 'GB',
    english: 'GB',
    scotland: 'GB',
    scottish: 'GB',
    wales: 'GB',
    welsh: 'GB',
    us: 'US',
    usa: 'US',
    'united states': 'US',
    american: 'US',
    canada: 'CA',
    canadian: 'CA',
    australia: 'AU',
    australian: 'AU',
    germany: 'DE',
    german: 'DE',
    france: 'FR',
    french: 'FR',
    sweden: 'SE',
    swedish: 'SE',
    norway: 'NO',
    norwegian: 'NO',
    finland: 'FI',
    finnish: 'FI',
    denmark: 'DK',
    danish: 'DK',
    netherlands: 'NL',
    dutch: 'NL',
    belgium: 'BE',
    belgian: 'BE',
    italy: 'IT',
    italian: 'IT',
    spain: 'ES',
    spanish: 'ES',
    japan: 'JP',
    japanese: 'JP',
    brazil: 'BR',
    brazilian: 'BR',
    mexico: 'MX',
    mexican: 'MX',
  };

  for (const [keyword, countryCode] of Object.entries(countryMappings)) {
    if (normalized.includes(keyword)) {
      return countryCode;
    }
  }

  return undefined;
}

// ========================================
// Genre Matching
// ========================================

/**
 * Calculate genre overlap between Spotify genres and MB disambiguation
 * Uses Jaccard similarity: intersection / union
 */
function calculateGenreOverlap(
  spotifyGenres: string[],
  mbDisambiguation?: string
): number {
  if (spotifyGenres.length === 0 && !mbDisambiguation) return 0;
  if (spotifyGenres.length === 0 || !mbDisambiguation) return 0;

  const mbKeywords = extractDisambiguationKeywords(mbDisambiguation);
  if (mbKeywords.length === 0) return 0;

  // Normalize Spotify genres for comparison
  const normalizedSpotifyGenres = spotifyGenres.map(g => normalizeString(g));
  const normalizedMbKeywords = mbKeywords.map(k => normalizeString(k));

  // Calculate intersection
  let matches = 0;
  for (const mbKeyword of normalizedMbKeywords) {
    for (const spotifyGenre of normalizedSpotifyGenres) {
      // Check if keyword is contained in genre or vice versa
      if (
        spotifyGenre.includes(mbKeyword) ||
        mbKeyword.includes(spotifyGenre)
      ) {
        matches++;
        break;
      }
    }
  }

  // Jaccard similarity
  const union =
    normalizedSpotifyGenres.length + normalizedMbKeywords.length - matches;
  return union > 0 ? matches / union : 0;
}

// ========================================
// Country Matching
// ========================================

/**
 * Check if Spotify genres contain country-specific keywords
 * that match the MusicBrainz country code
 */
function matchCountry(
  spotifyGenres: string[],
  mbCountry?: string,
  mbDisambiguation?: string
): boolean {
  // First, try to get country from MusicBrainz record
  let targetCountry = mbCountry;

  // If no country in MB record, try to extract from disambiguation
  if (!targetCountry && mbDisambiguation) {
    targetCountry = extractCountryFromDisambiguation(mbDisambiguation);
  }

  if (!targetCountry) return false;

  // Country keyword mappings
  const countryKeywords: Record<string, string[]> = {
    GB: ['uk', 'british', 'english', 'scottish', 'welsh', 'london'],
    US: ['american', 'us', 'usa', 'new york', 'la', 'nashville'],
    CA: ['canadian', 'toronto', 'montreal', 'vancouver'],
    AU: ['australian', 'aussie', 'sydney', 'melbourne'],
    DE: ['german', 'deutsch', 'berlin'],
    FR: ['french', 'paris'],
    SE: ['swedish', 'stockholm', 'gothenburg'],
    NO: ['norwegian', 'oslo'],
    FI: ['finnish', 'helsinki'],
    DK: ['danish', 'copenhagen'],
    NL: ['dutch', 'amsterdam'],
    IT: ['italian', 'rome', 'milan'],
    ES: ['spanish', 'madrid', 'barcelona'],
    JP: ['japanese', 'tokyo'],
    BR: ['brazilian', 'sao paulo', 'rio'],
    MX: ['mexican', 'mexico city'],
  };

  const keywords = countryKeywords[targetCountry] || [];
  if (keywords.length === 0) return false;

  // Check if any Spotify genre contains country keywords
  const normalizedGenres = spotifyGenres.map(g => normalizeString(g)).join(' ');

  return keywords.some(keyword => normalizedGenres.includes(keyword));
}

// ========================================
// Formation Year Similarity
// ========================================

/**
 * Calculate similarity based on formation year
 * Prefer artists formed in similar time periods
 */
function calculateFormationYearSimilarity(mbLifeSpan?: {
  begin?: string;
  end?: string;
}): number {
  if (!mbLifeSpan?.begin) return 0.5; // Neutral score if unknown

  // Extract year from lifeSpan.begin (format: "YYYY" or "YYYY-MM-DD")
  const yearMatch = mbLifeSpan.begin.match(/^(\d{4})/);
  if (!yearMatch) return 0.5;

  const year = parseInt(yearMatch[1], 10);
  const currentYear = new Date().getFullYear();

  // Categorize by era
  if (year < 1970) return 0.3; // Classic/vintage
  if (year < 1990) return 0.5; // 70s-80s
  if (year < 2000) return 0.7; // 90s
  if (year < 2010) return 0.8; // 2000s
  if (year < currentYear - 5) return 0.9; // Established
  return 1.0; // Recent/new

  // Note: This is a simplified heuristic. In a more sophisticated version,
  // we could compare against Spotify track release dates if available.
}

// ========================================
// Main Matching Algorithm
// ========================================

/**
 * Calculate match score between a Spotify artist and a MusicBrainz artist
 * Returns score from 0-100 based on multiple signals
 */
export function calculateArtistMatchScore(
  spotifyArtist: SpotifyArtistForMatching,
  mbArtist: MusicBrainzArtistForMatching
): ArtistMatchResult {
  const signals = {
    genreDisambiguationMatch: 0,
    countryMatch: 0,
    formationYearSimilarity: 0,
    nameMatch: 0,
    popularityBonus: 0,
  };

  // 1. Genre/Disambiguation overlap (40 points max)
  const genreOverlap = calculateGenreOverlap(
    spotifyArtist.genres,
    mbArtist.disambiguation
  );
  signals.genreDisambiguationMatch = genreOverlap * 40;

  // 2. Country match (20 points if matched)
  const countryMatches = matchCountry(
    spotifyArtist.genres,
    mbArtist.country,
    mbArtist.disambiguation
  );
  signals.countryMatch = countryMatches ? 20 : 0;

  // 3. Formation year similarity (15 points max)
  const yearSimilarity = calculateFormationYearSimilarity(mbArtist.lifeSpan);
  signals.formationYearSimilarity = yearSimilarity * 15;

  // 4. Exact name match (15 points if exact match after normalization)
  const normalizedSpotifyName = normalizeString(spotifyArtist.name);
  const normalizedMbName = normalizeString(mbArtist.name);
  signals.nameMatch = normalizedSpotifyName === normalizedMbName ? 15 : 0;

  // 5. Popularity bonus (10 points max for high popularity)
  // Prefer more popular artists as they're more likely to be correct matches
  signals.popularityBonus = (spotifyArtist.popularity / 100) * 10;

  // Total score
  const totalScore =
    signals.genreDisambiguationMatch +
    signals.countryMatch +
    signals.formationYearSimilarity +
    signals.nameMatch +
    signals.popularityBonus;

  return {
    spotifyId: spotifyArtist.id,
    score: Math.round(totalScore * 10) / 10, // Round to 1 decimal
    signals,
  };
}

/**
 * Find the best Spotify match for a MusicBrainz artist
 * from a list of candidates with the same name
 *
 * @param mbArtist - MusicBrainz artist to match
 * @param spotifyCandidates - Spotify artists with matching name
 * @param threshold - Minimum score to accept (default: 50)
 * @returns Best match if score >= threshold, otherwise null
 */
export function findBestSpotifyMatch(
  mbArtist: MusicBrainzArtistForMatching,
  spotifyCandidates: SpotifyArtistForMatching[],
  threshold = 50
): ArtistMatchResult | null {
  if (spotifyCandidates.length === 0) return null;

  // Calculate scores for all candidates
  const matches = spotifyCandidates.map(candidate =>
    calculateArtistMatchScore(candidate, mbArtist)
  );

  // Find best match
  const bestMatch = matches.reduce((best, current) =>
    current.score > best.score ? current : best
  );

  // Return only if above threshold
  return bestMatch.score >= threshold ? bestMatch : null;
}
