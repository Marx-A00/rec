import prisma from '@/lib/prisma';

const APP_CONFIG_ID = 'default';

type SchedulerType = 'spotify' | 'musicbrainz';

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

  return scheduler === 'spotify'
    ? config.spotifySchedulerEnabled
    : config.musicbrainzSchedulerEnabled;
}

/**
 * Set the enabled state for a scheduler in the database.
 * Uses upsert so it works even if the row hasn't been seeded.
 */
export async function setSchedulerEnabled(
  scheduler: SchedulerType,
  enabled: boolean
): Promise<void> {
  const field =
    scheduler === 'spotify'
      ? 'spotifySchedulerEnabled'
      : 'musicbrainzSchedulerEnabled';

  await prisma.appConfig.upsert({
    where: { id: APP_CONFIG_ID },
    update: { [field]: enabled },
    create: {
      id: APP_CONFIG_ID,
      spotifySchedulerEnabled: scheduler === 'spotify' ? enabled : false,
      musicbrainzSchedulerEnabled:
        scheduler === 'musicbrainz' ? enabled : false,
    },
  });
}
