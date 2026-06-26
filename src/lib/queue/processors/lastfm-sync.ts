// src/lib/queue/processors/lastfm-sync.ts
/**
 * Job processor for lastfm:sync-user jobs.
 * Fetches and persists Last.fm user data across multiple periods.
 */

import type { Job } from 'bullmq';
import type { Prisma } from '@prisma/client';

import type { LastFmSyncUserJobData, JobResult } from '@/lib/queue/jobs';
import { JOB_TYPES } from '@/lib/queue/jobs';
import { prisma } from '@/lib/prisma';
import { queueLogger } from '@/lib/logger';

export async function handleLastFmSyncUser(
  job: Job<LastFmSyncUserJobData>
): Promise<JobResult> {
  const { userId, lastfmUsername } = job.data;
  const startTime = Date.now();

  queueLogger.info({ userId, lastfmUsername }, 'Last.fm sync started');

  try {
    const { getUserInfo, getTopArtists, getTopAlbums, getRecentTracks } =
      await import('@/lib/lastfm/lastfm-client');

    // Fetch user info for totals
    const userInfoResult = await getUserInfo(lastfmUsername);

    if (!userInfoResult.success) {
      queueLogger.error({ lastfmUsername, error: userInfoResult.error.message, code: userInfoResult.error.code }, 'Last.fm sync failed to fetch user info');
      return {
        success: false,
        error: {
          message: userInfoResult.error.message,
          code: userInfoResult.error.code,
          retryable: !['user_not_found', 'private_profile'].includes(
            userInfoResult.error.code
          ),
        },
      };
    }

    const userInfo = userInfoResult.data;

    // Fetch top artists for multiple periods
    const periods = ['1month', '6month', 'overall'] as const;
    const topArtistsByPeriod: Record<string, unknown[]> = {};
    const topAlbumsByPeriod: Record<string, unknown[]> = {};

    for (const period of periods) {
      const artistsResult = await getTopArtists(lastfmUsername, period, 20);
      if (artistsResult.success) {
        topArtistsByPeriod[period] = artistsResult.data;
      }

      const albumsResult = await getTopAlbums(lastfmUsername, period, 20);
      if (albumsResult.success) {
        topAlbumsByPeriod[period] = albumsResult.data;
      }
    }

    // Fetch recent tracks (last 7 days)
    const sevenDaysAgo = Math.floor(
      (Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000
    );
    const recentResult = await getRecentTracks(
      lastfmUsername,
      50,
      sevenDaysAgo
    );
    const recentTracks = recentResult.success ? recentResult.data : [];

    // Upsert UserLastfmData (cast to Prisma.InputJsonValue for Json fields)
    const upsertData = {
      lastfmUsername,
      topArtists: topArtistsByPeriod as unknown as Prisma.InputJsonValue,
      topAlbums: topAlbumsByPeriod as unknown as Prisma.InputJsonValue,
      recentTracks: recentTracks as unknown as Prisma.InputJsonValue,
      totalPlaycount: userInfo.playcount,
      totalArtists: userInfo.artistCount ?? null,
      totalAlbums: userInfo.albumCount ?? null,
      lastSyncedAt: new Date(),
    };

    await prisma.userLastfmData.upsert({
      where: { userId },
      update: upsertData,
      create: { userId, ...upsertData },
    });

    // Queue FETCH_ARTIST_IMAGE for top artists missing images
    // (both non-local artists and local artists with null imageUrl)
    const overallArtists = (topArtistsByPeriod['overall'] || []) as Array<{
      name: string;
      mbid: string;
    }>;
    const artistMbids = overallArtists.filter(a => a.mbid).map(a => a.mbid);

    if (artistMbids.length > 0) {
      const localArtists = await prisma.artist.findMany({
        where: { musicbrainzId: { in: artistMbids } },
        select: { musicbrainzId: true, imageUrl: true, id: true },
      });
      const localMap = new Map(localArtists.map(a => [a.musicbrainzId, a]));

      const needsImage = overallArtists.filter(a => {
        if (!a.mbid) return false;
        const local = localMap.get(a.mbid);
        // Queue if: not in local DB, or in local DB but no image
        return !local || !local.imageUrl;
      });

      if (needsImage.length > 0) {
        const { getMusicBrainzQueue } = await import('@/lib/queue');
        const queue = getMusicBrainzQueue();

        for (const artist of needsImage) {
          const local = localMap.get(artist.mbid);
          await queue.addJob(JOB_TYPES.FETCH_ARTIST_IMAGE, {
            mbid: artist.mbid,
            artistName: artist.name,
            // Pass artistId so the processor can also persist to DB
            ...(local?.id ? { artistId: local.id } : {}),
          });
        }

        queueLogger.info({ count: needsImage.length }, 'Last.fm sync queued image fetch jobs for top artists');
      }
    }

    const duration = Date.now() - startTime;
    queueLogger.info({ lastfmUsername, duration }, 'Last.fm sync completed');

    return {
      success: true,
      metadata: {
        duration,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : 'Unknown error';
    queueLogger.error({ lastfmUsername, error: message, duration }, 'Last.fm sync error');

    return {
      success: false,
      error: {
        message,
        retryable: true,
      },
      metadata: {
        duration,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
