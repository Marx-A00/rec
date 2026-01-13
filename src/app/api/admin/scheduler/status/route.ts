// src/app/api/admin/scheduler/status/route.ts
import { NextResponse } from 'next/server';
import { Queue } from 'bullmq';

import { createRedisConnection } from '@/lib/queue/redis';

interface SchedulerStatus {
  spotify: {
    enabled: boolean;
    nextRunAt: string | null;
    lastRunAt: string | null;
    intervalMinutes: number;
    jobKey: string | null;
  };
  musicbrainz: {
    enabled: boolean;
    nextRunAt: string | null;
    lastRunAt: string | null;
    intervalMinutes: number;
    jobKey: string | null;
  };
  queue: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: boolean;
  };
}

export async function GET() {
  try {
    const redisConnection = createRedisConnection();
    const queue = new Queue('musicbrainz', { connection: redisConnection });

    // Get repeatable jobs (scheduled syncs)
    const repeatableJobs = await queue.getRepeatableJobs();

    // Find Spotify and MusicBrainz scheduled jobs
    const spotifyJob = repeatableJobs.find(job =>
      job.key.includes('spotify-new-releases')
    );
    const musicbrainzJob = repeatableJobs.find(job =>
      job.key.includes('musicbrainz-new-releases')
    );

    // Get delayed jobs to find next scheduled runs
    const delayedJobs = await queue.getDelayed();

    // Find next Spotify sync
    const nextSpotifyJob = delayedJobs.find(job =>
      job.name.includes('spotify')
    );
    const nextMusicbrainzJob = delayedJobs.find(
      job =>
        job.name.includes('musicbrainz') && job.name.includes('new-releases')
    );

    // Get recent completed jobs to find last run times
    const completedJobs = await queue.getCompleted(0, 50);
    const lastSpotifySync = completedJobs.find(job =>
      job.name.includes('spotify-sync-new-releases')
    );
    const lastMusicbrainzSync = completedJobs.find(job =>
      job.name.includes('musicbrainz-sync-new-releases')
    );

    // Get queue stats
    const [waiting, active, completed, failed, delayed, isPaused] =
      await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
        queue.isPaused(),
      ]);

    // Calculate next run time from repeatable job
    const getNextRunTime = (
      job: (typeof repeatableJobs)[0] | undefined,
      nextJob: (typeof delayedJobs)[0] | undefined
    ): string | null => {
      // BullMQ provides 'next' timestamp directly on repeatable jobs
      if (job && (job as any).next) {
        return new Date((job as any).next).toISOString();
      }

      // Fallback: check delayed queue
      if (nextJob?.delay) {
        const nextRun = new Date(nextJob.timestamp + (nextJob.delay || 0));
        return nextRun.toISOString();
      }

      return null;
    };

    // Helper to extract interval from repeatable job
    // BullMQ stores interval in the 'pattern' field as ':milliseconds' (e.g., ':604800000')
    const getIntervalMinutes = (
      job: (typeof repeatableJobs)[0] | undefined
    ): number => {
      if (!job) return 0;

      // Extract from pattern field (format: ':604800000')
      const pattern = (job as any).pattern;
      if (pattern && pattern.startsWith(':')) {
        const ms = parseInt(pattern.slice(1), 10);
        if (!isNaN(ms) && ms > 0) {
          return Math.round(ms / 60000);
        }
      }

      // Fallback: extract from key (ends with :::milliseconds)
      const key = (job as any).key;
      if (key) {
        const match = key.match(/:::(\d+)$/);
        if (match) {
          const ms = parseInt(match[1], 10);
          if (!isNaN(ms) && ms > 0) {
            return Math.round(ms / 60000);
          }
        }
      }

      return 0;
    };

    const status: SchedulerStatus = {
      spotify: {
        enabled: !!spotifyJob,
        nextRunAt: getNextRunTime(spotifyJob, nextSpotifyJob),
        lastRunAt: lastSpotifySync?.finishedOn
          ? new Date(lastSpotifySync.finishedOn).toISOString()
          : null,
        intervalMinutes: getIntervalMinutes(spotifyJob),
        jobKey: spotifyJob?.key || null,
      },
      musicbrainz: {
        enabled: !!musicbrainzJob,
        nextRunAt: getNextRunTime(musicbrainzJob, nextMusicbrainzJob),
        lastRunAt: lastMusicbrainzSync?.finishedOn
          ? new Date(lastMusicbrainzSync.finishedOn).toISOString()
          : null,
        intervalMinutes: getIntervalMinutes(musicbrainzJob),
        jobKey: musicbrainzJob?.key || null,
      },
      queue: {
        waiting,
        active,
        completed,
        failed,
        delayed,
        paused: isPaused,
      },
    };

    // Close the queue connection
    await queue.close();
    redisConnection.disconnect();

    return NextResponse.json({
      success: true,
      status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to get scheduler status:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get scheduler status',
      },
      { status: 500 }
    );
  }
}
