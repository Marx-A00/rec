/**
 * Centralized exports for all React Query hooks
 * Following standardized naming conventions: use<Entity>Query for queries, use<Entity>Mutation for mutations
 */

// Query Hooks
export { useUsersQuery } from './useUsersQuery';
export { useAlbumDetailsQuery } from './useAlbumDetailsQuery';
export { useMastersQuery } from './useMastersQuery';
export { useRecommendationsQuery } from './useRecommendationsQuery';
export { useAlbumSearchQuery } from './useAlbumSearchQuery';

// Mutation Hooks
export { useCreateRecommendationMutation } from './useCreateRecommendationMutation';

// Non-Query Hooks (State Management)
export { useAlbumModal } from './useAlbumModal';
export { useCollageGenerator } from './useCollageGenerator';
export { useRecommendationModal } from './useRecommendationModal';
export { useNavigation } from './useNavigation';

// Re-export common types and utilities from queries infrastructure
export {
  QueryError,
  isQueryError,
  getErrorMessage,
  getErrorCode,
  getErrorStatus,
  queryKeys,
} from '@/lib/queries';

// Legacy exports for backward compatibility (to be removed after refactoring)
export { useUsers } from './useUsers';
export { useAlbumDetails } from './useAlbumDetails';
export { useMasters } from './useMasters';
