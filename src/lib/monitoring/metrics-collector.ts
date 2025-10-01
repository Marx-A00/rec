// src/lib/monitoring/metrics-collector.ts
import { EventEmitter } from 'events';

import { getMusicBrainzQueue } from '@/lib/queue';
import type { QueueStats, JobType } from '@/lib/queue/jobs';
import { redis } from '@/lib/queue/redis';

export interface SystemMetrics {
  timestamp: Date;
  queue: {
    depth: number;
    stats: QueueStats;
    throughput: {
      jobsPerMinute: number;
      jobsPerHour: number;
      avgProcessingTime: number;
    };
    errorRate: number;
    successRate: number;
  };
  system: {
    memory: NodeJS.MemoryUsage;
    uptime: number;
    cpuUsage: NodeJS.CpuUsage;
  };
  redis: {
    connected: boolean;
    memoryUsage?: number;
    connectedClients?: number;
    commandsPerSecond?: number;
  };
  api: {
    rateLimits: {
      musicbrainz: {
        remaining: number;
        reset: Date;
        limit: number;
      };
      spotify?: {
        remaining: number;
        reset: Date;
        limit: number;
      };
    };
  };
}

export interface JobMetrics {
  jobId: string;
  type: JobType;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  success: boolean;
  error?: string;
  retries: number;
}

export interface AlertThresholds {
  queueDepth: number; // Alert if queue > this value
  errorRatePercent: number; // Alert if error rate > this %
  avgProcessingTimeMs: number; // Alert if avg processing > this ms
  memoryUsageMB: number; // Alert if memory > this MB
}

export class MetricsCollector extends EventEmitter {
  private static instance: MetricsCollector | null = null;
  private metricsHistory: SystemMetrics[] = [];
  private jobMetrics: Map<string, JobMetrics> = new Map();
  private collectionInterval?: NodeJS.Timeout;
  private readonly maxHistorySize = 200; // Reduced from 1000 to save memory
  private readonly thresholds: AlertThresholds;

  private constructor() {
    super();
    this.thresholds = {
      queueDepth: 1000,
      errorRatePercent: 10,
      avgProcessingTimeMs: 30000, // 30 seconds
      memoryUsageMB: 600, // Optimal for medium complexity apps
    };
  }

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  /**
   * Start collecting metrics at regular intervals
   */
  startCollecting(intervalMs: number = 10000): void {
    if (this.collectionInterval) {
      console.warn('⚠️ Metrics collection already running');
      return;
    }

    console.log(`📊 Starting metrics collection (interval: ${intervalMs}ms)`);

    // Collect immediately
    this.collectMetrics();

    // Then collect at intervals
    this.collectionInterval = setInterval(() => {
      this.collectMetrics();
    }, intervalMs);
  }

  /**
   * Stop collecting metrics
   */
  stopCollecting(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = undefined;
      console.log('📊 Stopped metrics collection');
    }
  }

  /**
   * Collect current system metrics
   */
  private async collectMetrics(): Promise<SystemMetrics> {
    try {
      const queue = getMusicBrainzQueue();
      const stats = await queue.getStats();

      // Calculate throughput metrics
      const recentJobs = Array.from(this.jobMetrics.values()).filter(
        j => j.endTime && j.endTime.getTime() > Date.now() - 3600000
      ); // Last hour

      const jobsPerHour = recentJobs.length;
      const jobsPerMinute = recentJobs.filter(
        j => j.endTime && j.endTime.getTime() > Date.now() - 60000
      ).length;

      const avgProcessingTime =
        recentJobs.length > 0
          ? recentJobs.reduce((sum, j) => sum + (j.duration || 0), 0) /
            recentJobs.length
          : 0;

      // Calculate success/error rates
      const successCount = recentJobs.filter(j => j.success).length;
      const errorCount = recentJobs.filter(j => !j.success).length;
      const totalCount = successCount + errorCount;

      const successRate =
        totalCount > 0 ? (successCount / totalCount) * 100 : 100;
      const errorRate = totalCount > 0 ? (errorCount / totalCount) * 100 : 0;

      // Get Redis metrics
      const redisMetrics = await this.getRedisMetrics();

      // Build metrics object
      const metrics: SystemMetrics = {
        timestamp: new Date(),
        queue: {
          depth: stats.waiting + stats.active + stats.delayed,
          stats,
          throughput: {
            jobsPerMinute,
            jobsPerHour,
            avgProcessingTime,
          },
          errorRate,
          successRate,
        },
        system: {
          memory: process.memoryUsage(),
          uptime: process.uptime(),
          cpuUsage: process.cpuUsage(),
        },
        redis: redisMetrics,
        api: {
          rateLimits: {
            musicbrainz: {
              remaining: 1 - stats.active, // Since we allow 1 req/sec
              reset: new Date(Date.now() + 1000),
              limit: 1,
            },
          },
        },
      };

      // Store metrics
      this.metricsHistory.push(metrics);
      if (this.metricsHistory.length > this.maxHistorySize) {
        this.metricsHistory.shift();
      }

      // Check for alerts
      this.checkAlerts(metrics);

      // Emit metrics event
      this.emit('metrics', metrics);

      return metrics;
    } catch (error) {
      console.error('❌ Failed to collect metrics:', error);
      throw error;
    }
  }

  /**
   * Get Redis connection metrics
   */
  private async getRedisMetrics(): Promise<SystemMetrics['redis']> {
    try {
      const redisClient = redis;
      if (!redisClient) {
        return { connected: false };
      }

      const info = await redisClient.info('stats');
      const memInfo = await redisClient.info('memory');

      // Parse Redis INFO output
      const parseInfo = (info: string, key: string): number | undefined => {
        const match = info.match(new RegExp(`${key}:(\\d+)`));
        return match ? parseInt(match[1], 10) : undefined;
      };

      return {
        connected: true,
        memoryUsage: parseInfo(memInfo, 'used_memory') || undefined,
        connectedClients: parseInfo(info, 'connected_clients') || undefined,
        commandsPerSecond:
          parseInfo(info, 'instantaneous_ops_per_sec') || undefined,
      };
    } catch (error) {
      console.error('❌ Failed to get Redis metrics:', error);
      return { connected: false };
    }
  }

  /**
   * Check metrics against thresholds and emit alerts
   */
  private checkAlerts(metrics: SystemMetrics): void {
    const alerts: string[] = [];

    // Check queue depth
    if (metrics.queue.depth > this.thresholds.queueDepth) {
      alerts.push(
        `Queue depth (${metrics.queue.depth}) exceeds threshold (${this.thresholds.queueDepth})`
      );
    }

    // Check error rate
    if (metrics.queue.errorRate > this.thresholds.errorRatePercent) {
      alerts.push(
        `Error rate (${metrics.queue.errorRate.toFixed(2)}%) exceeds threshold (${this.thresholds.errorRatePercent}%)`
      );
    }

    // Check processing time
    if (
      metrics.queue.throughput.avgProcessingTime >
      this.thresholds.avgProcessingTimeMs
    ) {
      alerts.push(
        `Avg processing time (${metrics.queue.throughput.avgProcessingTime}ms) exceeds threshold (${this.thresholds.avgProcessingTimeMs}ms)`
      );
    }

    // Check memory usage
    const memoryMB = metrics.system.memory.heapUsed / 1024 / 1024;
    if (memoryMB > this.thresholds.memoryUsageMB) {
      alerts.push(
        `Memory usage (${memoryMB.toFixed(2)}MB) exceeds threshold (${this.thresholds.memoryUsageMB}MB)`
      );
    }

    // Emit alerts if any
    if (alerts.length > 0) {
      this.emit('alert', {
        timestamp: new Date(),
        alerts,
        metrics,
      });
      console.warn('⚠️ System alerts:', alerts);
    }
  }

  /**
   * Record job metrics
   */
  recordJobStart(jobId: string, type: JobType): void {
    this.jobMetrics.set(jobId, {
      jobId,
      type,
      startTime: new Date(),
      success: false,
      retries: 0,
    });
  }

  /**
   * Record job completion
   */
  recordJobComplete(jobId: string, success: boolean, error?: string): void {
    const job = this.jobMetrics.get(jobId);
    if (job) {
      const endTime = new Date();
      job.endTime = endTime;
      job.duration = endTime.getTime() - job.startTime.getTime();
      job.success = success;
      job.error = error;

      // Emit job complete event
      this.emit('job:complete', job);
    }
  }

  /**
   * Record job retry
   */
  recordJobRetry(jobId: string): void {
    const job = this.jobMetrics.get(jobId);
    if (job) {
      job.retries++;
    }
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): SystemMetrics | undefined {
    return this.metricsHistory[this.metricsHistory.length - 1];
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(limit: number = 100): SystemMetrics[] {
    return this.metricsHistory.slice(-limit);
  }

  /**
   * Get job metrics
   */
  getJobMetrics(limit: number = 100): JobMetrics[] {
    return Array.from(this.jobMetrics.values())
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit);
  }

  /**
   * Update alert thresholds
   */
  updateThresholds(thresholds: Partial<AlertThresholds>): void {
    Object.assign(this.thresholds, thresholds);
    console.log('📊 Updated alert thresholds:', this.thresholds);
  }

  /**
   * Get current thresholds
   */
  getThresholds(): AlertThresholds {
    return { ...this.thresholds };
  }

  /**
   * Clear metrics history
   */
  clearHistory(): void {
    this.metricsHistory = [];
    this.jobMetrics.clear();
    console.log('📊 Cleared metrics history');
  }
}

// Export singleton instance
export const metricsCollector = MetricsCollector.getInstance();
