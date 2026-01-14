// src/scripts/bull-board-server.ts
/**
 * Bull Board Express Server - Silent Mode
 * Minimal logging, clean terminal output
 */

import express from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

import { getMusicBrainzQueue } from '@/lib/queue';
import {
  healthChecker,
  metricsCollector,
  alertManager,
} from '@/lib/monitoring';

const PORT = 3001;

// Create Express app with minimal configuration
const app = express();
app.disable('x-powered-by');
app.set('env', 'production');

// Add CORS middleware to allow requests from localhost:3000
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Initialize queue and Bull Board
let musicBrainzQueue: any;

try {
  musicBrainzQueue = getMusicBrainzQueue();
} catch (error) {
  console.error('❌ Failed to initialize MusicBrainz queue:', error);
  process.exit(1);
}

// Set up Bull Board (silent mode)
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

try {
  createBullBoard({
    queues: [new BullMQAdapter(musicBrainzQueue.getQueue())],
    serverAdapter: serverAdapter,
  });
} catch (error) {
  console.error('❌ Failed to configure Bull Board:', error);
  process.exit(1);
}

// Minimal Express setup - no logging middleware
app.use(express.json()); // Add JSON body parser for POST endpoints

// Mount Bull Board
app.use('/admin/queues', serverAdapter.getRouter());

// Basic health check endpoint
app.get('/health', async (_req, res) => {
  try {
    const health = await healthChecker.checkHealth();
    const statusCode =
      health.status === 'unhealthy'
        ? 503
        : health.status === 'degraded'
          ? 200
          : 200;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

// Detailed metrics endpoint
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

// Alert management endpoints
app.get('/alerts', (_req, res) => {
  const active = alertManager.getActiveAlerts();
  const history = alertManager.getAlertHistory(50);

  res.json({
    active,
    history,
    timestamp: new Date().toISOString(),
  });
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
    message: success ? 'Alert resolved' : 'Alert not found or already resolved',
  });
});

// Queue metrics endpoint
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

// Live queue snapshot endpoint - waiting + active jobs
app.get('/queue/snapshot', async (_req, res) => {
  try {
    const queue = getMusicBrainzQueue().getQueue();
    const stats = await getMusicBrainzQueue().getStats();
    const isPaused = await queue.isPaused();

    // Get live jobs
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

// Queue control endpoints
app.post('/queue/pause', async (_req, res) => {
  try {
    const queue = getMusicBrainzQueue();
    await queue.pause();
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
    const queue = getMusicBrainzQueue();
    await queue.resume();
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
    const { olderThan = 86400000 } = req.body; // Default 24 hours
    const queue = getMusicBrainzQueue();
    await queue.cleanup(olderThan);
    res.json({ success: true, message: 'Queue cleaned up' });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to cleanup queue',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Spotify metrics endpoint
app.get('/spotify/metrics', async (req, res) => {
  try {
    const { spotifyMetrics } = await import('@/lib/spotify/error-handling');
    const { spotifyScheduler } = await import('@/lib/spotify/scheduler');

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

// Spotify control endpoint
app.post('/spotify/:action', async (req, res) => {
  const { action } = req.params;
  const { type } = req.body;

  try {
    const { spotifyScheduler } = await import('@/lib/spotify/scheduler');

    switch (action) {
      case 'start':
        const { initializeSpotifyScheduler } = await import(
          '@/lib/spotify/scheduler'
        );
        const started = await initializeSpotifyScheduler();
        res.json({
          success: started,
          message: started
            ? 'Scheduler started'
            : 'Failed to start (check credentials)',
        });
        break;

      case 'stop':
        spotifyScheduler.stop();
        res.json({ success: true, message: 'Scheduler stopped' });
        break;

      case 'sync':
        await spotifyScheduler.triggerSync();
        res.json({ success: true, message: 'New releases sync triggered' });
        break;

      default:
        res
          .status(400)
          .json({ error: 'Invalid action. Use: start, stop, or sync' });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Spotify action failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Job history endpoint
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

    // Fetch jobs based on status filter
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

    // Filter by time and format jobs
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

    // Calculate stats
    const totalJobs = filteredJobs.length;
    const completedJobs = filteredJobs.filter(
      j => j.status === 'completed'
    ).length;
    const failedJobs = filteredJobs.filter(j => j.status === 'failed').length;
    const totalDuration = filteredJobs
      .filter(j => j.duration)
      .reduce((sum, j) => sum + (j.duration || 0), 0);
    const avgDuration = completedJobs > 0 ? totalDuration / completedJobs : 0;

    // Calculate jobs today and this week
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const weekStart = new Date().setDate(new Date().getDate() - 7);
    const jobsToday = filteredJobs.filter(
      j => new Date(j.createdAt).getTime() > todayStart
    ).length;
    const jobsThisWeek = filteredJobs.filter(
      j => new Date(j.createdAt).getTime() > weekStart
    ).length;

    // Pagination
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
        trendsUp: true, // Would need historical data to calculate properly
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

// Retry job endpoint
app.post('/jobs/:jobId/retry', async (req, res) => {
  try {
    const { jobId } = req.params;
    const queue = getMusicBrainzQueue().getQueue();

    // Find the job
    const job = await queue.getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Retry the job
    await job.retry();

    res.json({
      success: true,
      message: `Job ${jobId} queued for retry`,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retry job',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Dashboard overview endpoint
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

// Root redirect
app.get('/', (_req, res) => {
  res.redirect('/admin/queues');
});

// 404 handler
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

// Graceful shutdown
process.on('SIGTERM', () => {
  metricsCollector.stopCollecting();
  server.close(() => {
    if (musicBrainzQueue && typeof musicBrainzQueue.shutdown === 'function') {
      musicBrainzQueue.shutdown();
    }
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  server.close(() => {
    if (musicBrainzQueue && typeof musicBrainzQueue.shutdown === 'function') {
      musicBrainzQueue.shutdown();
    }
    process.exit(0);
  });
});

// Start metrics collection
metricsCollector.startCollecting(10000); // Collect every 10 seconds

// Start server and keep process alive
const server = app.listen(PORT, () => {
  console.log(`📊 Bull Board: http://localhost:${PORT}/admin/queues`);
  console.log(`📈 Metrics API: http://localhost:${PORT}/metrics`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log(`🚨 Alerts: http://localhost:${PORT}/alerts`);
  console.log(`📊 Dashboard Overview: http://localhost:${PORT}/dashboard`);
});

// Keep the process alive
server.on('error', err => {
  console.error('❌ Server error:', err.message);
});

// Prevent the process from exiting
process.stdin.resume();
