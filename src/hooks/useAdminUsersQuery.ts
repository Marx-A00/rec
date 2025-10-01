import { useQuery } from '@tanstack/react-query';

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  emailVerified: string | null;
  bio: string | null;
  followersCount: number;
  followingCount: number;
  recommendationsCount: number;
  profileUpdatedAt: string | null;
  collections: {
    id: string;
    name: string;
  }[];
  _count: {
    collections: number;
    recommendations: number;
  };
}

interface UsersResponse {
  users: User[];
  totalCount: number;
}

export function useAdminUsersQuery(
  page: number = 1,
  limit: number = 20,
  search?: string
) {
  return useQuery<UsersResponse>({
    queryKey: ['adminUsers', page, limit, search],
    queryFn: async () => {
      const query = `
        query GetAdminUsers($offset: Int, $limit: Int, $search: String) {
          users(offset: $offset, limit: $limit, search: $search) {
            id
            name
            email
            image
            emailVerified
            bio
            followersCount
            followingCount
            recommendationsCount
            profileUpdatedAt
            collections {
              id
              name
            }
            _count {
              collections
              recommendations
            }
          }
          totalCount: usersCount(search: $search)
        }
      `;

      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: {
            offset: (page - 1) * limit,
            limit,
            search,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const { data, errors } = await response.json();

      if (errors) {
        throw new Error(errors[0]?.message || 'GraphQL error');
      }

      return data;
    },
    staleTime: 30000, // 30 seconds
  });
}
