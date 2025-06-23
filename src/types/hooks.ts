/**
 * TypeScript types for React Query hooks
 * Ensures type safety and consistency across all data fetching hooks
 */

import { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import type { User } from '@prisma/client';

import { Album, ReleasesResponse } from '@/types/album';
import {
  RecommendationsResponse,
  CreateRecommendationRequest,
} from '@/types/recommendation';
import { QueryError } from '@/lib/queries';

// ========================================
// Common Hook Option Types
// ========================================

export interface BaseQueryOptions {
  enabled?: boolean;
}

export interface BaseMutationOptions<TData = unknown> {
  onSuccess?: (data: TData) => void;
  onError?: (error: QueryError) => void;
}

// ========================================
// Query Hook Types
// ========================================

// Users Query
export type UseUsersQueryOptions = BaseQueryOptions;

export type UseUsersQueryResult = UseQueryResult<User[], QueryError>;

// Album Details Query
export interface UseAlbumDetailsQueryOptions extends BaseQueryOptions {
  initialData?: Album;
}

export type UseAlbumDetailsQueryResult = UseQueryResult<Album, QueryError>;

// Masters Query
export type UseMastersQueryOptions = BaseQueryOptions;

export interface UseMastersQueryData {
  masters: any[]; // From ReleasesResponse.releases
  isLoading: boolean;
  error: QueryError | null;
  isError: boolean;
  isLoadingMore: boolean;
  hasMorePages: boolean;
  totalItems: number;
  loadedCount: number;
  loadMoreMasters: () => Promise<void>;
  pagination?: any; // From ReleasesResponse.pagination
}

// Recommendations Query
export interface UseRecommendationsQueryOptions extends BaseQueryOptions {
  page?: number;
  perPage?: number;
  userId?: string;
}

export type UseRecommendationsQueryResult = UseQueryResult<
  RecommendationsResponse,
  QueryError
>;

// Album Search Query
export interface UseAlbumSearchQueryOptions extends BaseQueryOptions {
  minQueryLength?: number;
}

export type UseAlbumSearchQueryResult = UseQueryResult<
  { albums: Album[] },
  QueryError
>;

// ========================================
// Mutation Hook Types
// ========================================

// Create Recommendation Mutation
export type UseCreateRecommendationMutationOptions = BaseMutationOptions<any>;

export type UseCreateRecommendationMutationResult = UseMutationResult<
  any,
  QueryError,
  CreateRecommendationRequest
>;

// ========================================
// Hook Function Signatures
// ========================================

export interface HookSignatures {
  useUsersQuery: (options?: UseUsersQueryOptions) => UseUsersQueryResult;

  useAlbumDetailsQuery: (
    albumId: string,
    options?: UseAlbumDetailsQueryOptions
  ) => UseAlbumDetailsQueryResult;

  useMastersQuery: (
    artistId: string,
    options?: UseMastersQueryOptions
  ) => UseMastersQueryData;

  useRecommendationsQuery: (
    options?: UseRecommendationsQueryOptions
  ) => UseRecommendationsQueryResult;

  useAlbumSearchQuery: (
    query: string,
    options?: UseAlbumSearchQueryOptions
  ) => UseAlbumSearchQueryResult;

  useCreateRecommendationMutation: (
    options?: UseCreateRecommendationMutationOptions
  ) => UseCreateRecommendationMutationResult;
}

// ========================================
// Generic Hook Types
// ========================================

// Generic query hook type for future hooks
export interface QueryHookOptions<TData = unknown> extends BaseQueryOptions {
  initialData?: TData;
  select?: (data: any) => TData;
}

// Generic mutation hook type for future hooks
export interface MutationHookOptions<TData = unknown, TVariables = unknown>
  extends BaseMutationOptions<TData> {
  onMutate?: (variables: TVariables) => Promise<any> | any;
  onSettled?: (
    data: TData | undefined,
    error: QueryError | null,
    variables: TVariables
  ) => void;
}

// ========================================
// Error Handling Types
// ========================================

export interface ErrorHandlingHooks {
  isQueryError: (error: unknown) => error is QueryError;
  getErrorMessage: (error: unknown) => string;
  getErrorCode: (error: unknown) => string | undefined;
  getErrorStatus: (error: unknown) => number | undefined;
}

// ========================================
// Type Predicates
// ========================================

export const isQueryHookResult = <T>(
  result: any
): result is UseQueryResult<T, QueryError> => {
  return (
    result &&
    typeof result.data !== 'undefined' &&
    typeof result.isLoading === 'boolean' &&
    typeof result.isError === 'boolean'
  );
};

export const isMutationHookResult = <T, V>(
  result: any
): result is UseMutationResult<T, QueryError, V> => {
  return (
    result &&
    typeof result.mutate === 'function' &&
    typeof result.isPending === 'boolean' &&
    typeof result.isError === 'boolean'
  );
};
