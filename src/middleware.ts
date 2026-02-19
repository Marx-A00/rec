import { NextRequest, NextResponse } from 'next/server';

// ===========================
// MOBILE DETECTION
// ===========================

const MOBILE_USER_AGENTS =
  /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i;

/**
 * Check if the request is from a mobile device
 */
function isMobileDevice(request: NextRequest): boolean {
  const userAgent = request.headers.get('user-agent') || '';
  const isMobile = MOBILE_USER_AGENTS.test(userAgent);

  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log(
      `📱 Mobile check: ${isMobile ? 'YES' : 'NO'} | UA: ${userAgent.substring(0, 80)}...`
    );
  }

  return isMobile;
}

/**
 * Check if path should skip mobile redirect
 */
function shouldSkipMobileRedirect(pathname: string): boolean {
  return (
    pathname.startsWith('/m/') ||
    pathname.startsWith('/m') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/admin') ||
    pathname.includes('.')
  );
}

/**
 * Map desktop routes to their mobile equivalents
 */
function getMobileRoute(pathname: string): string {
  // Auth routes mapping
  if (pathname === '/signin') return '/m/auth/signin';
  if (pathname === '/register') return '/m/auth/register';
  if (pathname === '/signout') return '/signout'; // Keep signout as-is

  // Default: just prepend /m
  if (pathname === '/') return '/m';
  return `/m${pathname}`;
}

/**
 * Handle mobile detection and redirect
 */
function handleMobileRedirect(
  request: NextRequest,
  pathname: string
): NextResponse | null {
  const isMobile = isMobileDevice(request);

  // Skip if already handled
  if (shouldSkipMobileRedirect(pathname)) {
    return null;
  }

  // Redirect mobile users to mobile routes
  if (isMobile) {
    const mobilePath = getMobileRoute(pathname);
    const mobileUrl = new URL(mobilePath, request.url);
    mobileUrl.search = request.nextUrl.search;
    return NextResponse.redirect(mobileUrl);
  }

  // Redirect desktop users away from mobile routes (if they somehow got there)
  if (!isMobile && pathname.startsWith('/m/')) {
    const desktopPath = pathname.replace(/^\/m/, '') || '/';
    const desktopUrl = new URL(desktopPath, request.url);
    desktopUrl.search = request.nextUrl.search;
    return NextResponse.redirect(desktopUrl);
  }

  return null;
}

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
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000', 10), // 1000 requests (increased for QueueDash)
    blockDurationMs: parseInt(
      process.env.RATE_LIMIT_BLOCK_DURATION_MS || '600000',
      10
    ), // 10 minutes
  },
  // Authentication endpoints (more restrictive)
  // Note: Only applies to security-sensitive auth routes (sign-in, OAuth callbacks).
  // Sign-out, session, and CSRF routes use the general API limit.
  auth: {
    windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(
      process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '100',
      10
    ), // 100 attempts per window
    blockDurationMs: parseInt(
      process.env.AUTH_RATE_LIMIT_BLOCK_DURATION_MS || '300000',
      10
    ), // 5 minutes
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

/**
 * Check if origin is a local network IP (for mobile testing in development)
 */
function isLocalNetworkOrigin(origin: string): boolean {
  if (process.env.NODE_ENV !== 'development') return false;

  // Match local network IPs: 192.168.x.x, 10.x.x.x, 172.16-31.x.x
  const localNetworkPattern =
    /^http:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}):\d+$/;
  return localNetworkPattern.test(origin);
}

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
  // Allow configured origins OR local network IPs in development
  return (
    CORS_CONFIG.allowedOrigins.includes(origin) || isLocalNetworkOrigin(origin)
  );
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
    '/api/graphql', // GraphQL endpoint (handles its own auth, can't use Prisma in Edge)
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

  // Special case: Albums [id] route is public for GET, including recommendations
  const albumDetailRegex = /^\/api\/albums\/[^/]+$/;
  const albumRecommendationsRegex = /^\/api\/albums\/[^/]+\/recommendations$/;
  if (
    albumDetailRegex.test(pathname) ||
    albumRecommendationsRegex.test(pathname)
  ) {
    return true; // Public album details and recommendations
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
  // Session reads are high-frequency and not security-sensitive — use general API limits
  if (pathname === '/api/auth/session') {
    return RATE_LIMIT_CONFIG.api;
  }
  // Sign-out and CSRF token are not security-sensitive — use general API limits
  if (
    pathname === '/api/auth/signout' ||
    pathname.startsWith('/api/auth/callback/signout') ||
    pathname === '/api/auth/csrf'
  ) {
    return RATE_LIMIT_CONFIG.api;
  }
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

  // Determine which bucket this route falls into (for logging)
  const bucket =
    pathname === '/api/auth/session'
      ? 'api'
      : pathname === '/api/auth/signout' ||
          pathname.startsWith('/api/auth/callback/signout') ||
          pathname === '/api/auth/csrf'
        ? 'api'
        : pathname.startsWith('/api/auth/')
          ? 'auth'
          : pathname.startsWith('/api/search') ||
              pathname.startsWith('/api/albums/search')
            ? 'search'
            : 'api';

  // Check if currently blocked
  if (entry.blockedUntil && now < entry.blockedUntil) {
    const blockedFor = Math.ceil((entry.blockedUntil - now) / 1000);
    console.warn(
      `[RATE LIMIT] BLOCKED | ${key} | ${request.method} ${pathname} | bucket=${bucket} | blocked for ${blockedFor}s more | count=${entry.count}/${config.maxRequests}`
    );
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

  // Log when approaching the limit (>75% used)
  const usage = entry.count / config.maxRequests;
  if (usage > 0.75) {
    console.warn(
      `[RATE LIMIT] WARNING | ${key} | ${request.method} ${pathname} | bucket=${bucket} | ${entry.count}/${config.maxRequests} (${Math.round(usage * 100)}%) | window resets ${Math.ceil((config.windowMs - (now - entry.lastReset)) / 1000)}s`
    );
  }

  // Check if limit exceeded
  if (entry.count > config.maxRequests) {
    entry.blockedUntil = now + config.blockDurationMs;
    rateLimitStore.set(key, entry);
    console.error(
      `[RATE LIMIT] EXCEEDED | ${key} | ${request.method} ${pathname} | bucket=${bucket} | ${entry.count}/${config.maxRequests} | blocking for ${config.blockDurationMs / 1000}s`
    );
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
  // Mobile routes handle their own auth client-side (Prisma doesn't work in Edge runtime)
  if (pathname.startsWith('/m/') || pathname === '/m') {
    return false;
  }

  // All main app pages require authentication (route groups don't affect URL structure)
  const protectedPagePatterns = [
    '/albums',
    '/artists',
    '/browse',
    '/collections',
    '/complete-profile',
    '/home-mosaic',
    '/labels',
    '/latest',
    '/profile',
    '/recommend',
    '/search',
    '/settings',
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
 * Routes that require auth but should NOT check for username
 * (to avoid redirect loops)
 */
const USERNAME_EXEMPT_ROUTES = [
  '/complete-profile',
  '/api/users/', // Allow profile updates
  '/api/auth/', // Allow auth endpoints
  '/signout',
];

/**
 * Check if a route is exempt from username requirement
 */
function isUsernameExemptRoute(pathname: string): boolean {
  return USERNAME_EXEMPT_ROUTES.some(route => pathname.startsWith(route));
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
    const { auth } = await import('../auth');
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

      // For mobile routes, redirect to mobile signin (when implemented)
      // For now, redirect to landing page
      if (pathname.startsWith('/m/')) {
        const landingUrl = new URL('/', request.url);
        landingUrl.searchParams.set(
          'callbackUrl',
          pathname + request.nextUrl.search
        );
        return { response: NextResponse.redirect(landingUrl) };
      }

      // For page routes, redirect to landing page with callback URL
      const landingUrl = new URL('/', request.url);
      landingUrl.searchParams.set(
        'callbackUrl',
        pathname + request.nextUrl.search
      );
      return { response: NextResponse.redirect(landingUrl) };
    }

    // Check if user has a username (required for most routes)
    const hasUsername =
      session.user.username && session.user.username.trim() !== '';

    if (!hasUsername && !isUsernameExemptRoute(pathname)) {
      // For API routes, return 403 indicating profile incomplete
      if (pathname.startsWith('/api/')) {
        return {
          response: NextResponse.json(
            {
              error: 'Profile incomplete',
              code: 'USERNAME_REQUIRED',
              message: 'Please set a username to continue',
            },
            { status: 403 }
          ),
        };
      }

      // For page routes, redirect to complete-profile
      const completeProfileUrl = new URL('/complete-profile', request.url);
      return { response: NextResponse.redirect(completeProfileUrl) };
    }

    // User is authenticated and has username, return user ID for rate limiting
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

    // Redirect to landing page on page routes
    return { response: NextResponse.redirect(new URL('/', request.url)) };
  }
}

/**
 * Main middleware function
 */
export async function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Debug: Log every middleware invocation
  console.log(`🔧 Middleware running: ${method} ${pathname}`);

  // 0. Mobile detection and redirect
  const mobileRedirect = handleMobileRedirect(request, pathname);
  if (mobileRedirect) {
    return mobileRedirect;
  }

  // NOTE: Auth checks removed from middleware - Prisma doesn't work in Edge runtime.
  // Pages and API routes handle their own authentication via useSession() or getServerSession().

  // 1. Rate limiting for API routes
  if (pathname.startsWith('/api/')) {
    const rateLimitResult = checkRateLimit(request, pathname);

    if (!rateLimitResult.allowed) {
      // Development logging for rate limiting
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `⛔ Rate limit exceeded: ${method} ${pathname} by ${getRateLimitKey(request)}`
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

  // 2. CORS handling for API routes
  if (pathname.startsWith('/api/')) {
    // Handle preflight OPTIONS requests
    if (method === 'OPTIONS') {
      return handlePreflight(request);
    }

    // Skip CORS origin check for NextAuth routes — these are same-origin
    // browser requests and NextAuth already handles CSRF protection
    const isNextAuthRoute = pathname.startsWith('/api/auth/');

    // For actual requests, check origin and set CORS headers
    if (origin && !isNextAuthRoute && !isOriginAllowed(origin)) {
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

  // 3. For non-API routes (pages), add security headers and continue
  const pageResponse = NextResponse.next();
  addMiddlewareSecurityHeaders(pageResponse, pathname);
  return pageResponse;
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    // Root
    '/',
    // All main routes
    '/signin',
    '/register',
    '/signout',
    '/profile/:path*',
    '/albums/:path*',
    '/artists/:path*',
    '/browse/:path*',
    '/collections/:path*',
    '/complete-profile',
    '/home-mosaic',
    '/latest',
    '/labels/:path*',
    '/recommend/:path*',
    '/search',
    '/settings',
    // Mobile routes
    '/m/:path*',
    // API routes
    '/api/:path*',
  ],
};
