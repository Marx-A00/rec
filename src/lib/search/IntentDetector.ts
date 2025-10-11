// src/lib/search/IntentDetector.ts
import Fuzzysort from 'fuzzysort';
import type { MusicBrainzRecording } from './RecordingDataExtractor';

export enum SearchIntent {
  TRACK = 'TRACK',
  ARTIST = 'ARTIST',
  ALBUM = 'ALBUM',
  MIXED = 'MIXED',
}

export interface IntentAnalysis {
  intent: SearchIntent;
  confidence: number;
  matchedEntity: {
    type: 'recording' | 'artist' | 'album';
    id: string;
    name: string;
  };
  reasoning: string;
  metadata: {
    trackScore: number;
    artistScore: number;
    albumScore: number;
    mbScore: number;
  };
}

export class IntentDetector {
  // Thresholds for intent detection
  private readonly TRACK_THRESHOLD = 0.85;
  private readonly ARTIST_THRESHOLD = 0.80;
  private readonly ALBUM_THRESHOLD = 0.80;
  private readonly MB_SCORE_HIGH = 95;

  /**
   * Analyze recordings to determine search intent
   */
  analyze(query: string, recordings: MusicBrainzRecording[]): IntentAnalysis {
    const normalizedQuery = query.toLowerCase().trim();
    const topRecording = recordings[0];

    if (!topRecording) {
      return {
        intent: SearchIntent.MIXED,
        confidence: 0,
        matchedEntity: { type: 'recording', id: '', name: '' },
        reasoning: 'No recordings found',
        metadata: { trackScore: 0, artistScore: 0, albumScore: 0, mbScore: 0 }
      };
    }

    const mbScore = topRecording.score || 0;

    // Step 1: Check track title match
    const trackScore = this.fuzzySimilarity(normalizedQuery, topRecording.title);

    if (trackScore >= this.TRACK_THRESHOLD || mbScore >= this.MB_SCORE_HIGH) {
      return {
        intent: SearchIntent.TRACK,
        confidence: Math.max(trackScore, mbScore / 100),
        matchedEntity: {
          type: 'recording',
          id: topRecording.id,
          name: topRecording.title
        },
        reasoning: `High similarity to track title "${topRecording.title}" (score: ${trackScore.toFixed(2)}, MB score: ${mbScore})`,
        metadata: { trackScore, artistScore: 0, albumScore: 0, mbScore }
      };
    }

    // Step 2: Check artist name match (including aliases)
    const artistMatch = this.matchArtist(normalizedQuery, topRecording['artist-credit']);

    if (artistMatch.score >= this.ARTIST_THRESHOLD) {
      return {
        intent: SearchIntent.ARTIST,
        confidence: artistMatch.score,
        matchedEntity: {
          type: 'artist',
          id: artistMatch.artistId,
          name: artistMatch.artistName
        },
        reasoning: `High similarity to artist name "${artistMatch.artistName}" (score: ${artistMatch.score.toFixed(2)})`,
        metadata: { trackScore, artistScore: artistMatch.score, albumScore: 0, mbScore }
      };
    }

    // Step 3: Check album title match
    const albumMatch = this.matchAlbums(normalizedQuery, topRecording.releases || []);

    if (albumMatch.similarity >= this.ALBUM_THRESHOLD) {
      return {
        intent: SearchIntent.ALBUM,
        confidence: albumMatch.similarity,
        matchedEntity: {
          type: 'album',
          id: albumMatch.releaseGroupId,
          name: albumMatch.title
        },
        reasoning: `High similarity to album title "${albumMatch.title}" (score: ${albumMatch.similarity.toFixed(2)})`,
        metadata: { trackScore, artistScore: artistMatch.score, albumScore: albumMatch.similarity, mbScore }
      };
    }

    // Step 4: No strong match - mixed intent
    return {
      intent: SearchIntent.MIXED,
      confidence: 0.5,
      matchedEntity: {
        type: 'recording',
        id: topRecording.id,
        name: topRecording.title
      },
      reasoning: `No strong match (track: ${trackScore.toFixed(2)}, artist: ${artistMatch.score.toFixed(2)}, album: ${albumMatch.similarity.toFixed(2)})`,
      metadata: { trackScore, artistScore: artistMatch.score, albumScore: albumMatch.similarity, mbScore }
    };
  }

  /**
   * Calculate fuzzy string similarity using fuzzysort
   * Returns a normalized confidence score between 0 (no match) and 1 (perfect match)
   *
   * Fuzzysort is particularly good for:
   * - Typo tolerance ("Travis Scot" → "Travis Scott")
   * - Special character handling ("A$AP Rocky" → "ASAP Rocky")
   * - Spacing variations ("sickomode" → "sicko mode")
   * - Case insensitive matching
   */
  private fuzzySimilarity(query: string, target: string): number {
    // Normalize strings
    const normalizedQuery = query.toLowerCase().trim();
    const normalizedTarget = target.toLowerCase().trim();

    // Exact match fast path
    if (normalizedQuery === normalizedTarget) {
      return 1.0;
    }

    // Use fuzzysort for fuzzy matching
    const result = Fuzzysort.single(normalizedQuery, normalizedTarget);

    if (!result) {
      return 0.0;
    }

    // Convert fuzzysort score (-5000 to 0) to 0-1 range
    // Fuzzysort scores: -5000 (bad) to 0 (perfect)
    const MIN_SCORE = -5000;
    return Math.max(0, (result.score - MIN_SCORE) / Math.abs(MIN_SCORE));
  }

  /**
   * Check if query matches artist name or aliases
   */
  private matchArtist(
    query: string,
    artistCredit: MusicBrainzRecording['artist-credit']
  ): { score: number; artistId: string; artistName: string } {
    const artist = artistCredit?.[0]?.artist;

    if (!artist) {
      return { score: 0, artistId: '', artistName: '' };
    }

    // Build array of names to check (primary name + aliases)
    const namesToCheck = [
      artist.name,
      ...(artist.aliases || []).map((a) => a.name)
    ];

    // Find best fuzzy match using fuzzysort
    const results = Fuzzysort.go(query, namesToCheck, {
      limit: 1,
      threshold: -5000
    });

    if (results.length === 0) {
      return { score: 0, artistId: artist.id, artistName: artist.name };
    }

    const best = results[0];
    const MIN_SCORE = -5000;
    const normalized = Math.max(0, (best.score - MIN_SCORE) / Math.abs(MIN_SCORE));

    return {
      score: normalized,
      artistId: artist.id,
      artistName: artist.name
    };
  }

  /**
   * Check if query matches any album in releases
   */
  private matchAlbums(
    query: string,
    releases: MusicBrainzRecording['releases']
  ): { similarity: number; releaseGroupId: string; title: string } {
    if (!releases || releases.length === 0) {
      return { similarity: 0, releaseGroupId: '', title: '' };
    }

    // Extract unique album titles
    const albumTitles = releases
      .map((r) => ({
        title: r['release-group']?.title || r.title,
        releaseGroupId: r['release-group']?.id || r.id
      }))
      .filter((v, i, a) => a.findIndex((t) => t.releaseGroupId === v.releaseGroupId) === i);

    // Find best fuzzy match
    const titleStrings = albumTitles.map((a) => a.title);
    const results = Fuzzysort.go(query, titleStrings, {
      limit: 1,
      threshold: -5000
    });

    if (results.length === 0) {
      return { similarity: 0, releaseGroupId: '', title: '' };
    }

    const best = results[0];
    const MIN_SCORE = -5000;
    const normalized = Math.max(0, (best.score - MIN_SCORE) / Math.abs(MIN_SCORE));
    const matchedAlbum = albumTitles[best.index];

    return {
      similarity: normalized,
      releaseGroupId: matchedAlbum.releaseGroupId,
      title: matchedAlbum.title
    };
  }
}
