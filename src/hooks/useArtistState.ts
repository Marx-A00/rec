import { useMemo } from 'react';
import { useSession } from 'next-auth/react';

import {
  useGetArtistByMusicBrainzIdQuery,
  useGetArtistDetailsQuery,
  DataQuality,
  EnrichmentStatus,
} from '@/generated/graphql';

export interface ArtistState {
  existsInDb: boolean;
  dbId: string | null;
  enrichmentStatus: EnrichmentStatus | null;
  lastEnriched: Date | null;
  dataQuality: DataQuality | null;
  isLoading: boolean;
}

export interface ArtistInput {
  id: string;
  musicbrainzId?: string | null;
  source?: 'local' | 'musicbrainz' | 'discogs';
}

/**
 * Unified hook to determine artist database state
 *
 * For local artists (source === 'local'):
 * - Uses the artist.id directly as it's already our DB UUID
 *
 * For external artists (source !== 'local'):
 * - Queries DB by musicbrainzId to check if it exists
 * - If found, uses the DB UUID
 *
 * @param artist - Artist object from artist page or other sources
 * @returns Unified artist state including DB existence and enrichment status
 */
export function useArtistState(artist: ArtistInput | null): ArtistState {
  const { data: session } = useSession();

  // Determine if this is a local artist (already in our DB)
  const isLocalArtist = artist?.source === 'local';
  const musicbrainzId = artist?.musicbrainzId;

  // For local artists, fetch full details by ID
  const { data: localArtistData, isLoading: isLoadingLocalLookup } =
    useGetArtistDetailsQuery(
      { id: artist?.id || '' },
      {
        enabled: isLocalArtist && !!artist?.id,
      }
    );

  // For external artists, query DB to check if it exists by musicbrainzId
  const { data: externalArtistData, isLoading: isLoadingExternalLookup } =
    useGetArtistByMusicBrainzIdQuery(
      { musicbrainzId: musicbrainzId || '' },
      {
        enabled: !isLocalArtist && !!musicbrainzId,
      }
    );

  // Determine the DB ID to use
  const dbId = useMemo(() => {
    if (!artist) return null;
    if (isLocalArtist) return artist.id; // Local artists already have DB UUID
    return externalArtistData?.artistByMusicBrainzId?.id || null; // External artists need lookup
  }, [artist, isLocalArtist, externalArtistData]);

  // Combine all loading states
  const isLoading = isLoadingLocalLookup || isLoadingExternalLookup;

  // Extract enrichment data from either local or external artist data
  const enrichmentStatus = useMemo(() => {
    if (isLocalArtist && localArtistData?.artist) {
      return localArtistData.artist.enrichmentStatus || null;
    }
    if (externalArtistData?.artistByMusicBrainzId) {
      return externalArtistData.artistByMusicBrainzId.enrichmentStatus || null;
    }
    return null;
  }, [isLocalArtist, localArtistData, externalArtistData]);

  const lastEnriched = useMemo(() => {
    if (isLocalArtist && localArtistData?.artist?.lastEnriched) {
      return new Date(localArtistData.artist.lastEnriched);
    }
    if (externalArtistData?.artistByMusicBrainzId?.lastEnriched) {
      return new Date(externalArtistData.artistByMusicBrainzId.lastEnriched);
    }
    return null;
  }, [isLocalArtist, localArtistData, externalArtistData]);

  const dataQuality = useMemo(() => {
    if (isLocalArtist && localArtistData?.artist) {
      return localArtistData.artist.dataQuality || null;
    }
    if (externalArtistData?.artistByMusicBrainzId) {
      return externalArtistData.artistByMusicBrainzId.dataQuality || null;
    }
    return null;
  }, [isLocalArtist, localArtistData, externalArtistData]);

  return {
    existsInDb: !!dbId,
    dbId,
    enrichmentStatus,
    lastEnriched,
    dataQuality,
    isLoading,
  };
}

// Re-export types for convenience
export type { DataQuality, EnrichmentStatus } from '@/generated/graphql';
