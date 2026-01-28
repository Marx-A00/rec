/**
 * ArtistDiffEngine performs field-by-field comparisons between current artist data
 * and MusicBrainz source data.
 *
 * Uses text normalization for semantic comparison (handles Unicode, case, whitespace).
 * Decision from RESEARCH.md: Only show gender field diff when MB type is "Person".
 */

import type { Artist } from '@prisma/client';

import { TextNormalizer } from '../../preview/normalizers';

import type {
  ArtistFieldDiff,
  ArtistPreviewSummary,
  MBArtistData,
} from './types';

/**
 * ArtistDiffEngine computes field-level diffs between current artist data and MusicBrainz source.
 * Compares 11 fields: name, disambiguation, countryCode, artistType, area, beginDate, endDate,
 * gender (Person only), musicbrainzId, ipi, isni.
 */
export class ArtistDiffEngine {
  /**
   * Classify the change type between two values.
   *
   * - ADDED: current is null/undefined/empty, source has value
   * - REMOVED: current has value, source is null/undefined/empty
   * - UNCHANGED: both null/undefined/empty, or both equal (normalized)
   * - MODIFIED: both have different values
   */
  classifyChange(
    current: string | null | undefined,
    source: string | null | undefined
  ): 'ADDED' | 'MODIFIED' | 'REMOVED' | 'UNCHANGED' {
    const hasCurrentValue =
      current !== null && current !== undefined && current !== '';
    const hasSourceValue =
      source !== null && source !== undefined && source !== '';

    if (!hasCurrentValue && !hasSourceValue) return 'UNCHANGED';
    if (!hasCurrentValue && hasSourceValue) return 'ADDED';
    if (hasCurrentValue && !hasSourceValue) return 'REMOVED';

    // Both have values - check if equal (using text normalization)
    if (TextNormalizer.areEqual(current, source)) {
      return 'UNCHANGED';
    }

    return 'MODIFIED';
  }

  /**
   * Generate field diffs for all artist fields.
   *
   * Compares:
   * - name
   * - disambiguation
   * - countryCode (from MB country)
   * - artistType (from MB type)
   * - area (from MB area.name)
   * - beginDate (from MB lifeSpan.begin)
   * - endDate (from MB lifeSpan.end)
   * - gender (only for Person type per RESEARCH.md)
   * - musicbrainzId
   * - ipi (first IPI code)
   * - isni (first ISNI code)
   *
   * @param currentArtist - Current artist data from database
   * @param mbData - MusicBrainz artist data (may be null)
   * @returns Array of field diffs
   */
  generateFieldDiffs(
    currentArtist: Artist,
    mbData: MBArtistData | null
  ): ArtistFieldDiff[] {
    const diffs: ArtistFieldDiff[] = [];

    // Name
    diffs.push(
      this.createDiff('name', currentArtist.name, mbData?.name ?? null)
    );

    // Disambiguation
    diffs.push(
      this.createDiff(
        'disambiguation',
        null, // Artist model doesn't have disambiguation field currently
        mbData?.disambiguation ?? null
      )
    );

    // Country code
    diffs.push(
      this.createDiff(
        'countryCode',
        currentArtist.countryCode ?? null,
        mbData?.country ?? null
      )
    );

    // Artist type
    diffs.push(
      this.createDiff(
        'artistType',
        currentArtist.artistType ?? null,
        mbData?.type ?? null
      )
    );

    // Area (from area.name)
    diffs.push(
      this.createDiff(
        'area',
        currentArtist.area ?? null,
        mbData?.area?.name ?? null
      )
    );

    // Begin date (partial date string preserved)
    diffs.push(
      this.createDiff(
        'beginDate',
        this.formatYearToString(currentArtist.formedYear),
        mbData?.lifeSpan?.begin ?? null
      )
    );

    // End date (partial date string preserved)
    diffs.push(
      this.createDiff(
        'endDate',
        null, // Artist model doesn't have end date field currently
        mbData?.lifeSpan?.end ?? null
      )
    );

    // Gender - only compare when MB type is "Person" (per RESEARCH.md decision)
    if (mbData?.type === 'Person') {
      diffs.push(
        this.createDiff(
          'gender',
          null, // Artist model doesn't have gender field currently
          mbData?.gender ?? null
        )
      );
    }

    // MusicBrainz ID
    diffs.push(
      this.createDiff(
        'musicbrainzId',
        currentArtist.musicbrainzId ?? null,
        mbData?.id ?? null
      )
    );

    // IPI (first IPI code only - arrays are flattened per RESEARCH.md decision)
    const firstIPI = mbData?.ipis?.[0] ?? null;
    diffs.push(
      this.createDiff(
        'ipi',
        null, // Artist model doesn't have ipi field currently
        firstIPI
      )
    );

    // ISNI (first ISNI code only)
    const firstISNI = mbData?.isnis?.[0] ?? null;
    diffs.push(
      this.createDiff(
        'isni',
        null, // Artist model doesn't have isni field currently
        firstISNI
      )
    );

    return diffs;
  }

  /**
   * Generate summary statistics from field diffs.
   *
   * @param diffs - Array of field diffs
   * @returns Summary with counts by change type
   */
  generateSummary(diffs: ArtistFieldDiff[]): ArtistPreviewSummary {
    const changedDiffs = diffs.filter(d => d.changeType !== 'UNCHANGED');

    return {
      totalFields: diffs.length,
      changedFields: changedDiffs.length,
      addedFields: diffs.filter(d => d.changeType === 'ADDED').length,
      modifiedFields: diffs.filter(d => d.changeType === 'MODIFIED').length,
    };
  }

  /**
   * Create a field diff object.
   */
  private createDiff(
    field: string,
    current: string | null,
    source: string | null
  ): ArtistFieldDiff {
    return {
      field,
      changeType: this.classifyChange(current, source),
      current,
      source,
    };
  }

  /**
   * Format formedYear (number) to string for comparison with MB dates.
   */
  private formatYearToString(year: number | null | undefined): string | null {
    if (year === null || year === undefined) return null;
    return year.toString();
  }
}
