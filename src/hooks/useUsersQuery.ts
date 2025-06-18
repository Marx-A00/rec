import { useQuery } from '@tanstack/react-query';
import type { User } from '@prisma/client';

import {
  queryKeys,
  defaultQueryOptions,
  handleApiResponse,
  QueryError,
} from '@/lib/queries';
import type { UseUsersQueryOptions, UseUsersQueryResult } from '@/types/hooks';

// ========================================
// API Functions
// ========================================

const fetchUsers = async (): Promise<User[]> => {
  const response = await fetch('/api/users');
  const data = await handleApiResponse(response);
  return data.users;
};

// ========================================
// Hook
// ========================================

export function useUsersQuery(
  options: UseUsersQueryOptions = {}
): UseUsersQueryResult {
  const { enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.users(),
    queryFn: fetchUsers,
    enabled,
    ...defaultQueryOptions.standard,
  });
}

// Re-export types for convenience
export type { User } from '@prisma/client';
export type { UseUsersQueryOptions, UseUsersQueryResult } from '@/types/hooks';
export { QueryError, isQueryError, getErrorMessage } from '@/lib/queries';
