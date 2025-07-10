import { z } from 'zod';

// ===========================
// QUERY PARAMETER SCHEMAS
// ===========================

// Search query validation
export const searchQuerySchema = z.object({
  query: z
    .string()
    .min(1, 'Search query cannot be empty')
    .max(100, 'Search query must be 100 characters or less')
    .trim(),
  type: z.enum(['all', 'albums', 'artists', 'labels', 'tracks']).default('all'),
  page: z
    .string()
    .optional()
    .default('1')
    .pipe(
      z
        .string()
        .refine(val => /^\d+$/.test(val), 'Page must be a positive number')
        .transform(val => Number(val))
        .refine(val => val >= 1, 'Page must be at least 1')
    ),
  per_page: z
    .string()
    .optional()
    .default('15')
    .pipe(
      z
        .string()
        .refine(val => /^\d+$/.test(val), 'Per page must be a positive number')
        .transform(val => Number(val))
        .refine(
          val => val >= 1 && val <= 100,
          'Per page must be between 1 and 100'
        )
    ),
  // ===========================
  // PHASE 3: Enhanced Parameters
  // ===========================

  // Entity types filter - comma-separated list
  entityTypes: z
    .string()
    .optional()
    .transform(val => (val ? val.split(',').map(t => t.trim()) : []))
    .pipe(
      z
        .array(
          z.enum(['album', 'artist', 'label', 'track', 'user', 'playlist'])
        )
        .optional()
        .default([])
    ),

  // JSON-based filters for advanced filtering
  filters: z
    .string()
    .optional()
    .transform(val => {
      if (!val) return {};
      try {
        return JSON.parse(val);
      } catch {
        return {};
      }
    })
    .pipe(
      z
        .object({
          genre: z.array(z.string()).optional(),
          year: z
            .object({
              min: z
                .number()
                .min(1900)
                .max(new Date().getFullYear())
                .optional(),
              max: z
                .number()
                .min(1900)
                .max(new Date().getFullYear())
                .optional(),
            })
            .optional(),
          decade: z.array(z.string()).optional(),
          label: z.array(z.string()).optional(),
          country: z.array(z.string()).optional(),
          format: z.array(z.string()).optional(),
          status: z.array(z.string()).optional(),
          // User-specific filters
          userStatus: z.enum(['active', 'inactive', 'pending']).optional(),
          // Custom filters for context-specific search
          collection: z.string().optional(),
          recommendation: z.boolean().optional(),
        })
        .optional()
        .default({})
    ),

  // Search context for context-aware results
  context: z
    .enum([
      'global',
      'modal',
      'users',
      'recommendations',
      'compact',
      'collection',
      'sidebar',
      'inline',
    ])
    .optional()
    .default('global'),

  // Sorting options
  sortBy: z
    .enum([
      'relevance',
      'title',
      'artist',
      'year',
      'added',
      'popularity',
      'alphabetical',
    ])
    .optional()
    .default('relevance'),

  // Sort order
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),

  // Deduplication flag
  deduplicate: z
    .string()
    .optional()
    .transform(val => val === 'true' || val === '1')
    .pipe(z.boolean().optional().default(true)),

  // Result grouping
  groupBy: z
    .enum(['none', 'type', 'artist', 'label', 'year', 'genre'])
    .optional()
    .default('type'),

  // Limit per entity type (for mixed searches)
  limit: z
    .string()
    .optional()
    .pipe(
      z
        .string()
        .optional()
        .transform(val => (val ? Number(val) : undefined))
        .pipe(z.number().min(1).max(50).optional())
    ),

  // Include metadata in response
  includeMetadata: z
    .string()
    .optional()
    .transform(val => val === 'true' || val === '1')
    .pipe(z.boolean().optional().default(false)),

  // Track search specific - search within releases for tracks
  searchInTracks: z
    .string()
    .optional()
    .transform(val => val === 'true' || val === '1')
    .pipe(z.boolean().optional().default(false)),
});

// Collection query parameters
export const collectionQuerySchema = z.object({
  page: z
    .string()
    .regex(/^\d+$/, 'Page must be a positive number')
    .transform(Number)
    .refine(val => val >= 1, 'Page must be at least 1')
    .default('1')
    .optional(),
  limit: z
    .string()
    .regex(/^\d+$/, 'Limit must be a positive number')
    .transform(Number)
    .refine(val => val >= 1 && val <= 50, 'Limit must be between 1 and 50')
    .default('20')
    .optional(),
  sort: z
    .enum(['added', 'title', 'artist', 'year'])
    .default('added')
    .optional(),
  order: z.enum(['asc', 'desc']).default('desc').optional(),
});

// ===========================
// REQUEST BODY SCHEMAS
// ===========================

// Album creation/update schema
export const albumRequestSchema = z.object({
  title: z
    .string()
    .min(1, 'Album title is required')
    .max(200, 'Album title must be 200 characters or less')
    .trim(),
  artist: z
    .string()
    .min(1, 'Artist name is required')
    .max(100, 'Artist name must be 100 characters or less')
    .trim(),
  year: z
    .number()
    .int()
    .min(1900, 'Year must be 1900 or later')
    .max(new Date().getFullYear() + 1, 'Year cannot be in the distant future')
    .optional(),
  genre: z
    .array(z.string().trim().min(1))
    .max(10, 'Maximum 10 genres allowed')
    .optional(),
  image: z
    .object({
      url: z.string().url('Image URL must be valid'),
      width: z.number().int().positive().optional(),
      height: z.number().int().positive().optional(),
      alt: z.string().optional(),
    })
    .optional(),
});

// Collection creation/update schema
export const collectionRequestSchema = z.object({
  name: z
    .string()
    .min(1, 'Collection name is required')
    .max(100, 'Collection name must be 100 characters or less')
    .trim(),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or less')
    .trim()
    .optional(),
  isPublic: z.boolean().default(false).optional(),
});

// Add album to collection schema
export const addToCollectionSchema = z.object({
  albumId: z
    .string()
    .min(1, 'Album ID is required')
    .regex(/^\d+$/, 'Album ID must be numeric'),
});

// User registration schema (name required and strict)
export const userRegistrationSchema = z.object({
  email: z
    .string()
    .email('Please provide a valid email address')
    .max(255, 'Email must be 255 characters or less')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password must be 128 characters or less')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    ),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters long')
    .max(30, 'Name must be 30 characters or less')
    .regex(
      /^[a-zA-Z0-9\s\-_.]+$/,
      'Name can only contain letters, numbers, spaces, hyphens, underscores, and periods'
    )
    .transform(val => val.trim()), // Name is required!
});

// User profile update schema (name required, minimum 2 characters)
export const userProfileUpdateSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters long')
    .max(30, 'Name must be 30 characters or less')
    .regex(
      /^[a-zA-Z0-9\s\-_.]+$/,
      'Name can only contain letters, numbers, spaces, hyphens, underscores, and periods'
    )
    .transform(val => val.trim()), // Name is required for profile updates
  bio: z.string().max(500).optional(),
});

// ===========================
// RESPONSE SCHEMAS
// ===========================

// Standard error response schema
export const errorResponseSchema = z.object({
  error: z.string(),
  details: z.string().optional(),
  code: z.string().optional(),
  timestamp: z.string().datetime().optional(),
});

// Standard success response schema
export const successResponseSchema = z.object({
  message: z.string(),
  data: z.any().optional(),
});

// Paginated response schema
export const paginatedResponseSchema = z.object({
  data: z.array(z.any()),
  pagination: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
});

// ===========================
// TYPE EXPORTS
// ===========================

export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type CollectionQuery = z.infer<typeof collectionQuerySchema>;
export type AlbumRequest = z.infer<typeof albumRequestSchema>;
export type CollectionRequest = z.infer<typeof collectionRequestSchema>;
export type AddToCollectionRequest = z.infer<typeof addToCollectionSchema>;
export type UserRegistrationRequest = z.infer<typeof userRegistrationSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type SuccessResponse = z.infer<typeof successResponseSchema>;
export type PaginatedResponse = z.infer<typeof paginatedResponseSchema>;

// ===========================
// UTILITY FUNCTIONS
// ===========================

// Validate query parameters from URL search params
export function validateQueryParams<T>(
  schema: z.ZodSchema<T>,
  searchParams: URLSearchParams
):
  | { success: true; data: T }
  | { success: false; error: string; details: string[] } {
  try {
    // Convert URLSearchParams to object
    const params = Object.fromEntries(searchParams.entries());
    const data = schema.parse(params);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details = error.errors.map(
        e => `${e.path.join('.')}: ${e.message}`
      );
      const errorMessage = `Invalid query parameters: ${details.join(', ')}`;
      return { success: false, error: errorMessage, details };
    }
    return {
      success: false,
      error: 'Invalid query parameters',
      details: ['Unknown validation error'],
    };
  }
}

// Validate request body JSON
export function validateRequestBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown
):
  | { success: true; data: T }
  | { success: false; error: string; details: string[] } {
  try {
    const data = schema.parse(body);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details = error.errors.map(
        e => `${e.path.join('.')}: ${e.message}`
      );
      const errorMessage = `Invalid request body: ${details.join(', ')}`;
      return { success: false, error: errorMessage, details };
    }
    return {
      success: false,
      error: 'Invalid request body',
      details: ['Unknown validation error'],
    };
  }
}

// Create standardized error response
export function createErrorResponse(
  error: string,
  status: number = 400,
  details?: string,
  code?: string
) {
  const timestamp = new Date().toISOString();
  const errorResponse: ErrorResponse = {
    error,
    ...(details && { details }),
    ...(code && { code }),
    timestamp,
  };

  return {
    response: errorResponse,
    status,
  };
}

// Create standardized success response
export function createSuccessResponse(
  message: string,
  data?: any,
  status: number = 200
) {
  const successResponse: SuccessResponse = {
    message,
    ...(data && { data }),
  };

  return {
    response: successResponse,
    status,
  };
}

// Create paginated response
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): PaginatedResponse {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
    },
  };
}

// ===========================
// SECURITY HEADERS UTILITY
// ===========================

/**
 * Security headers object for API responses
 * These headers are already applied globally via next.config.ts,
 * but this utility can be used for route-specific customization
 */
export const API_SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Permissions-Policy':
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), bluetooth=(), accelerometer=(), gyroscope=(), magnetometer=(), ambient-light-sensor=()',
  'X-Robots-Tag': 'noindex, nofollow, nosnippet, noarchive',
} as const;

/**
 * Add security headers to a NextResponse object
 * Note: These headers are already applied globally via next.config.ts
 * This utility is for special cases requiring header customization
 */
export function addSecurityHeaders(
  response: Response,
  customHeaders?: Record<string, string>
): Response {
  const headers = { ...API_SECURITY_HEADERS, ...customHeaders };

  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

// ===========================
// CORS UTILITIES
// ===========================

/**
 * CORS configuration constants
 * Note: CORS is already handled globally via middleware.ts
 * These utilities are for special cases requiring custom CORS handling
 */
export const CORS_CONFIG = {
  allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Accept',
    'Accept-Version',
    'Authorization',
    'Content-Length',
    'Content-MD5',
    'Content-Type',
    'Date',
    'X-Api-Version',
    'X-CSRF-Token',
    'X-Requested-With',
  ],
  allowCredentials: true,
  maxAge: 86400, // 24 hours
} as const;

/**
 * Add CORS headers to a response
 * Note: CORS is already handled globally via middleware.ts
 * This utility is for special cases requiring custom CORS configuration
 */
export function addCorsHeaders(
  response: Response,
  origin: string | null,
  customConfig?: Partial<typeof CORS_CONFIG>
): Response {
  const config = { ...CORS_CONFIG, ...customConfig };

  // Only set origin if provided and not wildcard
  if (origin && origin !== '*') {
    response.headers.set('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // For same-origin requests, we might not have an origin header
    response.headers.set('Access-Control-Allow-Origin', '*');
  }

  response.headers.set(
    'Access-Control-Allow-Methods',
    config.allowedMethods.join(', ')
  );
  response.headers.set(
    'Access-Control-Allow-Headers',
    config.allowedHeaders.join(', ')
  );
  response.headers.set(
    'Access-Control-Allow-Credentials',
    config.allowCredentials.toString()
  );
  response.headers.set('Access-Control-Max-Age', config.maxAge.toString());
  response.headers.set(
    'Vary',
    'Origin, Access-Control-Request-Method, Access-Control-Request-Headers'
  );

  return response;
}
