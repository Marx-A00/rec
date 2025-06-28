/**
 * Centralized exports for all React Query hooks
 * Following standardized naming conventions: use<Entity>Query for queries, use<Entity>Mutation for mutations
 */

// Query Hooks
export { useUsersQuery } from './useUsersQuery';
export { useAlbumDetailsQuery } from './useAlbumDetailsQuery';
export { useMastersQuery } from './useMastersQuery';
export { useRecommendationsQuery } from './useRecommendationsQuery';
export { useRecommendationQuery } from './useRecommendationQuery';
export { useAlbumSearchQuery } from './useAlbumSearchQuery';
export { useUnifiedSearchQuery } from './useUnifiedSearchQuery';

// Mutation Hooks
export { useCreateRecommendationMutation } from './useCreateRecommendationMutation';
export { useUpdateRecommendationMutation } from './useUpdateRecommendationMutation';
export { useDeleteRecommendationMutation } from './useDeleteRecommendationMutation';
export { useAddToCollectionMutation } from './useAddToCollectionMutation';
export { useFollowUserMutation } from './useFollowUserMutation';
export { useUpdateUserProfileMutation } from './useUpdateUserProfileMutation';

// Non-Query Hooks (State Management)
export { useAlbumModal } from './useAlbumModal';
export { useCollageGenerator } from './useCollageGenerator';
export { useRecommendationModal } from './useRecommendationModal';
export { useRecommendationDrawer } from './useRecommendationDrawer';
export { useNavigation } from './useNavigation';

// Search Hooks
export { useUniversalSearch } from './useUniversalSearch';
export { useSearchNavigation } from './useSearchNavigation';

// Layout Hooks
export {
  useDrawerLayout,
  useLayoutBreakpoints,
  getLayoutClasses,
} from './useDrawerLayout';

// Re-export common types and utilities from queries infrastructure
export {
  QueryError,
  isQueryError,
  getErrorMessage,
  getErrorCode,
  getErrorStatus,
  queryKeys,
} from '@/lib/queries';

// All legacy hooks have been migrated to TanStack Query equivalents
// useUsers -> useUsersQuery
// useAlbumDetails -> useAlbumDetailsQuery
// useMasters -> useMastersQuery
