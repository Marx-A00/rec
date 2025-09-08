import { NextRequest, NextResponse } from 'next/server';

// ===========================
// RATE LIMITING CONFIGURATION
// ===========================

interface RateLimitEntry {
  count: number;
  lastReset: number;
  blockedUntil?: number;
}

// In-memory store for rate limiting (use Redis in production for distributed systems)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  // API routes rate limiting
  api: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10), // 100 requests
    blockDurationMs: parseInt(
      process.env.RATE_LIMIT_BLOCK_DURATION_MS || '600000',
      10
    ), // 10 minutes
  },
  // Authentication endpoints (more restrictive)
  auth: {
    windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '10', 10), // 10 attempts
    blockDurationMs: parseInt(
      process.env.AUTH_RATE_LIMIT_BLOCK_DURATION_MS || '1800000',
      10
    ), // 30 minutes
  },
  // Search endpoints (moderate limits)
  search: {
    windowMs: parseInt(process.env.SEARCH_RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
    maxRequests: parseInt(
      process.env.SEARCH_RATE_LIMIT_MAX_REQUESTS || '30',
      10
    ), // 30 searches
    blockDurationMs: parseInt(
      process.env.SEARCH_RATE_LIMIT_BLOCK_DURATION_MS || '300000',
      10
    ), // 5 minutes
  },
};

// Define allowed origins for CORS
const getAllowedOrigins = (): string[] => {
  // Check for environment variable first
  const envOrigins = process.env.CORS_ALLOWED_ORIGINS;
  if (envOrigins) {
    return envOrigins
      .split(',')
      .map(origin => origin.trim())
      .filter(Boolean);
  }

  // Fallback to default configuration
  const baseOrigins = [
    // Production domains (add your actual production URLs)
    'https://your-production-domain.com',
    // Add other production domains as needed
  ];

  // Development origins (only in development)
  const devOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
  ];

  // Combine based on environment
  const isDevelopment = process.env.NODE_ENV === 'development';
  return isDevelopment ? [...baseOrigins, ...devOrigins] : baseOrigins;
};

// CORS configuration
const CORS_CONFIG = {
  allowedOrigins: getAllowedOrigins(),
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
  allowCredentials:
    process.env.CORS_ALLOW_CREDENTIALS === 'false' ? false : true,
  maxAge: parseInt(process.env.CORS_MAX_AGE || '86400', 10), // Default: 24 hours
};

/**
 * Validates if the origin is allowed
 */
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  return CORS_CONFIG.allowedOrigins.includes(origin);
}

/**
 * Sets CORS headers on the response
 */
function setCorsHeaders(response: NextResponse, origin: string | null): void {
  // Set origin header (only if origin is allowed)
  if (origin && isOriginAllowed(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }

  // Set other CORS headers
  response.headers.set(
    'Access-Control-Allow-Methods',
    CORS_CONFIG.allowedMethods.join(', ')
  );
  response.headers.set(
    'Access-Control-Allow-Headers',
    CORS_CONFIG.allowedHeaders.join(', ')
  );
  response.headers.set(
    'Access-Control-Allow-Credentials',
    CORS_CONFIG.allowCredentials.toString()
  );
  response.headers.set('Access-Control-Max-Age', CORS_CONFIG.maxAge.toString());

  // Additional security headers for API responses
  response.headers.set(
    'Vary',
    'Origin, Access-Control-Request-Method, Access-Control-Request-Headers'
  );
}

/**
 * Handles preflight OPTIONS requests
 */
function handlePreflight(request: NextRequest): NextResponse {
  const origin = request.headers.get('origin');

  // Check if origin is allowed
  if (!isOriginAllowed(origin)) {
    console.warn(`CORS: Rejected preflight request from origin: ${origin}`);
    return new NextResponse(null, {
      status: 403,
      statusText: 'Forbidden - CORS policy violation',
    });
  }

  // Create preflight response
  const response = new NextResponse(null, { status: 200 });
  setCorsHeaders(response, origin);

  console.log(`CORS: Preflight request allowed for origin: ${origin}`);
  return response;
}

/**
 * Define public API routes that don't require authentication
 */
function isPublicApiRoute(pathname: string): boolean {
  const publicApiPatterns = [
    '/api/auth/', // Authentication routes (signin, register, etc.)
    '/api/search', // Public search functionality
    '/api/albums/search', // Public album search
    '/api/test/', // Test endpoints
    '/api/spotify/', // Spotify API endpoints
  ];

  // Public read-only routes (GET only)
  const publicReadOnlyPatterns = [
    '/api/artists/[id]', // Public artist details (read-only)
    '/api/labels/[id]', // Public label details (read-only)
    '/api/masters/[id]', // Public master details (read-only)
    '/api/releases/[id]', // Public release details (read-only)
  ];

  // Special case: Albums [id] route is public for GET, but nested routes require auth
  const albumDetailRegex = /^\/api\/albums\/[^/]+$/;
  if (albumDetailRegex.test(pathname)) {
    return true; // Public album details
  }

  // Check standard public API patterns
  const matchesPublicPattern = publicApiPatterns.some(pattern =>
    pathname.startsWith(pattern)
  );

  // Check read-only patterns
  const matchesReadOnlyPattern = publicReadOnlyPatterns.some(pattern => {
    if (pattern.includes('[id]')) {
      const regexPattern = pattern.replace('[id]', '[^/]+');
      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(pathname);
    }
    return pathname.startsWith(pattern);
  });

  return matchesPublicPattern || matchesReadOnlyPattern;
}

// ===========================
// MIDDLEWARE SECURITY HEADERS
// ===========================

/**
 * Add middleware-specific security headers that complement global headers
 */
function addMiddlewareSecurityHeaders(
  response: NextResponse,
  pathname: string
): void {
  // API-specific security headers (complement global headers from next.config.ts)
  if (pathname.startsWith('/api/')) {
    // Prevent caching of API responses containing sensitive data
    response.headers.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, private'
    );
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    // API-specific content type protection
    response.headers.set('X-Content-Type-Options', 'nosniff');

    // Prevent embedding API responses in frames
    response.headers.set('X-Frame-Options', 'DENY');

    // Add request ID for security monitoring
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    response.headers.set('X-Request-ID', requestId);

    // Security policy for sensitive endpoints
    if (
      pathname.includes('/auth/') ||
      pathname.includes('/collections/') ||
      pathname.includes('/users/')
    ) {
      // Extra security for sensitive endpoints
      response.headers.set(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );
      response.headers.set('X-Download-Options', 'noopen');
      response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
    }
  }

  // For all routes: Add security headers that might not be set globally
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-DNS-Prefetch-Control', 'off');

  // Development security warnings
  if (process.env.NODE_ENV === 'development') {
    response.headers.set(
      'X-Development-Warning',
      'This is a development environment'
    );
  }
}

// ===========================
// RATE LIMITING FUNCTIONS
// ===========================

/**
 * Get the rate limiting key for a request
 */
function getRateLimitKey(request: NextRequest, userID?: string): string {
  // Use user ID if authenticated, otherwise use IP
  if (userID) {
    return `user:${userID}`;
  }

  // Get IP from various possible headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfIP = request.headers.get('cf-connecting-ip');

  const ip = forwarded?.split(',')[0] || realIP || cfIP || 'unknown';
  return `ip:${ip}`;
}

/**
 * Determine rate limit configuration based on route
 */
function getRateLimitConfig(pathname: string) {
  if (pathname.startsWith('/api/auth/')) {
    return RATE_LIMIT_CONFIG.auth;
  }
  if (
    pathname.startsWith('/api/search') ||
    pathname.startsWith('/api/albums/search')
  ) {
    return RATE_LIMIT_CONFIG.search;
  }
  // Default to general API rate limiting
  return RATE_LIMIT_CONFIG.api;
}

/**
 * Clean up expired entries from rate limit store
 */
function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    // Remove entries that are both expired and not blocked
    if (
      now - entry.lastReset > RATE_LIMIT_CONFIG.api.windowMs &&
      (!entry.blockedUntil || now > entry.blockedUntil)
    ) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Check and update rate limit for a request
 */
function checkRateLimit(
  request: NextRequest,
  pathname: string,
  userID?: string
): {
  allowed: boolean;
  entry: RateLimitEntry;
  config: typeof RATE_LIMIT_CONFIG.api;
} {
  const key = getRateLimitKey(request, userID);
  const config = getRateLimitConfig(pathname);
  const now = Date.now();

  // Clean up old entries periodically (every 100 requests)
  if (Math.random() < 0.01) {
    cleanupRateLimitStore();
  }

  // Get or create rate limit entry
  let entry = rateLimitStore.get(key) || {
    count: 0,
    lastReset: now,
  };

  // Check if currently blocked
  if (entry.blockedUntil && now < entry.blockedUntil) {
    return { allowed: false, entry, config };
  }

  // Reset counter if window has passed
  if (now - entry.lastReset > config.windowMs) {
    entry = {
      count: 1,
      lastReset: now,
    };
  } else {
    entry.count += 1;
  }

  // Check if limit exceeded
  if (entry.count > config.maxRequests) {
    entry.blockedUntil = now + config.blockDurationMs;
    rateLimitStore.set(key, entry);
    return { allowed: false, entry, config };
  }

  // Update store
  rateLimitStore.set(key, entry);
  return { allowed: true, entry, config };
}

/**
 * Create rate limit exceeded response
 */
function createRateLimitResponse(
  entry: RateLimitEntry,
  config: typeof RATE_LIMIT_CONFIG.api
): NextResponse {
  const now = Date.now();
  const retryAfter = entry.blockedUntil
    ? Math.ceil((entry.blockedUntil - now) / 1000)
    : Math.ceil(config.windowMs / 1000);

  const response = NextResponse.json(
    {
      error: 'Rate limit exceeded',
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
      retryAfter,
    },
    { status: 429 }
  );

  // Add rate limiting headers
  response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
  response.headers.set(
    'X-RateLimit-Remaining',
    Math.max(0, config.maxRequests - entry.count).toString()
  );
  response.headers.set(
    'X-RateLimit-Reset',
    new Date(entry.lastReset + config.windowMs).toISOString()
  );
  response.headers.set('Retry-After', retryAfter.toString());

  return response;
}

/**
 * Check if a route requires authentication
 */
function isProtectedRoute(pathname: string): boolean {
  // All main app pages require authentication (route groups don't affect URL structure)
  const protectedPagePatterns = [
    '/albums',
    '/artists',
    '/browse',
    '/recommend',
    '/profile',
    '/labels',
  ];

  // Check if it's a protected page route
  const isProtectedPage = protectedPagePatterns.some(pattern =>
    pathname.startsWith(pattern)
  );

  // For API routes, check if it's NOT in the public list
  const isApiRoute = pathname.startsWith('/api/');
  const isProtectedApi = isApiRoute && !isPublicApiRoute(pathname);

  return isProtectedPage || isProtectedApi;
}

/**
 * Handle authentication check for protected routes
 */
async function handleAuthentication(
  request: NextRequest,
  pathname: string
): Promise<{ response: NextResponse | null; userID?: string }> {
  try {
    // Dynamically import auth to avoid edge runtime issues
    const { auth } = await import('./auth');
    const session = await auth();

    if (!session?.user) {
      // For API routes, return 401 JSON response
      if (pathname.startsWith('/api/')) {
        return {
          response: NextResponse.json(
            {
              error: 'Authentication required',
              code: 'UNAUTHENTICATED',
              message: 'Please sign in to access this resource',
            },
            { status: 401 }
          ),
        };
      }

      // For page routes, redirect to sign-in with callback URL
      const signInUrl = new URL('/signin', request.url);
      signInUrl.searchParams.set(
        'callbackUrl',
        pathname + request.nextUrl.search
      );
      return { response: NextResponse.redirect(signInUrl) };
    }

    // User is authenticated, return user ID for rate limiting
    return { response: null, userID: session.user.id };
  } catch (error) {
    console.error('Authentication check failed:', error);

    // Handle auth errors gracefully
    if (pathname.startsWith('/api/')) {
      return {
        response: NextResponse.json(
          {
            error: 'Authentication error',
            code: 'AUTH_ERROR',
            message: 'Unable to verify authentication',
          },
          { status: 500 }
        ),
      };
    }

    // Redirect to sign-in on page routes
    return { response: NextResponse.redirect(new URL('/signin', request.url)) };
  }
}

/**
 * Main middleware function
 */
export async function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const { pathname } = request.nextUrl;
  const method = request.method;

  let userID: string | undefined;

  // Skip auth entirely for public API routes to avoid Prisma edge runtime issues
  const isPublicApi = pathname.startsWith('/api/') && isPublicApiRoute(pathname);
  
  // 1. Authentication check for protected routes (both pages and API)
  if (!isPublicApi && isProtectedRoute(pathname)) {
    // Development logging for route protection decisions
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔒 Protected route accessed: ${method} ${pathname}`);
    }

    const authResult = await handleAuthentication(request, pathname);
    if (authResult.response) {
      return authResult.response; // Return authentication failure response
    }
    userID = authResult.userID;
  } else if (
    process.env.NODE_ENV === 'development' &&
    pathname.startsWith('/api/')
  ) {
    // Log public API routes in development
    console.log(`🌐 Public API route accessed: ${method} ${pathname}`);
  }

  // 2. Rate limiting for API routes (both protected and public)
  if (pathname.startsWith('/api/')) {
    const rateLimitResult = checkRateLimit(request, pathname, userID);

    if (!rateLimitResult.allowed) {
      // Development logging for rate limiting
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `⛔ Rate limit exceeded: ${method} ${pathname} by ${getRateLimitKey(request, userID)}`
        );
      }

      return createRateLimitResponse(
        rateLimitResult.entry,
        rateLimitResult.config
      );
    }

    // Development logging for successful rate limit check
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `✅ Rate limit check passed: ${method} ${pathname} (${rateLimitResult.entry.count}/${rateLimitResult.config.maxRequests})`
      );
    }
  }

  // 3. CORS handling for API routes only
  if (pathname.startsWith('/api/')) {
    // Handle preflight OPTIONS requests
    if (method === 'OPTIONS') {
      return handlePreflight(request);
    }

    // For actual requests, check origin and set CORS headers
    if (origin && !isOriginAllowed(origin)) {
      console.warn(
        `CORS: Rejected request from origin: ${origin} to ${pathname}`
      );
      return new NextResponse(
        JSON.stringify({
          error: 'CORS policy violation',
          message: 'Origin not allowed',
          code: 'CORS_ORIGIN_NOT_ALLOWED',
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Continue with the request and add CORS and security headers to the response
    const response = NextResponse.next();
    setCorsHeaders(response, origin);

    // Add middleware-specific security headers for API routes
    addMiddlewareSecurityHeaders(response, pathname);

    // Log successful CORS handling (in development only)
    if (process.env.NODE_ENV === 'development' && origin) {
      console.log(
        `CORS: Request allowed from origin: ${origin} to ${pathname}`
      );
    }

    return response;
  }

  // 4. For non-API routes (pages), add security headers and continue
  const pageResponse = NextResponse.next();
  addMiddlewareSecurityHeaders(pageResponse, pathname);
  return pageResponse;
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    // API routes (for CORS and authentication)
    '/api/(.*)',
    // Protected page routes (for authentication)
    '/albums/:path*',
    '/artists/:path*',
    '/browse/:path*',
    '/recommend/:path*',
    '/profile/:path*',
    '/labels/:path*',
  ],
};
