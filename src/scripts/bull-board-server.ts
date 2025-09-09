// src/scripts/bull-board-server.ts
/**
 * Bull Board Express Server
 * A dedicated Express server for monitoring BullMQ queues
 * Much cleaner than integrating with Next.js
 */

import express from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { getMusicBrainzQueue } from '@/lib/queue';

const PORT = 3001;
const app = express();

console.log('🚀 Starting Bull Board Dashboard...');

// Initialize the queue
let musicBrainzQueue: any;

try {
  musicBrainzQueue = getMusicBrainzQueue();
  console.log('✅ MusicBrainz queue initialized');
} catch (error) {
  console.error('❌ Failed to initialize MusicBrainz queue:', error);
  process.exit(1);
}

// Set up Bull Board
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

console.log('🔧 Setting up Bull Board...');

try {
  createBullBoard({
    queues: [new BullMQAdapter(musicBrainzQueue.getQueue())],
    serverAdapter: serverAdapter,
  });
  console.log('✅ Bull Board configured');
} catch (error) {
  console.error('❌ Failed to configure Bull Board:', error);
  process.exit(1);
}

// Add basic logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

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
  console.log('🔄 Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Express server closed');
    if (musicBrainzQueue && typeof musicBrainzQueue.shutdown === 'function') {
      musicBrainzQueue.shutdown();
    }
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🔄 Received SIGINT, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Express server closed');
    if (musicBrainzQueue && typeof musicBrainzQueue.shutdown === 'function') {
      musicBrainzQueue.shutdown();
    }
    process.exit(0);
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log('');
  console.log('🎯 ================================');
  console.log('🎉 Bull Board Dashboard Ready!');
  console.log('🎯 ================================');
  console.log('');
  console.log(`📊 Dashboard: http://localhost:${PORT}/admin/queues`);
  console.log(`💊 Health:    http://localhost:${PORT}/health`);
  console.log('');
  console.log('📈 Features:');
  console.log('  ✅ Real-time job monitoring');
  console.log('  ✅ Job retry & management');
  console.log('  ✅ Queue statistics');
  console.log('  ✅ Professional UI');
  console.log('  ✅ No rate limiting issues');
  console.log('');
  console.log('🛑 Press Ctrl+C to stop');
  console.log('');
});

export { app, server };
