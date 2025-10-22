import pino from 'pino';
import path from 'path';
import { getCorrelationContext } from './correlation-context';

const isDev = process.env.NODE_ENV === 'development';
const logLevel = process.env.LOG_LEVEL || (isDev ? 'debug' : 'info');

// Base logger configuration
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
  transport: isDev
    ? {
        // Development: Pretty print to console
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss.l',
          ignore: 'pid,hostname',
        },
      }
    : {
        // Production: Write to files
        targets: [
          {
            target: 'pino/file',
            level: 'debug',
            options: { destination: path.join(process.cwd(), 'logs', 'app.log') },
          },
          {
            target: 'pino/file',
            level: 'error',
            options: {
              destination: path.join(process.cwd(), 'logs', 'error.log'),
            },
          },
        ],
      },
});

// Module-specific loggers
export const graphqlLogger = logger.child({ module: 'graphql' });
export const mbLogger = logger.child({ module: 'musicbrainz' });
export const searchLogger = logger.child({ module: 'search' });
export const queueLogger = logger.child({ module: 'queue' });
export const apiLogger = logger.child({ module: 'api' });
