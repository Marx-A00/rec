// src/lib/enrichment/fetch-artist-biography.ts
// Shared helper for fetching artist biographies from Wikipedia (primary) and Discogs (fallback)

interface MusicBrainzRelation {
  type: string;
  url?: { resource: string };
}

/**
 * Fetch artist biography from Wikipedia (via Wikidata) with Discogs fallback.
 *
 * Flow:
 * 1. Extract Wikidata QID from MusicBrainz relations
 * 2. Fetch English Wikipedia title from Wikidata sitelinks
 * 3. Fetch Wikipedia summary extract (plain text)
 * 4. If no Wikipedia bio, fall back to Discogs profile (with markup stripped)
 */
export async function fetchArtistBiography(options: {
  relations?: MusicBrainzRelation[];
  discogsId?: string | null;
  artistName: string;
}): Promise<string | undefined> {
  const { relations, discogsId, artistName } = options;

  // Step 1: Try Wikipedia via Wikidata
  if (relations) {
    const bio = await fetchWikipediaBiography(relations, artistName);
    if (bio) return bio;
  }

  // Step 2: Fall back to Discogs profile
  if (discogsId) {
    const bio = await fetchDiscogsBiography(discogsId, artistName);
    if (bio) return bio;
  }

  return undefined;
}

/**
 * Fetch biography from Wikipedia using the Wikidata QID found in MusicBrainz relations.
 */
async function fetchWikipediaBiography(
  relations: MusicBrainzRelation[],
  artistName: string
): Promise<string | undefined> {
  try {
    // Extract Wikidata QID from MusicBrainz relations
    const qid = extractWikidataQid(relations);
    if (!qid) return undefined;

    // Fetch Wikipedia title from Wikidata sitelinks
    const wikiTitle = await fetchWikipediaTitleFromWikidata(qid);
    if (!wikiTitle) return undefined;

    // Fetch Wikipedia summary extract
    const extract = await fetchWikipediaExtract(wikiTitle);
    if (!extract) return undefined;

    console.log(
      `📝 Got Wikipedia biography for "${artistName}" (${extract.length} chars)`
    );
    return extract;
  } catch (error) {
    console.warn(
      `Failed to fetch Wikipedia biography for "${artistName}":`,
      error
    );
    return undefined;
  }
}

/**
 * Extract Wikidata QID from MusicBrainz relations array.
 */
function extractWikidataQid(
  relations: MusicBrainzRelation[]
): string | undefined {
  for (const rel of relations) {
    if (rel.type === 'wikidata' && rel.url?.resource) {
      const match = rel.url.resource.match(/\/wiki\/(Q\d+)/);
      if (match) return match[1];
    }
  }
  return undefined;
}

/**
 * Fetch the English Wikipedia article title from Wikidata sitelinks.
 */
async function fetchWikipediaTitleFromWikidata(
  qid: string
): Promise<string | undefined> {
  const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=sitelinks&sitefilter=enwiki&format=json&origin=*`;
  const res = await fetch(url);
  if (!res.ok) return undefined;

  const data = await res.json();
  const title = data?.entities?.[qid]?.sitelinks?.enwiki?.title;
  return typeof title === 'string' && title.length > 0 ? title : undefined;
}

/**
 * Fetch the plain-text extract from a Wikipedia article using the REST API.
 */
async function fetchWikipediaExtract(
  title: string
): Promise<string | undefined> {
  const encodedTitle = encodeURIComponent(title);
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodedTitle}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'RecProject/1.0 (https://rec-music.org)',
    },
  });
  if (!res.ok) return undefined;

  const data = await res.json();
  const extract = data?.extract;
  return typeof extract === 'string' && extract.length > 0
    ? extract
    : undefined;
}

/**
 * Fetch biography from Discogs artist profile as a fallback.
 */
async function fetchDiscogsBiography(
  discogsId: string,
  artistName: string
): Promise<string | undefined> {
  try {
    const { unifiedArtistService } = await import(
      '@/lib/api/unified-artist-service'
    );
    const discogsArtist = await unifiedArtistService.getArtistDetails(
      discogsId,
      { source: 'discogs', skipLocalCache: true }
    );

    if (discogsArtist.profile) {
      const cleaned = stripDiscogsMarkup(discogsArtist.profile);
      if (cleaned.length > 0) {
        console.log(
          `📝 Got Discogs biography for "${artistName}" (${cleaned.length} chars)`
        );
        return cleaned;
      }
    }

    return undefined;
  } catch (error) {
    console.warn(
      `Failed to fetch Discogs biography for "${artistName}":`,
      error
    );
    return undefined;
  }
}

/**
 * Strip Discogs-specific markup from profile text.
 *
 * Discogs uses custom markup:
 * - [a=Artist Name] → Artist Name
 * - [a123] or [a=123] → remove
 * - [l=Label Name] → Label Name
 * - [m=Master ID] → remove
 * - [r=Release ID] → remove
 * - [url=http://...]text[/url] → text
 */
export function stripDiscogsMarkup(text: string): string {
  let result = text;

  // [url=...]text[/url] → text
  result = result.replace(/\[url=[^\]]*\](.*?)\[\/url\]/gi, '$1');

  // [a=Artist Name] → Artist Name (where value is not purely numeric)
  result = result.replace(/\[a=(?!\d+\])([^\]]+)\]/g, '$1');

  // [l=Label Name] → Label Name (where value is not purely numeric)
  result = result.replace(/\[l=(?!\d+\])([^\]]+)\]/g, '$1');

  // [a=123], [a123], [l=123], [m=123], [m123], [r=123], [r123] → remove
  result = result.replace(/\[[amlr]=?\d+\]/gi, '');

  // [b]...[/b] → ... (bold)
  result = result.replace(/\[b\](.*?)\[\/b\]/gi, '$1');

  // [i]...[/i] → ... (italic)
  result = result.replace(/\[i\](.*?)\[\/i\]/gi, '$1');

  // Clean up any remaining square bracket tags
  result = result.replace(/\[\/?[a-z]+\]/gi, '');

  // Clean up extra whitespace
  result = result.replace(/\n{3,}/g, '\n\n').trim();

  return result;
}
