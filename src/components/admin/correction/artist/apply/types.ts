import { type ArtistFieldDiff, ChangeType } from '@/generated/graphql';

export interface UIArtistFieldSelections {
  metadata: {
    name: boolean;
    disambiguation: boolean;
    countryCode: boolean;
    artistType: boolean;
    area: boolean;
    beginDate: boolean;
    endDate: boolean;
    gender: boolean;
  };
  externalIds: {
    musicbrainzId: boolean;
    discogsId: boolean;
    ipi: boolean;
    isni: boolean;
  };
}

/**
 * Create default selections with changed fields selected.
 */
export function createDefaultArtistSelections(preview: {
  fieldDiffs: ArtistFieldDiff[];
}): UIArtistFieldSelections {
  const metadataFields = [
    'name',
    'disambiguation',
    'countryCode',
    'artistType',
    'area',
    'beginDate',
    'endDate',
    'gender',
  ];
  const externalIdFields = ['musicbrainzId', 'discogsId', 'ipi', 'isni'];

  const metadata: UIArtistFieldSelections['metadata'] = {
    name: false,
    disambiguation: false,
    countryCode: false,
    artistType: false,
    area: false,
    beginDate: false,
    endDate: false,
    gender: false,
  };

  const externalIds: UIArtistFieldSelections['externalIds'] = {
    musicbrainzId: false,
    discogsId: false,
    ipi: false,
    isni: false,
  };

  // Select fields that have changes by default
  for (const diff of preview.fieldDiffs) {
    if (diff.changeType !== ChangeType.Unchanged) {
      if (metadataFields.includes(diff.field)) {
        metadata[diff.field as keyof typeof metadata] = true;
      } else if (externalIdFields.includes(diff.field)) {
        externalIds[diff.field as keyof typeof externalIds] = true;
      }
    }
  }

  return { metadata, externalIds };
}
