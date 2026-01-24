/**
 * DiffEngine performs field-by-field comparisons between current album data
 * and MusicBrainz source data.
 *
 * Uses character-level diff for text, component-level for dates,
 * set operations for arrays, and position-based alignment for tracks.
 */

import { diffChars, diffWords } from 'diff';
import type { Track } from '@prisma/client';

import type { CorrectionArtistCredit } from '../types';

import type {
  ChangeType,
  TextDiff,
  TextDiffPart,
  DateDiff,
  DateComponents,
  ArrayDiff,
  ExternalIdDiff,
  TrackDiff,
  TrackListSummary,
  ArtistCreditDiff,
  MBMedium,
} from './types';
import { TextNormalizer, parseDateComponents } from './normalizers';

/**
 * DiffEngine computes field-level diffs between current album data and MusicBrainz source.
 * Uses character-level diff for text, component-level for dates, set operations for arrays.
 */
export class DiffEngine {
  /** Length threshold: use character diff below, word diff above */
  private readonly charDiffThreshold = 100;

  /**
   * Classify the change type between two values.
   * - ADDED: current is null/undefined, source has value
   * - REMOVED: current has value, source is null/undefined
   * - UNCHANGED: both null/undefined, or both equal (normalized)
   * - CONFLICT: both have different values (neither null)
   */
  classifyChange(current: unknown, source: unknown): ChangeType {
    const hasCurrentValue =
      current !== null && current !== undefined && current !== '';
    const hasSourceValue =
      source !== null && source !== undefined && source !== '';

    if (!hasCurrentValue && !hasSourceValue) return 'UNCHANGED';
    if (!hasCurrentValue && hasSourceValue) return 'ADDED';
    if (hasCurrentValue && !hasSourceValue) return 'REMOVED';

    // Both have values - check if equal
    if (typeof current === 'string' && typeof source === 'string') {
      return TextNormalizer.areEqual(current, source)
        ? 'UNCHANGED'
        : 'CONFLICT';
    }

    // For non-strings, use strict equality
    return current === source ? 'UNCHANGED' : 'CONFLICT';
  }

  /**
   * Compare text fields with character-level diff.
   * Uses character diff for short text (<100 chars), word diff for longer.
   */
  compareText(
    field: string,
    current: string | null,
    source: string | null
  ): TextDiff {
    const changeType = this.classifyChange(current, source);

    const result: TextDiff = {
      field,
      changeType,
      currentValue: current,
      sourceValue: source,
    };

    // Only compute parts for CONFLICT (both have different values)
    if (changeType === 'CONFLICT' && current && source) {
      const maxLen = Math.max(current.length, source.length);
      const diffFn = maxLen <= this.charDiffThreshold ? diffChars : diffWords;

      const changes = diffFn(current, source);
      result.parts = changes.map(
        (part): TextDiffPart => ({
          value: part.value,
          added: part.added || undefined,
          removed: part.removed || undefined,
        })
      );
    }

    return result;
  }

  /**
   * Compare release dates with component-level highlighting.
   * Shows which part changed: year, month, or day.
   */
  compareDate(current: Date | null, source: string | null): DateDiff {
    const currentComponents = current
      ? parseDateComponents(current.toISOString().split('T')[0])
      : null;
    const sourceComponents = parseDateComponents(source);

    const changeType = this.classifyDateChange(
      currentComponents,
      sourceComponents
    );

    return {
      field: 'releaseDate',
      changeType,
      current: currentComponents,
      source: sourceComponents,
      componentChanges: {
        year: this.classifyChange(
          currentComponents?.year,
          sourceComponents?.year
        ),
        month: this.classifyChange(
          currentComponents?.month,
          sourceComponents?.month
        ),
        day: this.classifyChange(currentComponents?.day, sourceComponents?.day),
      },
    };
  }

  /**
   * Classify overall date change based on components.
   */
  private classifyDateChange(
    current: DateComponents | null,
    source: DateComponents | null
  ): ChangeType {
    if (!current && !source) return 'UNCHANGED';
    if (!current && source) return 'ADDED';
    if (current && !source) return 'REMOVED';

    // Both have values - check if any component differs
    const yearEqual = current!.year === source!.year;
    const monthEqual = current!.month === source!.month;
    const dayEqual = current!.day === source!.day;

    return yearEqual && monthEqual && dayEqual ? 'UNCHANGED' : 'CONFLICT';
  }

  /**
   * Compare array fields (genres, secondaryTypes).
   * Normalizes items before comparison for case/accent insensitivity.
   */
  compareArray(field: string, current: string[], source: string[]): ArrayDiff {
    // Normalize for comparison
    const currentNormalized = new Map(
      current.map(item => [TextNormalizer.normalize(item), item])
    );
    const sourceNormalized = new Map(
      source.map(item => [TextNormalizer.normalize(item), item])
    );

    const added: string[] = [];
    const removed: string[] = [];
    const unchanged: string[] = [];

    // Find unchanged and removed (items in current)
    for (const [normKey, originalValue] of currentNormalized) {
      if (sourceNormalized.has(normKey)) {
        unchanged.push(originalValue);
      } else {
        removed.push(originalValue);
      }
    }

    // Find added (items in source not in current)
    for (const [normKey, originalValue] of sourceNormalized) {
      if (!currentNormalized.has(normKey)) {
        added.push(originalValue);
      }
    }

    // Determine overall change type
    let changeType: ChangeType = 'UNCHANGED';
    if (added.length > 0 && removed.length === 0 && current.length === 0) {
      changeType = 'ADDED';
    } else if (
      removed.length > 0 &&
      added.length === 0 &&
      source.length === 0
    ) {
      changeType = 'REMOVED';
    } else if (added.length > 0 || removed.length > 0) {
      changeType = 'CONFLICT';
    }

    return {
      field,
      changeType,
      currentItems: current,
      sourceItems: source,
      added,
      removed,
      unchanged,
    };
  }

  /**
   * Compare external ID fields (musicbrainzId, spotifyId, discogsId).
   */
  compareExternalId(
    field: 'musicbrainzId' | 'spotifyId' | 'discogsId',
    current: string | null,
    source: string | null
  ): ExternalIdDiff {
    return {
      field,
      changeType: this.classifyChange(current, source),
      currentValue: current,
      sourceValue: source,
    };
  }

  /**
   * Compare artist credits.
   * Creates display strings with joinphrases and computes name diff.
   */
  compareArtistCredits(
    current: CorrectionArtistCredit[],
    source: Array<{
      name: string;
      joinphrase?: string;
      artist: { id: string; name: string };
    }>
  ): ArtistCreditDiff {
    // Format display strings
    const currentDisplay = current.map(c => c.name).join(', ');
    const sourceDisplay = source
      .map((s, i) => {
        const name = s.name;
        const join = i < source.length - 1 ? s.joinphrase || ', ' : '';
        return name + join;
      })
      .join('');

    // Convert source to CorrectionArtistCredit format
    const sourceCredits: CorrectionArtistCredit[] = source.map(s => ({
      mbid: s.artist.id,
      name: s.name,
    }));

    // Classify overall change
    const normalizedCurrent = TextNormalizer.normalize(currentDisplay);
    const normalizedSource = TextNormalizer.normalize(sourceDisplay);

    let changeType: ChangeType;
    if (!current.length && !source.length) {
      changeType = 'UNCHANGED';
    } else if (!current.length && source.length) {
      changeType = 'ADDED';
    } else if (current.length && !source.length) {
      changeType = 'REMOVED';
    } else if (normalizedCurrent === normalizedSource) {
      changeType = 'UNCHANGED';
    } else {
      changeType = 'CONFLICT';
    }

    const result: ArtistCreditDiff = {
      changeType,
      current,
      source: sourceCredits,
      currentDisplay,
      sourceDisplay,
    };

    // Compute name diff for CONFLICT
    if (changeType === 'CONFLICT' && currentDisplay && sourceDisplay) {
      const changes = diffChars(currentDisplay, sourceDisplay);
      result.nameDiff = changes.map(
        (part): TextDiffPart => ({
          value: part.value,
          added: part.added || undefined,
          removed: part.removed || undefined,
        })
      );
    }

    return result;
  }

  /**
   * Compare track listings with position-based alignment.
   * Aligns by disc number and track position.
   */
  compareTracks(
    currentTracks: Track[],
    sourceMediums: MBMedium[]
  ): {
    trackDiffs: TrackDiff[];
    summary: TrackListSummary;
  } {
    const trackDiffs: TrackDiff[] = [];
    let matching = 0;
    let modified = 0;
    let added = 0;
    let removed = 0;

    // Flatten source tracks with disc info
    interface SourceTrack {
      discNumber: number;
      position: number;
      title: string;
      durationMs: number | null;
      mbid: string;
    }

    const sourceTracks: SourceTrack[] = [];
    for (const medium of sourceMediums) {
      for (const track of medium.tracks) {
        sourceTracks.push({
          discNumber: medium.position,
          position: track.position,
          title: track.recording.title,
          durationMs: track.recording.length ?? null,
          mbid: track.recording.id,
        });
      }
    }

    // Group current tracks by disc
    const currentByDisc = new Map<number, Track[]>();
    for (const track of currentTracks) {
      const disc = track.discNumber ?? 1;
      if (!currentByDisc.has(disc)) currentByDisc.set(disc, []);
      currentByDisc.get(disc)!.push(track);
    }

    // Group source tracks by disc
    const sourceByDisc = new Map<number, SourceTrack[]>();
    for (const track of sourceTracks) {
      if (!sourceByDisc.has(track.discNumber))
        sourceByDisc.set(track.discNumber, []);
      sourceByDisc.get(track.discNumber)!.push(track);
    }

    // Get all disc numbers
    const allDiscs = new Set([...currentByDisc.keys(), ...sourceByDisc.keys()]);

    for (const discNum of [...allDiscs].sort((a, b) => a - b)) {
      const currentDiscTracks = currentByDisc.get(discNum) || [];
      const sourceDiscTracks = sourceByDisc.get(discNum) || [];

      // Sort by position
      currentDiscTracks.sort((a, b) => a.trackNumber - b.trackNumber);
      sourceDiscTracks.sort((a, b) => a.position - b.position);

      const maxLen = Math.max(
        currentDiscTracks.length,
        sourceDiscTracks.length
      );

      for (let i = 0; i < maxLen; i++) {
        const currTrack = currentDiscTracks[i];
        const srcTrack = sourceDiscTracks[i];

        if (currTrack && srcTrack) {
          // Both exist - check if match or modified
          const titlesEqual = TextNormalizer.areEqual(
            currTrack.title,
            srcTrack.title
          );

          const diff: TrackDiff = {
            position: i + 1,
            discNumber: discNum,
            changeType: titlesEqual ? 'MATCH' : 'MODIFIED',
            current: {
              title: currTrack.title,
              durationMs: currTrack.durationMs,
              trackNumber: currTrack.trackNumber,
            },
            source: {
              title: srcTrack.title,
              durationMs: srcTrack.durationMs,
              mbid: srcTrack.mbid,
            },
          };

          if (!titlesEqual) {
            diff.titleDiff = diffChars(currTrack.title, srcTrack.title).map(
              part => ({
                value: part.value,
                added: part.added || undefined,
                removed: part.removed || undefined,
              })
            );
            modified++;
          } else {
            matching++;
          }

          if (
            currTrack.durationMs !== null &&
            srcTrack.durationMs !== null &&
            currTrack.durationMs !== srcTrack.durationMs
          ) {
            diff.durationDelta = Math.abs(
              currTrack.durationMs - srcTrack.durationMs
            );
          }

          trackDiffs.push(diff);
        } else if (currTrack && !srcTrack) {
          // Track in current but not in source - REMOVED
          trackDiffs.push({
            position: i + 1,
            discNumber: discNum,
            changeType: 'REMOVED',
            current: {
              title: currTrack.title,
              durationMs: currTrack.durationMs,
              trackNumber: currTrack.trackNumber,
            },
          });
          removed++;
        } else if (!currTrack && srcTrack) {
          // Track in source but not in current - ADDED
          trackDiffs.push({
            position: i + 1,
            discNumber: discNum,
            changeType: 'ADDED',
            source: {
              title: srcTrack.title,
              durationMs: srcTrack.durationMs,
              mbid: srcTrack.mbid,
            },
          });
          added++;
        }
      }
    }

    return {
      trackDiffs,
      summary: {
        totalCurrent: currentTracks.length,
        totalSource: sourceTracks.length,
        matching,
        modified,
        added,
        removed,
      },
    };
  }
}
