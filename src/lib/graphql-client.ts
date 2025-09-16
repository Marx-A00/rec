// src/lib/graphql-client.ts
// GraphQL client for React Query hooks

import { GraphQLClient } from 'graphql-request';

// Create GraphQL client instance
export const graphqlClient = new GraphQLClient('/api/graphql', {
  headers: {
    // Add auth headers here if needed
    'Content-Type': 'application/json',
  },
  // Credentials for auth cookies
  credentials: 'include',
});

// Helper to set auth token if needed
export function setAuthToken(token: string) {
  graphqlClient.setHeader('authorization', `Bearer ${token}`);
}

// Helper to clear auth token
export function clearAuthToken() {
  graphqlClient.setHeader('authorization', '');
}