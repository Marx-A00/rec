// src/lib/graphql/errors.ts
// GraphQL error handling and custom error types

import { GraphQLError } from 'graphql';

// Custom error codes for consistent error handling
export enum ErrorCode {
  AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

// Custom GraphQL error classes
export class AuthenticationError extends GraphQLError {
  constructor(message = 'Authentication required') {
    super(message, {
      extensions: {
        code: ErrorCode.AUTHENTICATION_REQUIRED,
        http: { status: 401 }
      }
    });
  }
}

export class ForbiddenError extends GraphQLError {
  constructor(message = 'Access forbidden') {
    super(message, {
      extensions: {
        code: ErrorCode.FORBIDDEN,
        http: { status: 403 }
      }
    });
  }
}

export class NotFoundError extends GraphQLError {
  constructor(resource: string, id?: string) {
    const message = id 
      ? `${resource} with ID "${id}" not found`
      : `${resource} not found`;
    
    super(message, {
      extensions: {
        code: ErrorCode.NOT_FOUND,
        http: { status: 404 },
        resource,
        id
      }
    });
  }
}

export class ValidationError extends GraphQLError {
  constructor(message: string, field?: string) {
    super(message, {
      extensions: {
        code: ErrorCode.VALIDATION_ERROR,
        http: { status: 400 },
        field
      }
    });
  }
}

export class DatabaseError extends GraphQLError {
  constructor(message: string, originalError?: Error) {
    super(`Database error: ${message}`, {
      extensions: {
        code: ErrorCode.DATABASE_ERROR,
        http: { status: 500 },
        originalError: originalError?.message
      }
    });
  }
}

export class ExternalAPIError extends GraphQLError {
  constructor(service: string, message: string) {
    super(`External API error from ${service}: ${message}`, {
      extensions: {
        code: ErrorCode.EXTERNAL_API_ERROR,
        http: { status: 502 },
        service
      }
    });
  }
}

// Error formatting function for Apollo Server
export function formatError(error: GraphQLError) {
  // Log error details in development
  if (process.env.NODE_ENV === 'development') {
    console.error('GraphQL Error:', {
      message: error.message,
      code: error.extensions?.code,
      path: error.path,
      source: error.source?.body,
      positions: error.positions,
      stack: error.stack,
    });
  } else {
    // In production, log without sensitive details
    console.error('GraphQL Error:', {
      message: error.message,
      code: error.extensions?.code,
      path: error.path,
      requestId: error.extensions?.requestId,
    });
  }

  // Return sanitized error to client
  return {
    message: error.message,
    locations: error.locations,
    path: error.path,
    extensions: {
      code: error.extensions?.code || ErrorCode.INTERNAL_ERROR,
      timestamp: new Date().toISOString(),
      requestId: error.extensions?.requestId,
      // Only include additional details in development
      ...(process.env.NODE_ENV === 'development' && {
        originalError: error.extensions?.originalError,
        field: error.extensions?.field,
        resource: error.extensions?.resource,
        service: error.extensions?.service,
      }),
    },
  };
}

// Helper function to wrap resolver functions with error handling
export function withErrorHandling<T extends any[], R>(
  resolver: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await resolver(...args);
    } catch (error) {
      // Re-throw GraphQL errors as-is
      if (error instanceof GraphQLError) {
        throw error;
      }

      // Handle Prisma errors
      if (error instanceof Error) {
        if (error.message.includes('Record to update not found')) {
          throw new NotFoundError('Resource', 'unknown');
        }
        if (error.message.includes('Unique constraint failed')) {
          throw new ValidationError('Duplicate value detected');
        }
        if (error.message.includes('Foreign key constraint failed')) {
          throw new ValidationError('Referenced resource does not exist');
        }
      }

      // Default error handling
      throw new GraphQLError('An unexpected error occurred', {
        extensions: {
          code: ErrorCode.INTERNAL_ERROR,
          originalError: error instanceof Error ? error.message : String(error)
        }
      });
    }
  };
}
