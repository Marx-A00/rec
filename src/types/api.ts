import { NextRequest, NextResponse } from 'next/server';

// ===========================
// ROUTE CONTEXT TYPES
// ===========================

// Generic route context for dynamic routes
export interface RouteContext<T = Record<string, string>> {
  params: Promise<T>;
}

// Specific route contexts
export type AlbumRouteContext = RouteContext<{ id: string }>;
export type ArtistRouteContext = RouteContext<{ id: string }>;
export type CollectionRouteContext = RouteContext<{ id: string }>;
export type UserRouteContext = RouteContext<{ userId: string }>;

// ===========================
// API REQUEST TYPES
// ===========================

// Base API request interface
export type ApiRequest = NextRequest;

// Typed request with body
export interface TypedApiRequest<T = unknown> extends NextRequest {
  json(): Promise<T>;
}

// ===========================
// API RESPONSE TYPES
// ===========================

// Base API response structure
export interface ApiResponse<T = unknown> {
  data?: T;
  message?: string;
  error?: string;
  details?: string;
  code?: string;
  timestamp?: string;
}

// Success response
export interface ApiSuccessResponse<T = unknown> extends ApiResponse<T> {
  data: T;
  message: string;
}

// Error response
export interface ApiErrorResponse extends ApiResponse {
  error: string;
  details?: string;
  code?: string;
  timestamp: string;
}

// Paginated response
export interface PaginatedApiResponse<T = unknown> extends ApiResponse {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ===========================
// DOMAIN-SPECIFIC RESPONSE TYPES
// ===========================

// Album API responses
export interface AlbumListResponse extends ApiResponse {
  albums: Array<{
    id: string;
    title: string;
    artist: string;
    year?: number;
    genre?: string[];
    image?: {
      url: string;
      width?: number;
      height?: number;
      alt?: string;
    };
  }>;
  total: number;
}

export interface AlbumDetailsResponse extends ApiResponse {
  id: string;
  title: string;
  artist: string;
  year?: number;
  genre?: string[];
  tracks?: Array<{
    id: string;
    title: string;
    duration?: string;
  }>;
  image?: {
    url: string;
    width?: number;
    height?: number;
    alt?: string;
  };
}

// Search API responses
export interface SearchResultItem {
  id: string;
  type: 'album' | 'artist' | 'label' | 'unknown';
  title: string;
  subtitle: string;
  artist: string;
  releaseDate?: string;
  genre?: string[];
  label?: string;
  image: {
    url: string;
    width: number;
    height: number;
    alt: string;
  };
  tracks?: Array<{
    id: string;
    title: string;
  }>;
  metadata?: {
    totalDuration: number;
    numberOfTracks: number;
  };
  _discogs?: {
    type?: string;
    uri?: string;
    resource_url?: string;
  };
}

export interface SearchResponse extends ApiResponse {
  results: SearchResultItem[];
  grouped: {
    albums: SearchResultItem[];
    artists: SearchResultItem[];
    labels: SearchResultItem[];
    other: SearchResultItem[];
  };
  total: number;
  pagination: {
    page: number;
    per_page: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Collection API responses
export interface CollectionResponse extends ApiResponse {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export type CollectionListResponse = PaginatedApiResponse<CollectionResponse>;

// User API responses
export interface UserResponse extends ApiResponse {
  id: string;
  email: string;
  username?: string;
  createdAt: string;
  updatedAt: string;
}

// ===========================
// ROUTE HANDLER TYPES
// ===========================

// Generic route handler function type
export type RouteHandler<
  TContext = Record<string, never>,
  TResponse = unknown,
> = (
  request: NextRequest,
  context: TContext
) => Promise<NextResponse<ApiResponse<TResponse>>>;

// Specific route handler types
export type AlbumRouteHandler<T = unknown> = RouteHandler<AlbumRouteContext, T>;
export type ArtistRouteHandler<T = unknown> = RouteHandler<
  ArtistRouteContext,
  T
>;
export type CollectionRouteHandler<T = unknown> = RouteHandler<
  CollectionRouteContext,
  T
>;
export type UserRouteHandler<T = unknown> = RouteHandler<UserRouteContext, T>;

// Simple route handler (no context)
export type SimpleRouteHandler<T = unknown> = (
  request: NextRequest
) => Promise<NextResponse<ApiResponse<T>>>;

// ===========================
// UTILITY TYPES
// ===========================

// Extract params from route context
export type ExtractParams<T> = T extends RouteContext<infer P> ? P : never;

// Extract response data type
export type ExtractResponseData<T> = T extends ApiResponse<infer D> ? D : never;

// HTTP method types for route handlers
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// Route handler methods
export interface RouteHandlerMethods {
  GET?: SimpleRouteHandler | RouteHandler;
  POST?: SimpleRouteHandler | RouteHandler;
  PUT?: SimpleRouteHandler | RouteHandler;
  PATCH?: SimpleRouteHandler | RouteHandler;
  DELETE?: SimpleRouteHandler | RouteHandler;
}
