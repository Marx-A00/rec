export interface Track {
  id: string;
  title: string;
  duration: number; // in seconds
  trackNumber: number;
}

export interface Album {
  id: string; // This is the Discogs ID
  title: string;
  // Optional external identifiers and source context
  musicbrainzId?: string;
  source?: 'local' | 'musicbrainz' | 'discogs';
  artists: Array<{
    id: string;
    name: string;
    anv?: string;
    role?: string;
    resource_url?: string;
    thumbnail_url?: string;
  }>;

  subtitle?: string; // For general search results
  type?: string; // For general search results (album, artist, label, etc.)
  releaseDate?: string; // ISO 8601 format: "YYYY-MM-DD"
  year?: number;
  genre?: string[];
  label?: string;
  cloudflareImageId?: string | null; // Cloudflare Images ID for optimized delivery
  image: {
    url: string;
    width: number;
    height: number;
    alt?: string;
  };
  // Add back tracks and metadata since code is using them
  tracks?: Track[];
  metadata?: {
    totalDuration?: number;
    numberOfTracks?: number;
    format?: string;
  };
}

// A Release represents a specific physical or digital version of an album
// (e.g., different pressings, formats, etc. of the same album)
export interface Release {
  id: string;
  title: string;
  year?: number;
  type?: 'release' | 'master'; // Type of the release
  format?: string[];
  label?: string[];
  role?: string;
  resource_url?: string;
  artist?: string;
  thumb?: string;
  source?: 'local' | 'musicbrainz' | 'discogs';
  status?: string; // For releases
  main_release?: number; // For masters
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
      id?: string; // MusicBrainz artist ID when source is MusicBrainz
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
  } | null;
  success: boolean;
}
