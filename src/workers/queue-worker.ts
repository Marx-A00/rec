// @ts-nocheck - Worker class has type issues, needs refactor
// src/workers/queue-worker.ts
/**
 * Production Queue Worker + HTTP Dashboard Server
 * Single process handling:
 *   - BullMQ job processing (21 job types across 6 services)
 *   - Bull Board monitoring dashboard (Express on :3001)
 *   - Scheduler control endpoints (start/stop/sync)
 *   - Health, metrics, alerts, and queue management APIs
 * Auto-restarts on failures, production-ready
 */

import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import chalk from 'chalk';
import express from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import type { Server } from 'http';

import { getMusicBrainzQueue } from '@/lib/queue';
import { processMusicBrainzJob } from '@/lib/queue/processors';
import { startQueueActivityMonitor } from '@/lib/activity/queue-activity-monitor';
import {
  initializeSpotifyScheduler,
  shutdownSpotifyScheduler,
  spotifyScheduler,
} from '@/lib/spotify/scheduler';
import {
  initializeMusicBrainzScheduler,
  shutdownMusicBrainzScheduler,
  musicBrainzScheduler,
} from '@/lib/musicbrainz/new-releases-scheduler';
import {
  healthChecker,
  metricsCollector,
  alertManager,
} from '@/lib/monitoring';
import { setSchedulerEnabled } from '@/lib/config/app-config';

// Load environment variables from .env.local and .env
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const HTTP_PORT = 3001;
const API_KEY = process.env.WORKER_API_KEY || '';
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://rec-production.up.railway.app',
  process.env.NEXT_PUBLIC_APP_URL,
].filter(Boolean);

class MusicBrainzWorkerService {
  private worker: any;
  private server: Server | null = null;
  private isShuttingDown = false;
  private isRestarting = false;
  private restartAttempts = 0;
  private readonly maxRestartAttempts = 5;
  private readonly restartDelay = 2000; // 2 seconds
  private prisma: PrismaClient;

  async start() {
    console.log(
      '🎵 Worker started | Rate: 1/sec | Dashboard: http://localhost:3001'
    );

    // Initialize Prisma
    this.prisma = new PrismaClient();

    await this.createWorker();
    this.setupGracefulShutdown();

    // Start queue activity monitor
    startQueueActivityMonitor(this.prisma, 15000); // Check every 15 seconds
    console.log('🔄 Queue activity monitor started');

    // Initialize Spotify scheduler (weekly automated syncs)
    console.log('🎧 Initializing Spotify scheduler...');
    const spotifySchedulerStarted = await initializeSpotifyScheduler();
    if (spotifySchedulerStarted) {
      console.log('✅ Spotify scheduler started successfully (weekly sync)');
    } else {
      console.log(
        '⏭️  Spotify scheduler disabled (check environment variables)'
      );
    }

    // Initialize MusicBrainz scheduler (weekly automated syncs)
    console.log('🎵 Initializing MusicBrainz scheduler...');
    const mbSchedulerStarted = await initializeMusicBrainzScheduler();
    if (mbSchedulerStarted) {
      console.log(
        '✅ MusicBrainz scheduler started successfully (weekly sync)'
      );
    } else {
      console.log('⏭️  MusicBrainz scheduler disabled');
    }

    // Start HTTP server for Bull Board dashboard + API endpoints
    this.startHttpServer();

    // Keep process alive
    this.keepAlive();
  }

  private async createWorker() {
    try {
      const musicBrainzQueue = getMusicBrainzQueue();

      // Create production worker
      this.worker = musicBrainzQueue.createWorker(processMusicBrainzJob, {
        concurrency: 1, // Process one job at a time (rate limiting)
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50, // Keep last 50 failed jobs
      });

      // Enhanced logging for production
      this.worker.on('ready', () => {
        console.log('✅ Ready');
        this.restartAttempts = 0;
      });

      this.worker.on('active', (job: any) => {
        const jobData = job.data as any;
        const query = jobData.query || job.name;
        const queryInfo = jobData.query
          ? `Query: "${jobData.query}"`
          : jobData.mbid
            ? `MBID: ${jobData.mbid}`
            : jobData.albumId
              ? `Album ID: ${jobData.albumId}`
              : jobData.artistId
                ? `Artist ID: ${jobData.artistId}`
                : null;

        const border = chalk.blue('─'.repeat(50));

        console.log('\n' + border);
        console.log(
          `${chalk.bold.white('PROCESSING')} ${chalk.blue('[WORKER LAYER]')}`
        );
        console.log(border);
        console.log(`  ${chalk.cyan('Job:')}      ${chalk.white(job.name)}`);
        console.log(
          `  ${chalk.cyan('ID:')}       ${chalk.white(`#${job.id}`)}`
        );
        if (queryInfo) {
          console.log(`  ${chalk.cyan('Details:')}  ${chalk.white(queryInfo)}`);
        }
        console.log(border + '\n');
      });

      this.worker.on('completed', (job: any, result: any) => {
        const jobData = job.data as any;
        const duration = Date.now() - job.processedOn;
        const resultCount = result?.data
          ? Array.isArray(result.data)
            ? result.data.length
            : 1
          : 0;

        // Extract job details
        let jobInfo = job.name;
        if (jobData.query) {
          jobInfo = `${job.name} • Query: "${jobData.query}"`;
        } else if (jobData.mbid) {
          jobInfo = `${job.name} • MBID: ${jobData.mbid.substring(0, 8)}...`;
        } else if (jobData.artistMbid) {
          jobInfo = `${job.name} • Artist MBID: ${jobData.artistMbid.substring(0, 8)}...`;
        }

        const border = chalk.green('─'.repeat(50));

        console.log('\n' + border);
        console.log(
          `${chalk.bold.green('COMPLETED')} ${chalk.green('[WORKER LAYER]')}`
        );
        console.log(border);
        console.log(`  ${chalk.cyan('Job ID:')}   ${chalk.white(job.id)}`);
        console.log(`  ${chalk.cyan('Job:')}      ${chalk.white(jobInfo)}`);
        console.log(
          `  ${chalk.cyan('Duration:')} ${chalk.white(`${duration}ms`)}`
        );
        console.log(`  ${chalk.cyan('Results:')}  ${chalk.white(resultCount)}`);
        console.log(border + '\n');
      });

      this.worker.on('failed', (job: any, err: Error) => {
        const jobData = job?.data as any;

        // Extract job details
        let jobInfo = job?.name || 'Unknown';
        if (jobData?.query) {
          jobInfo = `${job.name} • Query: "${jobData.query}"`;
        } else if (jobData?.mbid) {
          jobInfo = `${job.name} • MBID: ${jobData.mbid.substring(0, 8)}...`;
        } else if (jobData?.artistMbid) {
          jobInfo = `${job.name} • Artist MBID: ${jobData.artistMbid.substring(0, 8)}...`;
        }

        const border = chalk.red('─'.repeat(50));

        console.log('\n' + border);
        console.log(
          `${chalk.bold.red('FAILED')} ${chalk.red('[WORKER LAYER]')}`
        );
        console.log(border);
        console.log(
          `  ${chalk.cyan('Job ID:')} ${chalk.white(job?.id || 'Unknown')}`
        );
        console.log(`  ${chalk.cyan('Job:')}    ${chalk.white(jobInfo)}`);
        console.log(`  ${chalk.cyan('Error:')}  ${chalk.red(err.message)}`);
        console.log(border + '\n');
      });

      this.worker.on('error', (err: Error) => {
        console.error('🚨 Worker error:', err.message);
        if (!this.isShuttingDown) {
          this.handleWorkerCrash(err);
        }
      });

      this.worker.on('stalled', (jobId: string) => {
        console.warn(`⚠️ Job #${jobId} stalled`);
      });

      // Worker initialized - no extra logging needed
    } catch (error) {
      console.error('❌ Failed to create worker:', error);
      if (!this.isShuttingDown) {
        this.handleWorkerCrash(error as Error);
      }
    }
  }

  /**
   * Start the Express HTTP server for Bull Board dashboard and API endpoints.
   * Runs in the same process as the worker, so scheduler control endpoints
   * directly access the real scheduler singletons (no cross-process issues).
   */
  private startHttpServer() {
    const app = express();
    app.disable('x-powered-by');
    app.set('env', 'production');

    // CORS middleware
    app.use((req, res, next) => {
      const origin = req.headers.origin;
      if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
      }
      res.header(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS'
      );
      res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, X-API-Key'
      );

      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // API Key authentication middleware (skip for health check)
    app.use((req, res, next) => {
      if (req.path === '/health') return next();
      if (!API_KEY || process.env.NODE_ENV === 'development') return next();

      const providedKey = req.headers['x-api-key'];
      if (providedKey !== API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      next();
    });

    // JSON body parser
    app.use(express.json());

    // Bull Board dashboard
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/admin/queues');

    try {
      const musicBrainzQueue = getMusicBrainzQueue();
      createBullBoard({
        queues: [new BullMQAdapter(musicBrainzQueue.getQueue())],
        serverAdapter: serverAdapter,
      });
    } catch (error) {
      console.error('❌ Failed to configure Bull Board:', error);
    }

    app.use('/admin/queues', serverAdapter.getRouter());

    // ─── Health & Monitoring ───────────────────────────────────────

    app.get('/health', async (_req, res) => {
      try {
        const health = await healthChecker.checkHealth();
        const statusCode = health.status === 'unhealthy' ? 503 : 200;
        res.status(statusCode).json(health);
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
      }
    });

    app.get('/metrics', (_req, res) => {
      const metrics = metricsCollector.getCurrentMetrics();
      const history = metricsCollector.getMetricsHistory(100);
      const jobMetrics = metricsCollector.getJobMetrics(50);

      res.json({
        current: metrics,
        history,
        jobs: jobMetrics,
        timestamp: new Date().toISOString(),
      });
    });

    app.get('/alerts', (_req, res) => {
      const active = alertManager.getActiveAlerts();
      const history = alertManager.getAlertHistory(50);
      res.json({ active, history, timestamp: new Date().toISOString() });
    });

    app.post('/alerts/:alertId/acknowledge', (req, res) => {
      const { alertId } = req.params;
      const success = alertManager.acknowledgeAlert(alertId);
      res.json({
        success,
        message: success
          ? 'Alert acknowledged'
          : 'Alert not found or already acknowledged',
      });
    });

    app.post('/alerts/:alertId/resolve', (req, res) => {
      const { alertId } = req.params;
      const success = alertManager.resolveAlert(alertId);
      res.json({
        success,
        message: success
          ? 'Alert resolved'
          : 'Alert not found or already resolved',
      });
    });

    app.get('/dashboard', async (_req, res) => {
      try {
        const health = await healthChecker.checkHealth();
        const metrics = metricsCollector.getCurrentMetrics();
        const alerts = alertManager.getActiveAlerts();
        const queue = getMusicBrainzQueue();
        const stats = await queue.getStats();

        res.json({
          health: health.status,
          queueDepth: stats.waiting + stats.active + stats.delayed,
          activeJobs: stats.active,
          failedJobs: stats.failed,
          completedJobs: stats.completed,
          errorRate: metrics?.queue.errorRate || 0,
          throughput: metrics?.queue.throughput || null,
          activeAlerts: alerts.length,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to get dashboard data',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // ─── Queue Management ──────────────────────────────────────────

    app.get('/queue/metrics', async (_req, res) => {
      try {
        const queue = getMusicBrainzQueue();
        const metrics = await queue.getMetrics();
        const stats = await queue.getStats();

        res.json({
          ...metrics,
          queueDepth: stats.waiting + stats.active + stats.delayed,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to get queue metrics',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    app.get('/queue/snapshot', async (_req, res) => {
      try {
        const queue = getMusicBrainzQueue().getQueue();
        const stats = await getMusicBrainzQueue().getStats();
        const isPaused = await queue.isPaused();

        const [waiting, active, delayed, failed] = await Promise.all([
          queue.getWaiting(0, 20),
          queue.getActive(0, 10),
          queue.getDelayed(0, 10),
          queue.getFailed(0, 10),
        ]);

        const formatJob = (job: any, status: string) => ({
          id: job.id,
          name: job.name,
          status,
          data: {
            query: job.data?.query,
            mbid: job.data?.mbid,
            artistMbid: job.data?.artistMbid,
            albumId: job.data?.albumId,
            artistId: job.data?.artistId,
          },
          createdAt: new Date(job.timestamp).toISOString(),
          processedOn: job.processedOn
            ? new Date(job.processedOn).toISOString()
            : undefined,
          attempts: job.attemptsMade || 0,
          error: job.failedReason,
        });

        res.json({
          stats: {
            waiting: stats.waiting,
            active: stats.active,
            delayed: stats.delayed,
            completed: stats.completed,
            failed: stats.failed,
            paused: isPaused,
          },
          jobs: {
            active: active.map(j => formatJob(j, 'active')),
            waiting: waiting.map(j => formatJob(j, 'waiting')),
            delayed: delayed.map(j => formatJob(j, 'delayed')),
            failed: failed.map(j => formatJob(j, 'failed')),
          },
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to get queue snapshot',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    app.post('/queue/pause', async (_req, res) => {
      try {
        await getMusicBrainzQueue().pause();
        res.json({ success: true, message: 'Queue paused' });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to pause queue',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    app.post('/queue/resume', async (_req, res) => {
      try {
        await getMusicBrainzQueue().resume();
        res.json({ success: true, message: 'Queue resumed' });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to resume queue',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    app.post('/queue/cleanup', async (req, res) => {
      try {
        const { olderThan = 86400000 } = req.body;
        await getMusicBrainzQueue().cleanup(olderThan);
        res.json({ success: true, message: 'Queue cleaned up' });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to cleanup queue',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // ─── Spotify Scheduler ─────────────────────────────────────────

    app.get('/spotify/metrics', async (_req, res) => {
      try {
        const { spotifyMetrics } = await import('@/lib/spotify/error-handling');
        const metrics = spotifyMetrics.getMetrics();
        const status = await spotifyScheduler.getStatus();

        res.json({
          scheduler: {
            isRunning: status.isRunning,
            activeSchedules: status.activeSchedules,
            config: status.config,
          },
          metrics: {
            ...metrics,
            successRate: spotifyMetrics.getSuccessRate(),
          },
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to get Spotify metrics',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    app.post('/spotify/:action', async (req, res) => {
      const { action } = req.params;

      try {
        switch (action) {
          case 'start': {
            // setSchedulerEnabled('spotify', true) is called inside start()
            // so initializeSpotifyScheduler will see it as enabled
            await setSchedulerEnabled('spotify', true);
            const started = await initializeSpotifyScheduler();
            res.json({
              success: started,
              message: started
                ? 'Spotify scheduler started'
                : 'Failed to start (check credentials)',
            });
            break;
          }

          case 'stop': {
            await spotifyScheduler.stop();
            res.json({ success: true, message: 'Spotify scheduler stopped' });
            break;
          }

          case 'sync': {
            await spotifyScheduler.triggerSync();
            res.json({
              success: true,
              message: 'New releases sync triggered',
            });
            break;
          }

          default:
            res.status(400).json({
              error: 'Invalid action. Use: start, stop, or sync',
            });
        }
      } catch (error) {
        res.status(500).json({
          error: 'Spotify action failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // ─── MusicBrainz Scheduler ─────────────────────────────────────

    app.get('/musicbrainz/metrics', async (_req, res) => {
      try {
        const status = await musicBrainzScheduler.getStatus();

        res.json({
          scheduler: {
            isRunning: status.isRunning,
            activeSchedules: status.activeSchedules,
            config: status.config,
          },
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to get MusicBrainz metrics',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    app.post('/musicbrainz/:action', async (req, res) => {
      const { action } = req.params;

      try {
        switch (action) {
          case 'start': {
            await setSchedulerEnabled('musicbrainz', true);
            const started = await initializeMusicBrainzScheduler();
            res.json({
              success: started,
              message: started
                ? 'MusicBrainz scheduler started'
                : 'Failed to start MusicBrainz scheduler',
            });
            break;
          }

          case 'stop': {
            await musicBrainzScheduler.stop();
            res.json({
              success: true,
              message: 'MusicBrainz scheduler stopped',
            });
            break;
          }

          case 'sync': {
            await musicBrainzScheduler.triggerSync();
            res.json({
              success: true,
              message: 'MusicBrainz new releases sync triggered',
            });
            break;
          }

          default:
            res.status(400).json({
              error: 'Invalid action. Use: start, stop, or sync',
            });
        }
      } catch (error) {
        res.status(500).json({
          error: 'MusicBrainz action failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // ─── Job History ───────────────────────────────────────────────

    app.get('/jobs/history', async (req, res) => {
      try {
        const {
          page = '1',
          limit = '20',
          status: statusFilter = '',
          timeRange = '24h',
        } = req.query;

        const queue = getMusicBrainzQueue().getQueue();

        // Calculate time filter
        const now = Date.now();
        let startTime = 0;
        switch (timeRange) {
          case '1h':
            startTime = now - 3600000;
            break;
          case '24h':
            startTime = now - 86400000;
            break;
          case '7d':
            startTime = now - 604800000;
            break;
          case '30d':
            startTime = now - 2592000000;
            break;
          default:
            startTime = 0;
        }

        const jobPromises = [];
        if (!statusFilter || statusFilter === 'completed') {
          jobPromises.push(queue.getCompleted(0, 100).catch(() => []));
        }
        if (!statusFilter || statusFilter === 'failed') {
          jobPromises.push(queue.getFailed(0, 100).catch(() => []));
        }
        if (!statusFilter || statusFilter === 'active') {
          jobPromises.push(queue.getActive(0, 100).catch(() => []));
        }
        if (!statusFilter || statusFilter === 'waiting') {
          jobPromises.push(queue.getWaiting(0, 100).catch(() => []));
        }
        if (!statusFilter || statusFilter === 'delayed') {
          jobPromises.push(queue.getDelayed(0, 100).catch(() => []));
        }

        const jobArrays = await Promise.all(jobPromises);
        const allJobs = jobArrays.flat().filter(job => job);

        const filteredJobs = allJobs
          .filter(job => !startTime || job.timestamp > startTime)
          .map(job => ({
            id: job.id,
            name: job.name,
            status: job.failedReason
              ? 'failed'
              : job.finishedOn
                ? 'completed'
                : job.processedOn
                  ? 'active'
                  : job.opts?.delay
                    ? 'delayed'
                    : 'waiting',
            data: job.data,
            result: job.returnvalue,
            error: job.failedReason,
            createdAt: new Date(job.timestamp).toISOString(),
            completedAt: job.finishedOn
              ? new Date(job.finishedOn).toISOString()
              : undefined,
            processedOn: job.processedOn
              ? new Date(job.processedOn).toISOString()
              : undefined,
            duration:
              job.finishedOn && job.processedOn
                ? job.finishedOn - job.processedOn
                : undefined,
            attempts: job.attemptsMade || 0,
            albumId: job.data?.albumId,
            albumName: job.data?.albumName || job.data?.title,
          }))
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

        const totalJobs = filteredJobs.length;
        const completedJobs = filteredJobs.filter(
          j => j.status === 'completed'
        ).length;
        const failedJobs = filteredJobs.filter(
          j => j.status === 'failed'
        ).length;
        const totalDuration = filteredJobs
          .filter(j => j.duration)
          .reduce((sum, j) => sum + (j.duration || 0), 0);
        const avgDuration =
          completedJobs > 0 ? totalDuration / completedJobs : 0;

        const todayStart = new Date().setHours(0, 0, 0, 0);
        const weekStart = new Date().setDate(new Date().getDate() - 7);
        const jobsToday = filteredJobs.filter(
          j => new Date(j.createdAt).getTime() > todayStart
        ).length;
        const jobsThisWeek = filteredJobs.filter(
          j => new Date(j.createdAt).getTime() > weekStart
        ).length;

        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = startIndex + limitNum;
        const paginatedJobs = filteredJobs.slice(startIndex, endIndex);

        res.json({
          jobs: paginatedJobs,
          stats: {
            totalJobs,
            completedJobs,
            failedJobs,
            avgDuration,
            successRate: totalJobs > 0 ? completedJobs / totalJobs : 0,
            jobsToday,
            jobsThisWeek,
            trendsUp: true,
          },
          page: pageNum,
          totalPages: Math.ceil(totalJobs / limitNum),
          totalItems: totalJobs,
        });
      } catch (error) {
        console.error('Job history error:', error);
        res.status(500).json({
          error: 'Failed to fetch job history',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    app.post('/jobs/:jobId/retry', async (req, res) => {
      try {
        const { jobId } = req.params;
        const queue = getMusicBrainzQueue().getQueue();

        const job = await queue.getJob(jobId);
        if (!job) {
          return res.status(404).json({ error: 'Job not found' });
        }

        await job.retry();
        res.json({ success: true, message: `Job ${jobId} queued for retry` });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to retry job',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // ─── Catch-all ─────────────────────────────────────────────────

    app.get('/', (_req, res) => {
      res.redirect('/admin/queues');
    });

    app.use((req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Path '${req.originalUrl}' not found`,
        availablePaths: [
          '/admin/queues - Bull Board Dashboard',
          '/dashboard - Dashboard Overview',
          '/health - System Health Check',
          '/metrics - System Metrics',
          '/queue/metrics - Queue Metrics',
          '/jobs/history - Job History with Stats',
          '/alerts - Active & Historical Alerts',
          '/spotify/metrics - Spotify Metrics',
          'POST /queue/pause - Pause Queue',
          'POST /queue/resume - Resume Queue',
          'POST /queue/cleanup - Cleanup Old Jobs',
          'POST /jobs/:id/retry - Retry Failed Job',
          'POST /alerts/:id/acknowledge - Acknowledge Alert',
          'POST /alerts/:id/resolve - Resolve Alert',
          'POST /spotify/start - Start Spotify Scheduler',
          'POST /spotify/stop - Stop Spotify Scheduler',
          'POST /spotify/sync - Trigger Spotify Sync',
          '/musicbrainz/metrics - MusicBrainz Metrics',
          'POST /musicbrainz/start - Start MusicBrainz Scheduler',
          'POST /musicbrainz/stop - Stop MusicBrainz Scheduler',
          'POST /musicbrainz/sync - Trigger MusicBrainz Sync',
        ],
      });
    });

    // Error handler
    app.use(
      (
        error: any,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction
      ) => {
        console.error('💥 Express error:', error);
        res.status(500).json({
          error: 'Internal Server Error',
          message: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    );

    // Start metrics collection
    metricsCollector.startCollecting(10000);

    // Listen
    this.server = app.listen(HTTP_PORT, () => {
      console.log(`📊 Bull Board: http://localhost:${HTTP_PORT}/admin/queues`);
      console.log(`📈 Metrics API: http://localhost:${HTTP_PORT}/metrics`);
      console.log(`🏥 Health Check: http://localhost:${HTTP_PORT}/health`);
    });

    this.server.on('error', (err: Error) => {
      console.error('❌ HTTP server error:', err.message);
    });
  }

  private async handleWorkerCrash(error: Error) {
    // Prevent concurrent crash recovery — multiple error events fire during Redis storms
    if (this.isRestarting) {
      return;
    }
    this.isRestarting = true;

    try {
      this.restartAttempts++;

      if (this.restartAttempts > this.maxRestartAttempts) {
        console.error(
          `💀 Worker failed ${this.maxRestartAttempts} times. Giving up.`
        );
        process.exit(1);
      }

      console.warn(
        `🔄 Restarting worker (attempt ${this.restartAttempts}/${this.maxRestartAttempts})...`
      );

      // Clean up current worker — destroyWorker handles close + null internally
      const queue = getMusicBrainzQueue();
      await queue.destroyWorker();
      this.worker = null;

      // Wait before restart
      await new Promise(resolve => setTimeout(resolve, this.restartDelay));

      // Recreate worker
      await this.createWorker();
    } finally {
      this.isRestarting = false;
    }
  }

  private setupGracefulShutdown() {
    const shutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
      this.isShuttingDown = true;

      try {
        // Stop metrics collection
        metricsCollector.stopCollecting();

        // Close HTTP server
        if (this.server) {
          console.log('🛑 Closing HTTP server...');
          this.server.close();
        }

        // Stop Spotify scheduler
        console.log('🛑 Stopping Spotify scheduler...');
        shutdownSpotifyScheduler();

        // Stop MusicBrainz scheduler
        console.log('🛑 Stopping MusicBrainz scheduler...');
        shutdownMusicBrainzScheduler();

        if (this.worker) {
          console.log('⏳ Waiting for current jobs to complete...');
          await this.worker.close();
          console.log('✅ Worker stopped gracefully');
        }
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
      }

      console.log('👋 Queue Worker shutdown complete');
      process.exit(0);
    };

    // Handle various shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2')); // nodemon restart

    // Handle uncaught exceptions
    process.on('uncaughtException', error => {
      console.error('💥 Uncaught Exception:', error);
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      shutdown('unhandledRejection');
    });
  }

  private keepAlive() {
    // Health check interval
    setInterval(() => {
      if (!this.isShuttingDown && this.worker) {
        // Optional: Add health checks here
      }
    }, 30000); // Every 30 seconds

    // Keep the process alive
    const keepAlive = () => {
      if (!this.isShuttingDown) {
        setTimeout(keepAlive, 1000);
      }
    };
    keepAlive();
  }
}

// Auto-start if this file is run directly
if (require.main === module) {
  const worker = new MusicBrainzWorkerService();
  worker.start().catch(error => {
    console.error('❌ Failed to start Queue Worker:', error);
    process.exit(1);
  });
}

export { MusicBrainzWorkerService };
