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
import { healthChecker, metricsCollector, alertManager } from '@/lib/monitoring';

const PORT = 3001;

// Create Express app with minimal configuration
const app = express();
app.disable('x-powered-by');
app.set('env', 'production');

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

// Mount Bull Board
app.use('/admin/queues', serverAdapter.getRouter());

// Basic health check endpoint
app.get('/health', async (_req, res) => {
  try {
    const health = await healthChecker.checkHealth();
    const statusCode = health.status === 'unhealthy' ? 503 :
                       health.status === 'degraded' ? 200 : 200;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
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
    timestamp: new Date().toISOString()
  });
});

// Alert management endpoints
app.get('/alerts', (_req, res) => {
  const active = alertManager.getActiveAlerts();
  const history = alertManager.getAlertHistory(50);

  res.json({
    active,
    history,
    timestamp: new Date().toISOString()
  });
});

app.post('/alerts/:alertId/acknowledge', (req, res) => {
  const { alertId } = req.params;
  const success = alertManager.acknowledgeAlert(alertId);

  res.json({
    success,
    message: success ? 'Alert acknowledged' : 'Alert not found or already acknowledged'
  });
});

app.post('/alerts/:alertId/resolve', (req, res) => {
  const { alertId } = req.params;
  const success = alertManager.resolveAlert(alertId);

  res.json({
    success,
    message: success ? 'Alert resolved' : 'Alert not found or already resolved'
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
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get queue metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
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
      message: error instanceof Error ? error.message : 'Unknown error'
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
      message: error instanceof Error ? error.message : 'Unknown error'
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
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Spotify metrics endpoint
app.get('/spotify/metrics', async (req, res) => {
  try {
    const { spotifyMetrics } = await import('@/lib/spotify/error-handling');
    const { spotifyScheduler } = await import('@/lib/spotify/scheduler');
    
    const metrics = spotifyMetrics.getMetrics();
    const status = spotifyScheduler.getStatus();
    
    res.json({
      scheduler: {
        isRunning: status.isRunning,
        activeJobs: status.activeJobs,
        config: status.config
      },
      metrics: {
        ...metrics,
        successRate: spotifyMetrics.getSuccessRate()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get Spotify metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
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
        const { initializeSpotifyScheduler } = await import('@/lib/spotify/scheduler');
        const started = initializeSpotifyScheduler();
        res.json({ success: started, message: started ? 'Scheduler started' : 'Failed to start (check credentials)' });
        break;
        
      case 'stop':
        spotifyScheduler.stop();
        res.json({ success: true, message: 'Scheduler stopped' });
        break;
        
      case 'sync':
        if (!type || !['new-releases', 'featured-playlists', 'both'].includes(type)) {
          return res.status(400).json({ error: 'Invalid sync type. Use: new-releases, featured-playlists, or both' });
        }
        await spotifyScheduler.triggerSync(type);
        res.json({ success: true, message: `${type} sync triggered` });
        break;
        
      default:
        res.status(400).json({ error: 'Invalid action. Use: start, stop, or sync' });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Spotify action failed',
      message: error instanceof Error ? error.message : 'Unknown error'
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
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get dashboard data',
      message: error instanceof Error ? error.message : 'Unknown error'
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
      '/alerts - Active & Historical Alerts',
      '/spotify/metrics - Spotify Metrics',
      'POST /queue/pause - Pause Queue',
      'POST /queue/resume - Resume Queue',
      'POST /queue/cleanup - Cleanup Old Jobs',
      'POST /alerts/:id/acknowledge - Acknowledge Alert',
      'POST /alerts/:id/resolve - Resolve Alert',
      'POST /spotify/start - Start Spotify Scheduler',
      'POST /spotify/stop - Stop Spotify Scheduler',
      'POST /spotify/sync - Trigger Spotify Sync'
    ]
  });
});

// Error handler
app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('💥 Express error:', error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

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
server.on('error', (err) => {
  console.error('❌ Server error:', err.message);
});

// Prevent the process from exiting
process.stdin.resume();
