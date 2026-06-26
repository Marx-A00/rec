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
    try {
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
      streams.push({
        level: logLevel as pino.Level,
        stream: process.stdout as unknown as DestinationStream,
      });
    }

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
    streams.push({
      level: 'info',
      stream: process.stdout as unknown as DestinationStream,
    });
  }

  if (process.env.AXIOM_DATASET && process.env.AXIOM_TOKEN) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createAxiomStream } = require('./axiom-stream');
      const axiomStream = createAxiomStream(
        process.env.AXIOM_DATASET,
        process.env.AXIOM_TOKEN
      );
      if (axiomStream) {
        streams.push({ level: 'info' as pino.Level, stream: axiomStream });
      }
    } catch {
      // Axiom not available
    }
  }

  return streams;
}

// No-op logger for client bundles (logger.ts gets pulled in via import chains
// but is never meaningfully used on the client)
const noopFn = () => {};
const noopLogger = {
  debug: noopFn, info: noopFn, warn: noopFn, error: noopFn, fatal: noopFn,
  child: () => noopLogger,
} as unknown as pino.Logger;

export const logger: pino.Logger =
  typeof window === 'undefined'
    ? pino(
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
      )
    : noopLogger;

// Module-specific loggers
export const graphqlLogger = logger.child({ module: 'graphql' });
export const mbLogger = logger.child({ module: 'musicbrainz' });
export const searchLogger = logger.child({ module: 'search' });
export const queueLogger = logger.child({ module: 'queue' });
export const apiLogger = logger.child({ module: 'api' });
export const middlewareLogger = logger.child({ module: 'middleware' });
export const authLogger = logger.child({ module: 'auth' });
export const cacheLogger = logger.child({ module: 'cache' });
export const schedulerLogger = logger.child({ module: 'scheduler' });
export const enrichmentLogger = logger.child({ module: 'enrichment' });
export const spotifyLogger = logger.child({ module: 'spotify' });
export const listenbrainzLogger = logger.child({ module: 'listenbrainz' });
export const deezerLogger = logger.child({ module: 'deezer' });
export const discogsLogger = logger.child({ module: 'discogs' });
export const lastfmLogger = logger.child({ module: 'lastfm' });
