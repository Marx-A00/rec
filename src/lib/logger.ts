import pino from 'pino';
import type { DestinationStream, StreamEntry } from 'pino';
import fs from 'fs';
import path from 'path';

import { getCorrelationContext } from './correlation-context';

const isDev = process.env.NODE_ENV === 'development';
const logLevel = process.env.LOG_LEVEL || (isDev ? 'debug' : 'info');

function buildStreams(): StreamEntry[] {
  const streams: StreamEntry[] = [];

  if (isDev) {
    // Dev: pretty-printed console + local log files
    try {
      // pino-pretty is a devDependency — safe to require here since this branch
      // only runs when NODE_ENV=development
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pinoPretty = require('pino-pretty');
      streams.push({
        level: logLevel as pino.Level,
        stream: pinoPretty({
          translateTime: 'SYS:HH:MM:ss',
          ignore: 'pid,hostname',
          colorize: true,
          messageFormat: '{module} » {msg}',
        }),
      });
    } catch {
      // Fallback if pino-pretty is missing
      streams.push({
        level: logLevel as pino.Level,
        stream: process.stdout as unknown as DestinationStream,
      });
    }

    // Local log files (date-stamped)
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    const today = new Date().toISOString().split('T')[0];
    streams.push({
      level: 'debug' as pino.Level,
      stream: pino.destination({
        dest: path.join(logDir, `app.${today}.log`),
        mkdir: true,
        sync: false,
      }),
    });
  } else {
    // Prod: JSON to stdout (Railway captures this)
    streams.push({
      level: 'info',
      stream: process.stdout as unknown as DestinationStream,
    });
  }

  // Axiom — cloud log aggregation (both dev and prod when configured)
  if (process.env.AXIOM_DATASET && process.env.AXIOM_TOKEN) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createAxiomStream } = require('./axiom-stream');
      const axiomStream = createAxiomStream(
        process.env.AXIOM_DATASET,
        process.env.AXIOM_TOKEN
      );
      if (axiomStream) {
        streams.push({
          level: 'info' as pino.Level,
          stream: axiomStream,
        });
      }
    } catch {
      // Axiom stream not available — continue without it
    }
  }

  return streams;
}

export const logger = pino(
  {
    level: 'debug',
    formatters: {
      level: label => ({ level: label.toUpperCase() }),
    },
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
  },
  pino.multistream(buildStreams())
);

// Module-specific loggers
export const graphqlLogger = logger.child({ module: 'graphql' });
export const mbLogger = logger.child({ module: 'musicbrainz' });
export const searchLogger = logger.child({ module: 'search' });
export const queueLogger = logger.child({ module: 'queue' });
export const apiLogger = logger.child({ module: 'api' });
