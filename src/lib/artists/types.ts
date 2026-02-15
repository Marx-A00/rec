// src/lib/artists/types.ts
// Shared types for the findOrCreateArtist helper

import type {
  Artist,
  PrismaClient,
  ContentSource,
  DataQuality,
} from '@prisma/client';
import type { ITXClientDenyList } from '@prisma/client/runtime/library';
import type {
  CheckArtistEnrichmentJobData,
  PriorityTier,
} from '@/lib/queue/jobs';
import type { LlamaLogCategory } from '@prisma/client';
import type { EnrichmentSource } from '@/lib/logging/llama-logger';

// ============================================================================
// Transaction client type (Prisma interactive transaction)
// ============================================================================

export type TransactionClient = Omit<PrismaClient, ITXClientDenyList>;
export type DbClient = PrismaClient | TransactionClient;

// ============================================================================
// Core identity and field types
// ============================================================================

/** Fields used to deduplicate artists (checked in order: musicbrainzId → spotifyId → discogsId → name) */
export interface ArtistIdentity {
  name: string;
  musicbrainzId?: string | null;
  spotifyId?: string | null;
  discogsId?: string | null;
}

/** Optional fields to set when creating a new artist */
export interface ArtistFields {
  imageUrl?: string | null;
  cloudflareImageId?: string | null;
  source?: ContentSource;
  dataQuality?: DataQuality;
  enrichmentStatus?: 'PENDING' | 'COMPLETED' | 'IN_PROGRESS' | 'FAILED';
  lastEnriched?: Date | null;
  biography?: string | null;
  genres?: string[];
  formedYear?: number | null;
  countryCode?: string | null;
  area?: string | null;
  artistType?: string | null;
  submittedBy?: string | null;
}

// ============================================================================
// Enrichment strategy types
// ============================================================================

/**
 * How to handle post-creation enrichment:
 * - 'queue-check': Queue a CHECK_ARTIST_ENRICHMENT BullMQ job (mutations)
 * - 'inline-fetch': Call tryFetchSpotifyArtistImage synchronously + queue CACHE_ARTIST_IMAGE (background workers)
 * - 'none': Skip enrichment entirely (corrections, transactional paths)
 */
export type EnrichmentStrategy = 'queue-check' | 'inline-fetch' | 'none';

/** Options for the 'queue-check' enrichment strategy */
export interface QueueCheckOptions {
  source: CheckArtistEnrichmentJobData['source'];
  priority?: 'low' | 'medium' | 'high';
  /** BullMQ numeric priority (from PriorityManager or PRIORITY_TIERS) */
  queuePriority?: number;
  requestId?: string;
  parentJobId?: string;
}

/** Options for the 'inline-fetch' enrichment strategy */
export interface InlineFetchOptions {
  parentJobId?: string;
  rootJobId?: string;
  requestId?: string;
}

/** Options for LlamaLog logging on artist creation */
export interface LoggingOptions {
  operation: string;
  sources: EnrichmentSource[];
  category?: LlamaLogCategory;
  parentJobId?: string | null;
  rootJobId?: string | null;
  userId?: string | null;
  isRootJob?: boolean;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Main function options and result
// ============================================================================

export interface FindOrCreateArtistOptions {
  /** Prisma client or transaction client */
  db: DbClient;
  /** Identity fields used for dedup lookup */
  identity: ArtistIdentity;
  /** Fields to set on a newly created artist */
  fields?: ArtistFields;
  /** How to handle enrichment after creation (default: 'queue-check') */
  enrichment?: EnrichmentStrategy;
  /** Options for queue-check enrichment strategy */
  queueCheckOptions?: QueueCheckOptions;
  /** Options for inline-fetch enrichment strategy */
  inlineFetchOptions?: InlineFetchOptions;
  /** LlamaLog logging configuration (null = no logging) */
  logging?: LoggingOptions | null;
  /** Whether we're inside a $transaction (suppresses side effects) */
  insideTransaction?: boolean;
  /** Whether to backfill missing external IDs on found artists (default: true) */
  backfillExternalIds?: boolean;
  /** Caller identifier for log messages (e.g. 'addArtist', 'musicbrainz-processor') */
  caller: string;
}

export interface FindOrCreateArtistResult {
  artist: Artist;
  created: boolean;
  /** Which dedup method matched (null if created new) */
  dedupMethod: 'musicbrainzId' | 'spotifyId' | 'discogsId' | 'name' | null;
}
