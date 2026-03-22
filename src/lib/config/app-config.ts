import prisma from '@/lib/prisma';

const APP_CONFIG_ID = 'default';

type SchedulerType = 'spotify' | 'musicbrainz' | 'listenbrainz';

// ============================================================================
// ListenBrainz Config
// ============================================================================

export interface ListenBrainzDbConfig {
  days: number;
  includeFuture: boolean;
  maxReleases: number;
  minListenCount: number;
  minArtistListeners: number;
}

const LISTENBRAINZ_DEFAULTS: ListenBrainzDbConfig = {
  days: 14,
  includeFuture: true,
  maxReleases: 50,
  minListenCount: 0,
  minArtistListeners: 1000,
};

/**
 * Read ListenBrainz sync configuration from the database.
 * Returns defaults if the row doesn't exist.
 */
export async function getListenBrainzConfig(): Promise<ListenBrainzDbConfig> {
  const config = await prisma.appConfig.findUnique({
    where: { id: APP_CONFIG_ID },
  });

  if (!config) return { ...LISTENBRAINZ_DEFAULTS };

  return {
    days: config.listenbrainzDays,
    includeFuture: config.listenbrainzIncludeFuture,
    maxReleases: config.listenbrainzMaxReleases,
    minListenCount: config.listenbrainzMinListenCount,
    minArtistListeners: config.listenbrainzMinArtistListeners,
  };
}

/**
 * Update ListenBrainz sync configuration in the database.
 * Accepts partial updates — only provided fields are changed.
 */
export async function setListenBrainzConfig(
  updates: Partial<ListenBrainzDbConfig>
): Promise<ListenBrainzDbConfig> {
  const data: Record<string, unknown> = {};
  if (updates.days !== undefined) data.listenbrainzDays = updates.days;
  if (updates.includeFuture !== undefined)
    data.listenbrainzIncludeFuture = updates.includeFuture;
  if (updates.maxReleases !== undefined)
    data.listenbrainzMaxReleases = updates.maxReleases;
  if (updates.minListenCount !== undefined)
    data.listenbrainzMinListenCount = updates.minListenCount;
  if (updates.minArtistListeners !== undefined)
    data.listenbrainzMinArtistListeners = updates.minArtistListeners;

  const config = await prisma.appConfig.upsert({
    where: { id: APP_CONFIG_ID },
    update: data,
    create: {
      id: APP_CONFIG_ID,
      listenbrainzDays: updates.days ?? LISTENBRAINZ_DEFAULTS.days,
      listenbrainzIncludeFuture:
        updates.includeFuture ?? LISTENBRAINZ_DEFAULTS.includeFuture,
      listenbrainzMaxReleases:
        updates.maxReleases ?? LISTENBRAINZ_DEFAULTS.maxReleases,
      listenbrainzMinListenCount:
        updates.minListenCount ?? LISTENBRAINZ_DEFAULTS.minListenCount,
      listenbrainzMinArtistListeners:
        updates.minArtistListeners ?? LISTENBRAINZ_DEFAULTS.minArtistListeners,
    },
  });

  return {
    days: config.listenbrainzDays,
    includeFuture: config.listenbrainzIncludeFuture,
    maxReleases: config.listenbrainzMaxReleases,
    minListenCount: config.listenbrainzMinListenCount,
    minArtistListeners: config.listenbrainzMinArtistListeners,
  };
}

// ============================================================================
// Scheduler Enabled/Disabled
// ============================================================================

/**
 * Check if a scheduler is enabled in the database.
 * Returns false if the row doesn't exist (safe default).
 */
export async function getSchedulerEnabled(
  scheduler: SchedulerType
): Promise<boolean> {
  const config = await prisma.appConfig.findUnique({
    where: { id: APP_CONFIG_ID },
  });

  if (!config) return false;

  if (scheduler === 'spotify') return config.spotifySchedulerEnabled;
  if (scheduler === 'musicbrainz') return config.musicbrainzSchedulerEnabled;
  return config.listenbrainzSchedulerEnabled;
}

/**
 * Set the enabled state for a scheduler in the database.
 * Uses upsert so it works even if the row hasn't been seeded.
 */
export async function setSchedulerEnabled(
  scheduler: SchedulerType,
  enabled: boolean
): Promise<void> {
  const fieldMap: Record<SchedulerType, string> = {
    spotify: 'spotifySchedulerEnabled',
    musicbrainz: 'musicbrainzSchedulerEnabled',
    listenbrainz: 'listenbrainzSchedulerEnabled',
  };

  const field = fieldMap[scheduler];

  await prisma.appConfig.upsert({
    where: { id: APP_CONFIG_ID },
    update: { [field]: enabled },
    create: {
      id: APP_CONFIG_ID,
      spotifySchedulerEnabled: scheduler === 'spotify' ? enabled : false,
      musicbrainzSchedulerEnabled:
        scheduler === 'musicbrainz' ? enabled : false,
      listenbrainzSchedulerEnabled:
        scheduler === 'listenbrainz' ? enabled : false,
    },
  });
}
