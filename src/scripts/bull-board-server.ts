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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    queues: {
      musicbrainz: {
        connected: true,
        name: 'musicbrainz'
      }
    }
  });
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

// Root redirect
app.get('/', (req, res) => {
  res.redirect('/admin/queues');
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Path '${req.originalUrl}' not found`,
    availablePaths: [
      '/admin/queues - Bull Board Dashboard',
      '/health - Health Check',
      '/spotify/metrics - Spotify Metrics',
      'POST /spotify/start - Start Spotify Scheduler',
      'POST /spotify/stop - Stop Spotify Scheduler',
      'POST /spotify/sync - Trigger Spotify Sync'
    ]
  });
});

// Error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('💥 Express error:', error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
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

// Start server and keep process alive
const server = app.listen(PORT, () => {
  console.log(`📊 Dashboard: http://localhost:${PORT}/admin/queues`);
});

// Keep the process alive
server.on('error', (err) => {
  console.error('❌ Server error:', err.message);
});

// Prevent the process from exiting
process.stdin.resume();
