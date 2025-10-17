// src/lib/monitoring/health-check.ts
import { getMusicBrainzQueue } from '@/lib/queue';
import { redis } from '@/lib/queue/redis';
import { spotifyMetrics } from '@/lib/spotify/error-handling';
import { spotifyScheduler } from '@/lib/spotify/scheduler';

import { metricsCollector } from './metrics-collector';

export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
}

export interface ComponentHealth {
  status: HealthStatus;
  message: string;
  details?: Record<string, any>;
  lastCheck: Date;
}

export interface SystemHealth {
  status: HealthStatus;
  timestamp: Date;
  uptime: number;
  components: {
    queue: ComponentHealth;
    redis: ComponentHealth;
    worker: ComponentHealth;
    spotify: ComponentHealth;
    memory: ComponentHealth;
  };
  metrics: {
    queueDepth: number;
    activeJobs: number;
    failedJobs: number;
    completedJobs: number;
    errorRate: number;
    avgProcessingTime: number;
  };
  alerts: string[];
}

export class HealthChecker {
  private static instance: HealthChecker | null = null;

  private constructor() {}

  static getInstance(): HealthChecker {
    if (!HealthChecker.instance) {
      HealthChecker.instance = new HealthChecker();
    }
    return HealthChecker.instance;
  }

  /**
   * Perform comprehensive health check
   */
  async checkHealth(): Promise<SystemHealth> {
    const checks = await Promise.allSettled([
      this.checkQueue(),
      this.checkRedis(),
      this.checkWorker(),
      this.checkSpotify(),
      this.checkMemory(),
    ]);

    const [
      queueHealth,
      redisHealth,
      workerHealth,
      spotifyHealth,
      memoryHealth,
    ] = checks.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        const componentNames = [
          'queue',
          'redis',
          'worker',
          'spotify',
          'memory',
        ];
        return {
          status: HealthStatus.UNHEALTHY,
          message: `Failed to check ${componentNames[index]}: ${result.reason}`,
          lastCheck: new Date(),
        };
      }
    }) as ComponentHealth[];

    // Get current metrics
    const currentMetrics = metricsCollector.getCurrentMetrics();
    const queue = getMusicBrainzQueue();
    const stats = await queue.getStats();

    // Calculate overall status
    const statuses = [
      queueHealth,
      redisHealth,
      workerHealth,
      spotifyHealth,
      memoryHealth,
    ].map(c => c.status);
    let overallStatus: HealthStatus;

    if (statuses.every(s => s === HealthStatus.HEALTHY)) {
      overallStatus = HealthStatus.HEALTHY;
    } else if (statuses.some(s => s === HealthStatus.UNHEALTHY)) {
      overallStatus = HealthStatus.UNHEALTHY;
    } else {
      overallStatus = HealthStatus.DEGRADED;
    }

    // Collect active alerts
    const alerts: string[] = [];
    if (stats.waiting > 1000) {
      alerts.push(`High queue depth: ${stats.waiting} jobs waiting`);
    }
    if (stats.failed > 50) {
      alerts.push(`High failure count: ${stats.failed} failed jobs`);
    }
    if (currentMetrics && currentMetrics.queue.errorRate > 10) {
      alerts.push(
        `High error rate: ${currentMetrics.queue.errorRate.toFixed(2)}%`
      );
    }

    return {
      status: overallStatus,
      timestamp: new Date(),
      uptime: process.uptime(),
      components: {
        queue: queueHealth,
        redis: redisHealth,
        worker: workerHealth,
        spotify: spotifyHealth,
        memory: memoryHealth,
      },
      metrics: {
        queueDepth: stats.waiting + stats.active + stats.delayed,
        activeJobs: stats.active,
        failedJobs: stats.failed,
        completedJobs: stats.completed,
        errorRate: currentMetrics?.queue.errorRate || 0,
        avgProcessingTime:
          currentMetrics?.queue.throughput.avgProcessingTime || 0,
      },
      alerts,
    };
  }

  /**
   * Check queue health
   */
  private async checkQueue(): Promise<ComponentHealth> {
    try {
      const queue = getMusicBrainzQueue();
      const stats = await queue.getStats();
      const isPaused = await queue.getQueue().isPaused();

      const queueDepth = stats.waiting + stats.active + stats.delayed;

      let status: HealthStatus;
      let message: string;

      if (isPaused) {
        status = HealthStatus.DEGRADED;
        message = 'Queue is paused';
      } else if (queueDepth > 1000) {
        status = HealthStatus.DEGRADED;
        message = `High queue depth: ${queueDepth}`;
      } else if (stats.failed > 100) {
        status = HealthStatus.DEGRADED;
        message = `High failure count: ${stats.failed}`;
      } else {
        status = HealthStatus.HEALTHY;
        message = 'Queue is healthy';
      }

      return {
        status,
        message,
        details: {
          ...stats,
          isPaused,
          depth: queueDepth,
        },
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        status: HealthStatus.UNHEALTHY,
        message: `Queue check failed: ${error}`,
        lastCheck: new Date(),
      };
    }
  }

  /**
   * Check Redis health
   */
  private async checkRedis(): Promise<ComponentHealth> {
    try {
      const redisClient = redis;
      if (!redisClient) {
        return {
          status: HealthStatus.UNHEALTHY,
          message: 'Redis client not initialized',
          lastCheck: new Date(),
        };
      }

      // Ping Redis
      const ping = await redisClient.ping();
      if (ping !== 'PONG') {
        return {
          status: HealthStatus.UNHEALTHY,
          message: 'Redis ping failed',
          lastCheck: new Date(),
        };
      }

      // Get Redis info
      const info = await redisClient.info('stats');
      const memInfo = await redisClient.info('memory');

      // Parse memory usage
      const memoryMatch = memInfo.match(/used_memory:(\d+)/);
      const memoryBytes = memoryMatch ? parseInt(memoryMatch[1], 10) : 0;
      const memoryMB = memoryBytes / 1024 / 1024;

      let status: HealthStatus;
      let message: string;

      if (memoryMB > 512) {
        status = HealthStatus.DEGRADED;
        message = `High Redis memory usage: ${memoryMB.toFixed(2)}MB`;
      } else {
        status = HealthStatus.HEALTHY;
        message = 'Redis is healthy';
      }

      return {
        status,
        message,
        details: {
          memoryMB: memoryMB.toFixed(2),
          connected: true,
        },
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        status: HealthStatus.UNHEALTHY,
        message: `Redis check failed: ${error}`,
        lastCheck: new Date(),
      };
    }
  }

  /**
   * Check worker health
   */
  private async checkWorker(): Promise<ComponentHealth> {
    try {
      const queue = getMusicBrainzQueue();

      // Check for active workers by looking at BullMQ worker metadata in Redis
      const workers = await queue.getQueue().getWorkers();
      const hasActiveWorkers = workers && workers.length > 0;

      // Check if queue is paused
      const isPaused = await queue.getQueue().isPaused();

      let status: HealthStatus;
      let message: string;

      if (!hasActiveWorkers) {
        status = HealthStatus.DEGRADED;
        message = 'No active workers detected';
      } else if (isPaused) {
        status = HealthStatus.DEGRADED;
        message = 'Worker is paused';
      } else {
        status = HealthStatus.HEALTHY;
        message = `${workers.length} worker(s) active`;
      }

      return {
        status,
        message,
        details: {
          workerCount: workers?.length || 0,
          isPaused,
        },
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        status: HealthStatus.UNHEALTHY,
        message: `Worker check failed: ${error}`,
        lastCheck: new Date(),
      };
    }
  }

  /**
   * Check Spotify integration health
   */
  private async checkSpotify(): Promise<ComponentHealth> {
    try {
      const metrics = spotifyMetrics.getMetrics();
      const successRate = spotifyMetrics.getSuccessRate();

      // Check for recent scheduled Spotify jobs in the queue to detect if scheduler is running
      const queue = getMusicBrainzQueue();
      const jobs = await queue
        .getQueue()
        .getJobs(['completed', 'active', 'waiting'], 0, 10);
      const recentScheduledJobs = jobs.filter(
        job =>
          (job.name === 'spotify-sync-new-releases' ||
            job.name === 'spotify-sync-featured-playlists') &&
          (job.data as any)?.source === 'scheduled' &&
          job.timestamp > Date.now() - 3600000 // Within last hour
      );
      const schedulerRunning = recentScheduledJobs.length > 0;

      let status: HealthStatus;
      let message: string;

      if (!schedulerRunning) {
        status = HealthStatus.DEGRADED;
        message = 'Spotify scheduler not running (no recent scheduled jobs)';
      } else if (successRate < 80) {
        status = HealthStatus.DEGRADED;
        message = `Low Spotify API success rate: ${successRate.toFixed(2)}%`;
      } else if ((metrics as any).errors?.total > 100) {
        status = HealthStatus.DEGRADED;
        message = `High Spotify error count: ${(metrics as any).errors?.total}`;
      } else {
        status = HealthStatus.HEALTHY;
        message = 'Spotify integration healthy';
      }

      return {
        status,
        message,
        details: {
          ...metrics,
          successRate,
          schedulerRunning,
          recentScheduledJobs: recentScheduledJobs.length,
        },
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        status: HealthStatus.DEGRADED,
        message: 'Spotify integration not available',
        lastCheck: new Date(),
      };
    }
  }

  /**
   * Check memory health
   */
  private async checkMemory(): Promise<ComponentHealth> {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    const heapPercent = (heapUsedMB / heapTotalMB) * 100;

    let status: HealthStatus;
    let message: string;

    if (heapUsedMB > 800) {
      status = HealthStatus.UNHEALTHY;
      message = `Critical memory usage: ${heapUsedMB.toFixed(2)}MB`;
    } else if (heapUsedMB > 600) {
      status = HealthStatus.DEGRADED;
      message = `High memory usage: ${heapUsedMB.toFixed(2)}MB`;
    } else {
      status = HealthStatus.HEALTHY;
      message = 'Memory usage normal';
    }

    return {
      status,
      message,
      details: {
        heapUsedMB: heapUsedMB.toFixed(2),
        heapTotalMB: heapTotalMB.toFixed(2),
        heapPercent: heapPercent.toFixed(2),
        rss: (memUsage.rss / 1024 / 1024).toFixed(2),
      },
      lastCheck: new Date(),
    };
  }
}

export const healthChecker = HealthChecker.getInstance();
