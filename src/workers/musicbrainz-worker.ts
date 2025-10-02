/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Worker class has type issues, needs refactor
// src/workers/musicbrainz-worker.ts
/**
 * Production MusicBrainz Worker - Always Running
 * Handles all MusicBrainz API calls with rate limiting
 * Auto-restarts on failures, production-ready
 */

import { PrismaClient } from '@prisma/client';

import { getMusicBrainzQueue } from '@/lib/queue';
import { processMusicBrainzJob } from '@/lib/queue/musicbrainz-processor';
import { startQueueActivityMonitor } from '@/lib/activity/queue-activity-monitor';

class MusicBrainzWorkerService {
  private worker: any;
  private isShuttingDown = false;
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
        const query = (job.data as any).query || job.name;
        console.log(`🔄 ${query} (#${job.id})`);
      });

      this.worker.on('completed', (job: any, result: any) => {
        const query = (job.data as any).query || job.name;
        const duration = Date.now() - job.processedOn;
        console.log(`✅ ${query} (${duration}ms)`);
      });

      this.worker.on('failed', (job: any, err: Error) => {
        const query = (job.data as any).query || job?.name;
        console.error(`❌ ${query} - ${err.message}`);
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

  private async handleWorkerCrash(error: Error) {
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

    // Clean up current worker
    try {
      await this.worker?.close();
    } catch (closeError) {
      console.warn('Warning: Error closing failed worker:', closeError);
    }

    // Wait before restart
    await new Promise(resolve => setTimeout(resolve, this.restartDelay));

    // Recreate worker
    await this.createWorker();
  }

  private setupGracefulShutdown() {
    const shutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
      this.isShuttingDown = true;

      try {
        if (this.worker) {
          console.log('⏳ Waiting for current jobs to complete...');
          await this.worker.close();
          console.log('✅ Worker stopped gracefully');
        }
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
      }

      console.log('👋 MusicBrainz Worker shutdown complete');
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
        // console.log('💓 Worker health check: OK');
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
    console.error('❌ Failed to start MusicBrainz Worker:', error);
    process.exit(1);
  });
}

export { MusicBrainzWorkerService };
