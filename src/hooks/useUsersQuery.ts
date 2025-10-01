import { useQuery } from '@tanstack/react-query';
import type { User } from '@prisma/client';

import { graphqlClient } from '@/lib/graphql-client';
import {
  queryKeys,
  defaultQueryOptions,
  QueryError,
} from '@/lib/queries';
import type { UseUsersQueryOptions, UseUsersQueryResult } from '@/types/hooks';

// ========================================
// API Functions
// ========================================

const USERS_QUERY = `
  query GetUsers {
    users {
      id
      name
      email
      image
      bio
      followersCount
      followingCount
      recommendationsCount
      createdAt
      updatedAt
    }
  }
`;

const fetchUsers = async (): Promise<User[]> => {
  try {
    const data: any = await graphqlClient.request(USERS_QUERY);
    return data.users;
  } catch (error: any) {
    if (error.response?.errors?.[0]) {
      throw new Error(error.response.errors[0].message);
    }
    throw new Error('Failed to fetch users');
  }
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
