export interface Track {
  id: string;
  title: string;
  duration: number; // in seconds
  trackNumber: number;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  subtitle?: string; // For general search results
  type?: string; // For general search results (album, artist, label, etc.)
  releaseDate: string; // ISO 8601 format: "YYYY-MM-DD"
  genre: string[];
  label: string;
  image: {
    url: string;
    width: number;
    height: number;
    alt?: string;
  };
  tracks?: Track[];
  metadata?: {
    totalDuration: number; // in seconds
    numberOfTracks: number;
    format?: string; // e.g., "CD", "Vinyl", "Digital"
    barcode?: string;
  };
}

// A Release represents a specific physical or digital version of an album
// (e.g., different pressings, formats, etc. of the same album)
export interface Release {
  id: string;
  title: string;
  year?: number;
  format?: string[];
  label?: string[];
  role?: string;
  resource_url?: string;
  artist?: string;
  thumb?: string;
  basic_information?: {
    id: number;
    title: string;
    year: number;
    resource_url: string;
    thumb: string;
    cover_image?: string;
    formats?: Array<{
      name: string;
      qty: string;
      descriptions?: string[];
    }>;
    labels?: Array<{
      name: string;
      catno: string;
    }>;
    artists?: Array<{
      name: string;
      role?: string;
    }>;
  };
}

// API response for fetching artist releases
export interface ReleasesResponse {
  releases: Release[];
  pagination: {
    pages: number;
    page: number;
    per_page: number;
    items: number;
    urls: {
      last?: string;
      next?: string;
    };
  };
  success: boolean;
}

export interface Recommendation {
  id: string;
  raitingOwner: string;
  basisAlbum: Album;
  recommendedAlbum: Album;
  score: number;
} 