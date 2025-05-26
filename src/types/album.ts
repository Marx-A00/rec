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

export interface Recommendation {
  id: string;
  raitingOwner: string;
  basisAlbum: Album;
  recommendedAlbum: Album;
  score: number;
} 