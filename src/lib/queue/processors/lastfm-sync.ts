// src/lib/queue/processors/lastfm-sync.ts
/**
 * Job processor for lastfm:sync-user jobs.
 * Fetches and persists Last.fm user data across multiple periods.
 */

import type { Job } from 'bullmq';
import type { Prisma } from '@prisma/client';

import type { LastFmSyncUserJobData, JobResult } from '@/lib/queue/jobs';
import { prisma } from '@/lib/prisma';

export async function handleLastFmSyncUser(
  job: Job<LastFmSyncUserJobData>
): Promise<JobResult> {
  const { userId, lastfmUsername } = job.data;
  const startTime = Date.now();

  console.log(
    `[Last.fm Sync] Starting sync for user ${userId} (${lastfmUsername})`
  );

  try {
    const { getUserInfo, getTopArtists, getTopAlbums, getRecentTracks } =
      await import('@/lib/lastfm/lastfm-client');

    // Fetch user info for totals
    const userInfoResult = await getUserInfo(lastfmUsername);

    if (!userInfoResult.success) {
      console.error(
        `[Last.fm Sync] Failed to fetch user info: ${userInfoResult.error.message}`
      );
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

    const duration = Date.now() - startTime;
    console.log(
      `[Last.fm Sync] Completed sync for ${lastfmUsername} in ${duration}ms`
    );

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
    console.error(
      `[Last.fm Sync] Error syncing ${lastfmUsername}: ${message} (${duration}ms)`
    );

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
