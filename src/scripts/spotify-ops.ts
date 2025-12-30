// src/scripts/spotify-ops.ts
/**
 * Operational scripts for Spotify sync management
 * Provides manual control, status checking, and monitoring for Spotify pipeline
 */

import {
  spotifyScheduler,
  initializeSpotifyScheduler,
} from '../lib/spotify/scheduler';
import { spotifyMetrics } from '../lib/spotify/error-handling';
import { getMusicBrainzQueue, JOB_TYPES } from '../lib/queue';
import { prisma } from '../lib/prisma';

// ============================================================================
// Command Line Interface
// ============================================================================

const COMMANDS = {
  status: 'Show Spotify sync status and metrics',
  start: 'Start the automated Spotify scheduler',
  stop: 'Stop the automated Spotify scheduler',
  sync: 'Manually trigger sync (new-releases|featured-playlists|both)',
  metrics: 'Show detailed Spotify API metrics',
  queue: 'Show Spotify job queue status',
  recent: 'Show recently synced albums with Spotify IDs',
  config: 'Show current scheduler configuration',
  help: 'Show this help message',
};

async function showStatus() {
  console.log('📊 Spotify Sync Status\n');
  console.log('='.repeat(50));

  const status = await spotifyScheduler.getStatus();

  console.log(
    `🔄 Scheduler: ${status.isRunning ? '✅ Running' : '❌ Stopped'}`
  );
  console.log(`📈 Success Rate: ${status.successRate.toFixed(1)}%`);
  console.log(`📊 Total Requests: ${status.metrics.totalRequests}`);
  console.log(`✅ Successful: ${status.metrics.successfulRequests}`);
  console.log(`❌ Failed: ${status.metrics.failedRequests}`);
  console.log(
    `⏱️  Avg Response Time: ${Math.round(status.metrics.averageResponseTime)}ms`
  );

  if (status.metrics.lastSuccessfulSync) {
    console.log(
      `🕐 Last Success: ${status.metrics.lastSuccessfulSync.toISOString()}`
    );
  }

  if (status.metrics.lastFailedSync) {
    console.log(
      `🕐 Last Failure: ${status.metrics.lastFailedSync.toISOString()}`
    );
  }

  console.log(
    `\n🎯 Active Schedules: ${status.activeSchedules.join(', ') || 'None'}`
  );
}

async function showMetrics() {
  console.log('📈 Detailed Spotify Metrics\n');
  console.log('='.repeat(50));

  const metrics = spotifyMetrics.getMetrics();

  console.log('📊 Request Statistics:');
  console.log(`  Total Requests: ${metrics.totalRequests}`);
  console.log(
    `  Successful: ${metrics.successfulRequests} (${((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(1)}%)`
  );
  console.log(
    `  Failed: ${metrics.failedRequests} (${((metrics.failedRequests / metrics.totalRequests) * 100).toFixed(1)}%)`
  );

  console.log('\n❌ Error Breakdown:');
  console.log(`  Rate Limit Hits: ${metrics.rateLimitHits}`);
  console.log(`  Network Errors: ${metrics.networkErrors}`);
  console.log(`  Auth Errors: ${metrics.authErrors}`);

  console.log('\n⏱️  Performance:');
  console.log(
    `  Average Response Time: ${Math.round(metrics.averageResponseTime)}ms`
  );

  console.log('\n🕐 Timestamps:');
  console.log(
    `  Last Successful Sync: ${metrics.lastSuccessfulSync?.toISOString() || 'Never'}`
  );
  console.log(
    `  Last Failed Sync: ${metrics.lastFailedSync?.toISOString() || 'Never'}`
  );
}

async function showQueueStatus() {
  console.log('🔄 Spotify Job Queue Status\n');
  console.log('='.repeat(50));

  try {
    const musicBrainzQueue = getMusicBrainzQueue();
    const queue = musicBrainzQueue.getQueue();

    // Get job counts by status
    const waiting = await queue.getWaiting();
    const active = await queue.getActive();
    const completed = await queue.getCompleted();
    const failed = await queue.getFailed();

    console.log('📊 Queue Statistics:');
    console.log(`  ⏳ Waiting: ${waiting.length}`);
    console.log(`  🔄 Active: ${active.length}`);
    console.log(`  ✅ Completed: ${completed.length}`);
    console.log(`  ❌ Failed: ${failed.length}`);

    // Show recent Spotify jobs
    const allJobs = [
      ...waiting,
      ...active,
      ...completed.slice(-5),
      ...failed.slice(-3),
    ];
    const spotifyJobs = allJobs.filter(
      job =>
        job.name.includes('spotify') ||
        job.name === JOB_TYPES.SPOTIFY_SYNC_NEW_RELEASES ||
        job.name === JOB_TYPES.SPOTIFY_SYNC_FEATURED_PLAYLISTS
    );

    if (spotifyJobs.length > 0) {
      console.log('\n🎵 Recent Spotify Jobs:');
      for (const job of spotifyJobs.slice(-10)) {
        const status = job.finishedOn ? (job.failedReason ? '❌' : '✅') : '🔄';
        const timestamp = job.finishedOn
          ? new Date(job.finishedOn).toLocaleTimeString()
          : 'Running';
        console.log(`  ${status} ${job.name} (${job.id}) - ${timestamp}`);
      }
    }
  } catch (error) {
    console.error('❌ Failed to get queue status:', error);
  }
}

async function showRecentAlbums() {
  console.log('🎵 Recently Synced Albums\n');
  console.log('='.repeat(50));

  try {
    const recentAlbums = await prisma.album.findMany({
      where: {
        spotifyId: {
          not: null,
        },
      },
      include: {
        artists: {
          include: {
            artist: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    if (recentAlbums.length === 0) {
      console.log('📭 No albums with Spotify IDs found');
      return;
    }

    console.log(
      `📀 Found ${recentAlbums.length} recent albums with Spotify IDs:\n`
    );

    for (const album of recentAlbums) {
      const artists = album.artists.map(a => a.artist.name).join(', ');
      const timeAgo = getTimeAgo(album.createdAt);

      console.log(`🎵 "${album.title}" by ${artists}`);
      console.log(`   Spotify ID: ${album.spotifyId}`);
      console.log(
        `   Quality: ${album.dataQuality}, Status: ${album.enrichmentStatus}`
      );
      console.log(`   Added: ${timeAgo}\n`);
    }
  } catch (error) {
    console.error('❌ Failed to get recent albums:', error);
  }
}

async function showConfig() {
  console.log('⚙️  Spotify Scheduler Configuration\n');
  console.log('='.repeat(50));

  const status = await spotifyScheduler.getStatus();
  const config = status.config;

  console.log('🎵 New Releases:');
  console.log(`  Enabled: ${config.newReleases.enabled ? '✅' : '❌'}`);
  console.log(`  Interval: ${config.newReleases.intervalMinutes} minutes`);
  console.log(`  Limit: ${config.newReleases.limit} albums`);
  console.log(`  Country: ${config.newReleases.country}`);

  console.log('\n🔧 Environment Variables:');
  console.log(
    `  SPOTIFY_CLIENT_ID: ${process.env.SPOTIFY_CLIENT_ID ? '✅ Set' : '❌ Missing'}`
  );
  console.log(
    `  SPOTIFY_CLIENT_SECRET: ${process.env.SPOTIFY_CLIENT_SECRET ? '✅ Set' : '❌ Missing'}`
  );
  console.log(
    `  SPOTIFY_COUNTRY: ${process.env.SPOTIFY_COUNTRY || 'US (default)'}`
  );
}

function showHelp() {
  console.log('🎵 Spotify Operations CLI\n');
  console.log('='.repeat(50));
  console.log('\nAvailable commands:\n');

  for (const [command, description] of Object.entries(COMMANDS)) {
    console.log(`  ${command.padEnd(12)} ${description}`);
  }

  console.log('\nExamples:');
  console.log('  npx tsx src/scripts/spotify-ops.ts status');
  console.log('  npx tsx src/scripts/spotify-ops.ts sync both');
  console.log('  npx tsx src/scripts/spotify-ops.ts sync new-releases');
  console.log('  npx tsx src/scripts/spotify-ops.ts metrics');
}

// ============================================================================
// Utility Functions
// ============================================================================

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString();
}

// ============================================================================
// Main CLI Handler
// ============================================================================

async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];

  if (!command || command === 'help') {
    showHelp();
    return;
  }

  if (!(command in COMMANDS)) {
    console.error(`❌ Unknown command: ${command}`);
    console.log('Run "help" to see available commands');
    process.exit(1);
  }

  try {
    switch (command) {
      case 'status':
        await showStatus();
        break;

      case 'start':
        console.log('🚀 Starting Spotify scheduler...');
        const started = await initializeSpotifyScheduler();
        if (started) {
          console.log('✅ Spotify scheduler started successfully');
        } else {
          console.log(
            '❌ Failed to start scheduler (check Spotify credentials)'
          );
        }
        break;

      case 'stop':
        console.log('🛑 Stopping Spotify scheduler...');
        spotifyScheduler.stop();
        console.log('✅ Spotify scheduler stopped');
        break;

      case 'sync':
        console.log('🔄 Triggering new releases sync...');
        await spotifyScheduler.triggerSync();
        break;

      case 'metrics':
        await showMetrics();
        break;

      case 'queue':
        await showQueueStatus();
        break;

      case 'recent':
        await showRecentAlbums();
        break;

      case 'config':
        await showConfig();
        break;

      default:
        console.error(`❌ Command not implemented: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Command failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

// Run CLI
main().catch(console.error);
