import { useMemo } from 'react';
import { useSession } from 'next-auth/react';

import { Album } from '@/types/album';
import {
  useAlbumByMusicBrainzIdQuery,
  useGetMyCollectionsQuery,
  DataQuality,
  EnrichmentStatus,
} from '@/generated/graphql';
import { useAlbumDetailsQuery, type AlbumDetailsData } from '@/hooks/useAlbumDetailsQuery';

export interface AlbumState {
  existsInDb: boolean;
  dbId: string | null;
  enrichmentStatus: EnrichmentStatus | null;
  lastEnriched: Date | null;
  dataQuality: DataQuality | null;
  isInCollection: boolean;
  isInListenLater: boolean;
  collectionNames: string[];
  isLoading: boolean;
}

/**
 * Unified hook to determine album database state
 *
 * For local albums (source === 'local'):
 * - Uses the album.id directly as it's already our DB UUID
 * - Fetches enrichment data using useAlbumDetailsQuery
 *
 * For external albums (source !== 'local'):
 * - Queries DB by musicbrainzId to check if it exists
 * - If found, uses the DB UUID to fetch enrichment data
 *
 * @param album - Album object from AlbumModal or other sources
 * @returns Unified album state including DB existence, enrichment status, and collection status
 */
export function useAlbumState(album: Album | null): AlbumState {
  const { data: session } = useSession();

  // Determine if this is a local album (already in our DB)
  const isLocalAlbum = album?.source === 'local';
  const musicbrainzId = album?.musicbrainzId;

  // For external albums, query DB to check if it exists by musicbrainzId
  const { data: externalAlbumData, isLoading: isLoadingExternalLookup } =
    useAlbumByMusicBrainzIdQuery(
      { musicbrainzId: musicbrainzId || '' },
      {
        enabled: !isLocalAlbum && !!musicbrainzId,
      }
    );

  // Determine the DB ID to use for further queries
  const dbId = useMemo(() => {
    if (!album) return null;
    if (isLocalAlbum) return album.id; // Local albums already have DB UUID
    return externalAlbumData?.albumByMusicBrainzId?.id || null; // External albums need lookup
  }, [album, isLocalAlbum, externalAlbumData]);

  // Fetch detailed album data if we have a DB ID
  const { data: albumDetails, isLoading: isLoadingDetails } = useAlbumDetailsQuery(
    dbId || '',
    { enabled: !!dbId }
  );

  // Fetch user's collections to check if album is in any of them
  const { data: collectionsData, isLoading: isLoadingCollections } = useGetMyCollectionsQuery(
    {},
    {
      enabled: !!session?.user && !!dbId,
      staleTime: 5 * 60 * 1000, // 5 minutes - same as useListenLaterStatus
    }
  );

  // Check which collections this album is in
  const { isInCollection, isInListenLater, collectionNames } = useMemo(() => {
    if (!dbId || !collectionsData?.myCollections) {
      return { isInCollection: false, isInListenLater: false, collectionNames: [] };
    }

    const collections: string[] = [];
    let inListenLater = false;

    for (const collection of collectionsData.myCollections) {
      const hasAlbum = collection.albums?.some(
        (collectionAlbum) => collectionAlbum.album?.id === dbId
      );

      if (hasAlbum) {
        collections.push(collection.name);
        if (collection.name === 'Listen Later') {
          inListenLater = true;
        }
      }
    }

    return {
      isInCollection: collections.length > 0,
      isInListenLater: inListenLater,
      collectionNames: collections,
    };
  }, [dbId, collectionsData]);

  // Combine all loading states
  const isLoading = isLoadingExternalLookup || isLoadingDetails || isLoadingCollections;

  // Extract enrichment data from albumDetails (for local albums) or MusicBrainz lookup (for external)
  const enrichmentStatus = useMemo(() => {
    // For local albums, use albumDetails (now properly typed with AlbumDetailsData)
    if (isLocalAlbum && albumDetails) {
      return albumDetails.enrichmentStatus || null;
    }
    // For external albums, use MusicBrainz lookup
    if (externalAlbumData?.albumByMusicBrainzId) {
      return externalAlbumData.albumByMusicBrainzId.enrichmentStatus || null;
    }
    return null;
  }, [isLocalAlbum, albumDetails, externalAlbumData]);

  const lastEnriched = useMemo(() => {
    // For local albums, use albumDetails (now properly typed with AlbumDetailsData)
    if (isLocalAlbum && albumDetails?.lastEnriched) {
      return new Date(albumDetails.lastEnriched);
    }
    // For external albums, use MusicBrainz lookup
    if (externalAlbumData?.albumByMusicBrainzId?.lastEnriched) {
      return new Date(externalAlbumData.albumByMusicBrainzId.lastEnriched);
    }
    return null;
  }, [isLocalAlbum, albumDetails, externalAlbumData]);

  const dataQuality = useMemo(() => {
    // For local albums, use albumDetails (now properly typed with AlbumDetailsData)
    if (isLocalAlbum && albumDetails) {
      return albumDetails.dataQuality || null;
    }
    // For external albums, use MusicBrainz lookup
    if (externalAlbumData?.albumByMusicBrainzId) {
      return externalAlbumData.albumByMusicBrainzId.dataQuality || null;
    }
    return null;
  }, [isLocalAlbum, albumDetails, externalAlbumData]);

  return {
    existsInDb: !!dbId,
    dbId,
    enrichmentStatus,
    lastEnriched,
    dataQuality,
    isInCollection,
    isInListenLater,
    collectionNames,
    isLoading,
  };
}

// Re-export types for convenience
export type { DataQuality, EnrichmentStatus } from '@/generated/graphql';
