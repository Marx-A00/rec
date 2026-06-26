import { NextRequest, NextResponse } from 'next/server';

import {
  runWithCorrelationId,
  generateCorrelationId,
} from './correlation-context';
import { apiLogger } from './logger';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteHandler = (...args: any[]) => Promise<NextResponse | Response>;

export function withCorrelation(handler: RouteHandler): RouteHandler {
  return async (req: NextRequest, ...rest: unknown[]) => {
    const correlationId =
      req.headers.get('x-correlation-id') || generateCorrelationId();
    return runWithCorrelationId(
      correlationId,
      { requestPath: new URL(req.url).pathname },
      () => handler(req, ...rest)
    );
  };
}

export function withApiLogging(handler: RouteHandler): RouteHandler {
  return withCorrelation(async (req: NextRequest, ...rest: unknown[]) => {
    const start = performance.now();
    const method = req.method;
    const path = new URL(req.url).pathname;

    try {
      const res = await handler(req, ...rest);
      const duration = Math.round(performance.now() - start);

      apiLogger.info(
        { method, path, status: res.status, duration },
        'API request completed'
      );

      return res;
    } catch (err) {
      const duration = Math.round(performance.now() - start);
      const error = err instanceof Error ? err.message : String(err);

      apiLogger.error(
        { method, path, error, duration },
        'API request failed'
      );

      throw err;
    }
  });
}
