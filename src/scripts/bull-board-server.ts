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
      '/health - Health Check'
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
