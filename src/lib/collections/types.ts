import { PrismaClient } from '@prisma/client';

/** Input for creating a new album inline during collection add. */
export interface AlbumCreateInput {
  title: string;
  releaseDate?: string | null;
  albumType?: string | null;
  totalTracks?: number | null;
  coverImageUrl?: string | null;
  musicbrainzId?: string | null;
  artists?: Array<{
    artistName?: string | null;
    role?: string | null;
  }> | null;
}

/** Options for addAlbumToCollection. */
export interface AddAlbumToCollectionOptions {
  db: PrismaClient;
  userId: string;
  collectionId: string;
  album:
    | { type: 'existing'; albumId: string }
    | { type: 'create'; albumData: AlbumCreateInput };
  personalRating?: number | null;
  personalNotes?: string | null;
  position?: number;
  caller: string;
}

/** Result from addAlbumToCollection. */
export interface AddAlbumToCollectionResult {
  collectionAlbum: {
    id: string;
    collectionId: string;
    albumId: string;
    personalRating: number | null;
    personalNotes: string | null;
    position: number;
    addedAt: Date;
    album: {
      id: string;
      title: string;
      coverArtUrl: string | null;
      artists: Array<{
        artist: { id: string; name: string };
        role: string;
        position: number;
      }>;
    };
  };
  albumCreated: boolean;
  alreadyInCollection: boolean;
}
