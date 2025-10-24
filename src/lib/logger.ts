import pino from 'pino';
import { getCorrelationContext } from './correlation-context';

const isDev = process.env.NODE_ENV === 'development';
const logLevel = process.env.LOG_LEVEL || (isDev ? 'debug' : 'info');

// Base logger configuration
// Note: We're using simple console output instead of transports
// because Next.js bundler has issues with worker threads
export const logger = pino({
  level: logLevel,
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },
  // Automatically include correlation ID in all logs
  mixin: () => {
    const context = getCorrelationContext();
    return context
      ? {
          correlationId: context.correlationId,
          requestPath: context.requestPath,
          userId: context.userId,
        }
      : {};
  },
  // Simple console output - can be redirected to files in production
  // Use: pnpm dev > logs/app.log 2> logs/error.log
});

// Module-specific loggers
export const graphqlLogger = logger.child({ module: 'graphql' });
export const mbLogger = logger.child({ module: 'musicbrainz' });
export const searchLogger = logger.child({ module: 'search' });
export const queueLogger = logger.child({ module: 'queue' });
export const apiLogger = logger.child({ module: 'api' });
