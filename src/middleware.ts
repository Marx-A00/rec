import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  generateCorrelationId,
  runWithCorrelationId,
} from './lib/correlation-context';

/**
 * Next.js middleware to inject correlation IDs into all requests
 * This allows tracing requests across the entire application
 */
export function middleware(request: NextRequest) {
  // Check if correlation ID already exists in request header
  // (e.g., from external service or retry)
  const existingCorrelationId = request.headers.get('x-correlation-id');
  const correlationId = existingCorrelationId || generateCorrelationId();

  // Create response and add correlation ID to headers
  const response = NextResponse.next();
  response.headers.set('x-correlation-id', correlationId);

  // Store correlation context for this request
  // Note: This wraps the request in AsyncLocalStorage context
  return runWithCorrelationId(
    correlationId,
    {
      requestPath: request.nextUrl.pathname,
    },
    () => response
  );
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
