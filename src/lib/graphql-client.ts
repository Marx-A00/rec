// src/lib/graphql-client.ts
// GraphQL client for React Query hooks

import { GraphQLClient, ClientError } from 'graphql-request';

// Create GraphQL client instance
// Use absolute URL for client-side requests
const endpoint = typeof window !== 'undefined'
  ? `${window.location.origin}/api/graphql`
  : '/api/graphql';

export const graphqlClient = new GraphQLClient(endpoint, {
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

// Enhanced error handling for GraphQL responses
export class GraphQLError extends Error {
  public extensions: any;
  public statusCode: number;

  constructor(message: string, extensions?: any, statusCode: number = 500) {
    super(message);
    this.name = 'GraphQLError';
    this.extensions = extensions;
    this.statusCode = statusCode;
  }
}

// Helper to extract meaningful error messages
export function extractErrorMessage(error: unknown): string {
  if (error instanceof ClientError) {
    // GraphQL client error
    if (error.response?.errors?.[0]?.message) {
      return error.response.errors[0].message;
    }
  }

  if (error instanceof GraphQLError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}

// Helper to check if error is authentication related
export function isAuthError(error: unknown): boolean {
  if (error instanceof ClientError) {
    const message = error.response?.errors?.[0]?.message?.toLowerCase();
    return message?.includes('authentication') || message?.includes('unauthorized') || false;
  }
  return false;
}

// Wrapper for GraphQL requests with enhanced error handling
export async function graphqlRequest<T>(query: string, variables?: any): Promise<T> {
  try {
    return await graphqlClient.request<T>(query, variables);
  } catch (error) {
    if (error instanceof ClientError) {
      const errorMessage = error.response?.errors?.[0]?.message || 'GraphQL request failed';
      const extensions = error.response?.errors?.[0]?.extensions;
      const statusCode = error.response?.status || 500;

      throw new GraphQLError(errorMessage, extensions, statusCode);
    }
    throw error;
  }
}