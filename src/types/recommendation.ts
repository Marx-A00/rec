// Core recommendation interface
export interface Recommendation {
  id: string;
  score: number;
  createdAt: string;
  updatedAt: string;
  userId: string;

  // Discogs references
  basisAlbumDiscogsId: string;
  recommendedAlbumDiscogsId: string;
  basisAlbumArtistDiscogsId: string | null;
  recommendedAlbumArtistDiscogsId: string | null;

  // Cached display data
  basisAlbumTitle: string;
  basisAlbumArtist: string;
  basisAlbumImageUrl: string | null;
  basisAlbumYear: string | null;
  recommendedAlbumTitle: string;
  recommendedAlbumArtist: string;
  recommendedAlbumImageUrl: string | null;
  recommendedAlbumYear: string | null;

  // Optional user info for browse views
  user?: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

// For creating recommendations
export interface CreateRecommendationRequest {
  basisAlbumDiscogsId: string;
  recommendedAlbumDiscogsId: string;
  score: number;

  // Artist Discogs IDs
  basisAlbumArtistDiscogsId?: string | null;
  recommendedAlbumArtistDiscogsId?: string | null;

  // Cache these for display
  basisAlbumTitle: string;
  basisAlbumArtist: string;
  basisAlbumImageUrl: string | null;
  basisAlbumYear: string | null;
  recommendedAlbumTitle: string;
  recommendedAlbumArtist: string;
  recommendedAlbumImageUrl: string | null;
  recommendedAlbumYear: string | null;
}

// API responses
export interface RecommendationResponse {
  recommendation: Recommendation;
  success: boolean;
}

export interface RecommendationsResponse {
  recommendations: Recommendation[];
  pagination?: {
    page: number;
    per_page: number;
    total: number;
    has_more: boolean;
  };
  success: boolean;
}
