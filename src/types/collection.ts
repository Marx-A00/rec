export interface Collection {
  id: string;
  name: string;
  description?: string;
  userId: string;
  isPublic: boolean;
  createdAt: string; // ISO 8601 format
  updatedAt: string; // ISO 8601 format
  albums: CollectionAlbum[];
  metadata: {
    totalAlbums: number;
    totalDuration: number; // in seconds
    genres: string[]; // unique genres from all albums
    averageRating?: number;
  };
  tags?: string[];
  coverImage?: {
    url: string;
    width: number;
    height: number;
    alt?: string;
  };
}

export interface CollectionAlbum {
  id: string;
  albumId: string;

  albumTitle: string;
  albumArtist: string;
  albumImageUrl?: string;
  albumYear?: string;

  addedAt: string; // ISO 8601 format
  addedBy: string; // userId
  personalRating?: number; // 1-10 scale
  personalNotes?: string;
  position: number; // for ordering within collection
}

export interface CollectionSummary {
  id: string;
  name: string;
  description?: string;
  albumCount: number;
  isPublic: boolean;
  coverImage?: {
    url: string;
    width: number;
    height: number;
    alt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

// For creating/updating collections
export interface CreateCollectionRequest {
  name: string;
  description?: string;
  isPublic: boolean;
  tags?: string[];
}

export interface UpdateCollectionRequest {
  name?: string;
  description?: string;
  isPublic?: boolean;
  tags?: string[];
}

export interface AddAlbumToCollectionRequest {
  albumId: string;
  personalRating?: number;
  personalNotes?: string;
  position?: number;
}
