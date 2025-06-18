/**
 * Centralized React Query infrastructure
 * Provides shared query keys, default options, and error handling patterns
 */

import { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';

// ========================================
// Query Key Factory
// ========================================

export const queryKeys = {
  // Users
  users: () => ['users'] as const,
  user: (id: string) => ['users', id] as const,

  // Albums
  albums: () => ['albums'] as const,
  album: (id: string) => ['albums', id] as const,
  albumSearch: (query: string) => ['albums', 'search', query] as const,

  // Artists
  artists: () => ['artists'] as const,
  artist: (id: string) => ['artists', id] as const,
  artistMasters: (artistId: string, page?: number) => {
    const baseKey = ['artists', artistId, 'masters'] as const;
    return page ? ([...baseKey, page] as const) : baseKey;
  },
  artistReleases: (artistId: string, page?: number) => {
    const baseKey = ['artists', artistId, 'releases'] as const;
    return page ? ([...baseKey, page] as const) : baseKey;
  },

  // Recommendations
  recommendations: () => ['recommendations'] as const,
  recommendationsByUser: (userId: string) =>
    ['recommendations', 'user', userId] as const,

  // Collections
  collections: () => ['collections'] as const,
  collection: (id: string) => ['collections', id] as const,
  userCollections: (userId: string) => ['collections', 'user', userId] as const,

  // Labels
  labels: () => ['labels'] as const,
  label: (id: string) => ['labels', id] as const,

  // Masters
  masters: () => ['masters'] as const,
  master: (id: string) => ['masters', id] as const,

  // Releases
  releases: () => ['releases'] as const,
  release: (id: string) => ['releases', id] as const,
} as const;

// ========================================
// Default Query Options
// ========================================

export const defaultQueryOptions = {
  // Standard options for most queries
  standard: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 2,
    refetchOnWindowFocus: false,
  },

  // For real-time or frequently changing data
  realtime: {
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  },

  // For static/rarely changing data
  static: {
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  },

  // For search queries that should be fresh
  search: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  },
} as const;

// ========================================
// Error Handling
// ========================================

export class QueryError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'QueryError';
  }
}

export const createQueryError = (
  message: string,
  statusCode?: number,
  code?: string
): QueryError => {
  return new QueryError(message, statusCode, code);
};

// Standard error handler for API responses
export const handleApiResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw createQueryError(
      errorData.error || `HTTP Error: ${response.status}`,
      response.status,
      errorData.code
    );
  }
  return response.json();
};

// ========================================
// Query Option Factories
// ========================================

export const createQueryOptions = <T = unknown, TError = Error>(
  options: Partial<UseQueryOptions<T, TError>> = {}
): Partial<UseQueryOptions<T, TError>> => ({
  ...defaultQueryOptions.standard,
  ...options,
});

export const createRealtimeQueryOptions = <T = unknown, TError = Error>(
  options: Partial<UseQueryOptions<T, TError>> = {}
): Partial<UseQueryOptions<T, TError>> => ({
  ...defaultQueryOptions.realtime,
  ...options,
});

export const createStaticQueryOptions = <T = unknown, TError = Error>(
  options: Partial<UseQueryOptions<T, TError>> = {}
): Partial<UseQueryOptions<T, TError>> => ({
  ...defaultQueryOptions.static,
  ...options,
});

export const createSearchQueryOptions = <T = unknown, TError = Error>(
  options: Partial<UseQueryOptions<T, TError>> = {}
): Partial<UseQueryOptions<T, TError>> => ({
  ...defaultQueryOptions.search,
  ...options,
});

// ========================================
// Mutation Option Factories
// ========================================

export const createMutationOptions = <
  TData = unknown,
  TError = Error,
  TVariables = unknown,
>(
  options: Partial<UseMutationOptions<TData, TError, TVariables>> = {}
): Partial<UseMutationOptions<TData, TError, TVariables>> => ({
  retry: 1,
  ...options,
});

// ========================================
// Type Guards and Utilities
// ========================================

export const isQueryError = (error: unknown): error is QueryError => {
  return error instanceof QueryError;
};

export const getErrorMessage = (error: unknown): string => {
  if (isQueryError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

export const getErrorCode = (error: unknown): string | undefined => {
  if (isQueryError(error)) {
    return error.code;
  }
  return undefined;
};

export const getErrorStatus = (error: unknown): number | undefined => {
  if (isQueryError(error)) {
    return error.statusCode;
  }
  return undefined;
};
