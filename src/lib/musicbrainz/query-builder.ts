/**
 * Query builder utilities for MusicBrainz Lucene search queries.
 * Used primarily for dual-input search (album + artist) in the recommendation drawer.
 */

/**
 * Escapes special Lucene characters in a search term.
 * MusicBrainz uses Lucene query syntax, which has reserved characters.
 *
 * @param term - The search term to escape
 * @returns The escaped search term safe for Lucene queries
 */
export function escapeLuceneSpecialChars(term: string): string {
  // Lucene special characters: + - && || ! ( ) { } [ ] ^ " ~ * ? : \ /
  // We escape these to treat them as literal characters
  return term.replace(/([+\-&|!(){}[\]^"~*?:\\/])/g, '\\$1');
}

/**
 * Builds a MusicBrainz Lucene query from separate album and artist inputs.
 * Implements the dual-input search pattern for precise album lookups.
 *
 * The query includes standard filters:
 * - `status:official` - Only official releases (excludes bootlegs, promos)
 * - `NOT secondarytype:compilation` - Excludes compilation albums
 * - `NOT secondarytype:dj-mix` - Excludes DJ mix albums
 *
 * @param albumQuery - Optional album/release group title to search for
 * @param artistQuery - Optional artist name to filter by
 * @returns Lucene query string ready for MusicBrainz API, or empty string if both inputs are empty
 *
 * @example
 * // Both fields provided - precise search
 * buildDualInputQuery('Random Access Memories', 'Daft Punk')
 * // Returns: 'releasegroup:"Random Access Memories" AND artist:"Daft Punk" AND status:official AND NOT secondarytype:compilation AND NOT secondarytype:dj-mix'
 *
 * @example
 * // Album only - searches for album title
 * buildDualInputQuery('Discovery', undefined)
 * // Returns: 'releasegroup:"Discovery" AND status:official AND NOT secondarytype:compilation AND NOT secondarytype:dj-mix'
 *
 * @example
 * // Artist only - gets all releases by artist
 * buildDualInputQuery(undefined, 'Radiohead')
 * // Returns: 'artist:"Radiohead" AND status:official AND NOT secondarytype:compilation AND NOT secondarytype:dj-mix'
 *
 * @example
 * // Both empty - returns empty string
 * buildDualInputQuery('', '')
 * // Returns: ''
 */
export function buildDualInputQuery(
  albumQuery?: string,
  artistQuery?: string
): string {
  const albumTrimmed = albumQuery?.trim() || '';
  const artistTrimmed = artistQuery?.trim() || '';

  // Standard filters to exclude non-album content
  const filters =
    'AND status:official AND NOT secondarytype:compilation AND NOT secondarytype:dj-mix';

  if (albumTrimmed && artistTrimmed) {
    // Both fields: precise AND search for album by specific artist
    const escapedAlbum = escapeLuceneSpecialChars(albumTrimmed);
    const escapedArtist = escapeLuceneSpecialChars(artistTrimmed);
    return `releasegroup:"${escapedAlbum}" AND artist:"${escapedArtist}" ${filters}`;
  } else if (albumTrimmed) {
    // Album only: search for release groups matching the title
    const escapedAlbum = escapeLuceneSpecialChars(albumTrimmed);
    return `releasegroup:"${escapedAlbum}" ${filters}`;
  } else if (artistTrimmed) {
    // Artist only: get all releases by this artist
    const escapedArtist = escapeLuceneSpecialChars(artistTrimmed);
    return `artist:"${escapedArtist}" ${filters}`;
  }

  // Both empty: return empty string (no search should be performed)
  return '';
}

/**
 * Checks if a dual-input query has enough data to perform a search.
 *
 * @param albumQuery - Optional album query
 * @param artistQuery - Optional artist query
 * @returns True if at least one field has non-whitespace content
 */
export function hasSearchableInput(
  albumQuery?: string,
  artistQuery?: string
): boolean {
  const albumTrimmed = albumQuery?.trim() || '';
  const artistTrimmed = artistQuery?.trim() || '';
  return albumTrimmed.length > 0 || artistTrimmed.length > 0;
}
