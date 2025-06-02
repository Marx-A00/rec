import { Track } from './album';

// Unified search result interface that matches what the search API returns
export interface UnifiedSearchResult {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  artist: string;
  releaseDate: string;
  genre: string[];
  label: string;
  image: {
    url: string;
    width: number;
    height: number;
    alt: string;
  };
  cover_image?: string; // For backwards compatibility
  tracks?: Track[];
  metadata?: {
    totalDuration: number;
    numberOfTracks: number;
  };
  _discogs: {
    type?: string;
    uri?: string;
    resource_url?: string;
  };
}

// API response from search endpoint
export interface SearchResponse {
  results: UnifiedSearchResult[];
  grouped: {
    albums: UnifiedSearchResult[];
    artists: UnifiedSearchResult[];
    labels: UnifiedSearchResult[];
    other: UnifiedSearchResult[];
  };
  total: number;
}
