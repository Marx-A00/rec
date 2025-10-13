// src/lib/search/IntentDetector.ts
import * as Fuzzysort from 'fuzzysort';
import type { RecordingSearchResult } from '../musicbrainz/basic-service';

// TODO: Rename RecordingSearchResult in basic-service.ts to MusicBrainzRecordingSearchResult for clarity
type MusicBrainzRecordingSearchResult = RecordingSearchResult;

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
  // Weights for mixing different result types (track/artist/album)
  weights: {
    track: number;    // 0.0 - 1.0
    artist: number;   // 0.0 - 1.0
    album: number;    // 0.0 - 1.0
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
  analyze(query: string, recordings: MusicBrainzRecordingSearchResult[]): IntentAnalysis {
    const normalizedQuery = query.toLowerCase().trim();
    const topRecording = recordings[0];

    if (!topRecording) {
      return {
        intent: SearchIntent.MIXED,
        confidence: 0,
        matchedEntity: { type: 'recording', id: '', name: '' },
        reasoning: 'No recordings found',
        metadata: { trackScore: 0, artistScore: 0, albumScore: 0, mbScore: 0 },
        weights: { track: 0.33, artist: 0.33, album: 0.34 }
      };
    }

    const mbScore = topRecording.score || 0;

    // Calculate all scores first
    const trackScore = this.fuzzySimilarity(normalizedQuery, topRecording.title);
    const artistMatch = this.matchArtist(normalizedQuery, topRecording.artistCredit);
    const albumMatch = this.matchAlbums(normalizedQuery, topRecording.releases || []);

    // Determine primary intent (highest score)
    const scores = {
      track: trackScore,
      artist: artistMatch.score,
      album: albumMatch.similarity
    };

    const primaryIntent = this.determinePrimaryIntent(scores, mbScore);

    // Calculate weights based on all scores
    const weights = this.calculateWeights(scores);

    // Build response based on primary intent
    const confidence = Math.max(scores[primaryIntent], mbScore / 100);

    let matchedEntity: { type: 'recording' | 'artist' | 'album'; id: string; name: string };
    let reasoning: string;

    if (primaryIntent === 'track') {
      matchedEntity = {
        type: 'recording',
        id: topRecording.id,
        name: topRecording.title
      };
      reasoning = `Primary match: Track "${topRecording.title}" (score: ${trackScore.toFixed(2)}, MB: ${mbScore})`;

      // If artist also matches well, mention it
      if (scores.artist >= 0.7) {
        reasoning += ` | Also matches artist "${artistMatch.artistName}"`;
      }
    } else if (primaryIntent === 'artist') {
      matchedEntity = {
        type: 'artist',
        id: artistMatch.artistId,
        name: artistMatch.artistName
      };
      reasoning = `Primary match: Artist "${artistMatch.artistName}" (score: ${artistMatch.score.toFixed(2)})`;

      // If track title also matches, mention it
      if (scores.track >= 0.7) {
        reasoning += ` | Also found track "${topRecording.title}"`;
      }
    } else if (primaryIntent === 'album') {
      matchedEntity = {
        type: 'album',
        id: albumMatch.releaseGroupId,
        name: albumMatch.title
      };
      reasoning = `Primary match: Album "${albumMatch.title}" (score: ${albumMatch.similarity.toFixed(2)})`;
    } else {
      matchedEntity = {
        type: 'recording',
        id: topRecording.id,
        name: topRecording.title
      };
      reasoning = `Mixed intent (track: ${trackScore.toFixed(2)}, artist: ${artistMatch.score.toFixed(2)}, album: ${albumMatch.similarity.toFixed(2)})`;
    }

    return {
      intent: primaryIntent === 'track' ? SearchIntent.TRACK :
              primaryIntent === 'artist' ? SearchIntent.ARTIST :
              primaryIntent === 'album' ? SearchIntent.ALBUM : SearchIntent.MIXED,
      confidence,
      matchedEntity,
      reasoning,
      metadata: {
        trackScore,
        artistScore: artistMatch.score,
        albumScore: albumMatch.similarity,
        mbScore
      },
      weights
    };
  }

  /**
   * Determine primary intent based on scores
   */
  private determinePrimaryIntent(
    scores: { track: number; artist: number; album: number },
    mbScore: number
  ): 'track' | 'artist' | 'album' | 'mixed' {
    const maxScore = Math.max(scores.track, scores.artist, scores.album);

    // If MusicBrainz score is very high, trust it
    if (mbScore >= this.MB_SCORE_HIGH && scores.track >= this.TRACK_THRESHOLD) {
      return 'track';
    }

    // If highest score is above threshold, use it
    if (maxScore >= this.TRACK_THRESHOLD) {
      if (scores.track === maxScore) return 'track';
      if (scores.artist === maxScore) return 'artist';
      if (scores.album === maxScore) return 'album';
    }

    // Otherwise, mixed intent
    return 'mixed';
  }

  /**
   * Calculate weights for mixing result types
   * Weights should sum to 1.0
   */
  private calculateWeights(scores: { track: number; artist: number; album: number }): {
    track: number;
    artist: number;
    album: number;
  } {
    // Normalize scores to weights
    const total = scores.track + scores.artist + scores.album;

    if (total === 0) {
      // No matches, equal weights
      return { track: 0.33, artist: 0.33, album: 0.34 };
    }

    // Convert scores to weights (higher score = higher weight)
    // Add a minimum weight of 0.1 for each type to ensure diversity
    const MIN_WEIGHT = 0.1;
    const AVAILABLE_WEIGHT = 1.0 - (MIN_WEIGHT * 3);

    const trackWeight = MIN_WEIGHT + (scores.track / total) * AVAILABLE_WEIGHT;
    const artistWeight = MIN_WEIGHT + (scores.artist / total) * AVAILABLE_WEIGHT;
    const albumWeight = MIN_WEIGHT + (scores.album / total) * AVAILABLE_WEIGHT;

    // Normalize to ensure sum = 1.0
    const sum = trackWeight + artistWeight + albumWeight;

    return {
      track: trackWeight / sum,
      artist: artistWeight / sum,
      album: albumWeight / sum
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
    artistCredit: MusicBrainzRecordingSearchResult['artistCredit']
  ): { score: number; artistId: string; artistName: string } {
    const artist = artistCredit?.[0]?.artist;

    if (!artist) {
      return { score: 0, artistId: '', artistName: '' };
    }

    // Build array of names to check (primary name + aliases if available)
    const namesToCheck = [artist.name];

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
    releases: MusicBrainzRecordingSearchResult['releases']
  ): { similarity: number; releaseGroupId: string; title: string } {
    if (!releases || releases.length === 0) {
      return { similarity: 0, releaseGroupId: '', title: '' };
    }

    // Extract unique album titles
    // Note: RecordingSearchResult has simplified release structure (just id/title)
    const albumTitles = releases
      .map((r) => ({
        title: r.title,
        releaseGroupId: r.id
      }))
      .filter((v, i, a) => a.findIndex((t) => t.releaseGroupId === v.releaseGroupId) === i);

    // Find best fuzzy match
    const results = Fuzzysort.go(query, albumTitles, {
      key: 'title',
      limit: 1,
      threshold: -5000
    });

    if (results.length === 0) {
      return { similarity: 0, releaseGroupId: '', title: '' };
    }

    const best = results[0];
    const MIN_SCORE = -5000;
    const normalized = Math.max(0, (best.score - MIN_SCORE) / Math.abs(MIN_SCORE));
    const matchedAlbum = best.obj;

    return {
      similarity: normalized,
      releaseGroupId: matchedAlbum.releaseGroupId,
      title: matchedAlbum.title
    };
  }
}
