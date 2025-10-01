// src/lib/monitoring/websocket.ts
import { EventEmitter } from 'events';

import { getMusicBrainzQueue } from '@/lib/queue';

import { metricsCollector } from './metrics-collector';
import { healthChecker } from './health-check';
import { alertManager } from './alert-manager';
import type { SystemMetrics } from './metrics-collector';
import type { SystemHealth } from './health-check';
import type { Alert } from './alert-manager';

export interface WebSocketMessage {
  type: 'queue-status' | 'job-update' | 'health-update' | 'alert' | 'metrics';
  data: any;
  timestamp: Date;
}

export class MonitoringWebSocket extends EventEmitter {
  private static instance: MonitoringWebSocket | null = null;
  private subscriptions: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {
    super();
    this.setupEventListeners();
  }

  static getInstance(): MonitoringWebSocket {
    if (!MonitoringWebSocket.instance) {
      MonitoringWebSocket.instance = new MonitoringWebSocket();
    }
    return MonitoringWebSocket.instance;
  }

  /**
   * Setup event listeners for real-time updates
   */
  private setupEventListeners(): void {
    // Listen for alerts
    alertManager.on('alert', (alert: Alert) => {
      this.broadcast({
        type: 'alert',
        data: alert,
        timestamp: new Date(),
      });
    });

    // Listen for metrics updates
    metricsCollector.on('metrics', (metrics: SystemMetrics) => {
      this.broadcast({
        type: 'metrics',
        data: metrics,
        timestamp: new Date(),
      });
    });

    // Listen for job completions
    metricsCollector.on('job:complete', job => {
      this.broadcast({
        type: 'job-update',
        data: {
          jobId: job.jobId,
          type: job.type,
          status: job.success ? 'COMPLETED' : 'FAILED',
          duration: job.duration,
          error: job.error,
        },
        timestamp: new Date(),
      });
    });
  }

  /**
   * Start queue status subscription
   */
  subscribeToQueueStatus(intervalMs: number = 5000): void {
    if (this.subscriptions.has('queue-status')) {
      return;
    }

    const sendQueueStatus = async () => {
      try {
        const queue = getMusicBrainzQueue();
        const stats = await queue.getStats();
        const isPaused = await queue.getQueue().isPaused();

        this.broadcast({
          type: 'queue-status',
          data: {
            name: 'musicbrainz',
            isPaused,
            stats,
            rateLimitInfo: {
              maxRequestsPerSecond: 1,
              currentWindowRequests: stats.active,
              windowResetTime: new Date(Date.now() + 1000),
            },
          },
          timestamp: new Date(),
        });
      } catch (error) {
        console.error('Failed to get queue status:', error);
      }
    };

    // Send immediately
    sendQueueStatus();

    // Then send at intervals
    const interval = setInterval(sendQueueStatus, intervalMs);
    this.subscriptions.set('queue-status', interval);
  }

  /**
   * Start health status subscription
   */
  subscribeToHealthStatus(intervalMs: number = 10000): void {
    if (this.subscriptions.has('health-status')) {
      return;
    }

    const sendHealthStatus = async () => {
      try {
        const health = await healthChecker.checkHealth();

        this.broadcast({
          type: 'health-update',
          data: health,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error('Failed to get health status:', error);
      }
    };

    // Send immediately
    sendHealthStatus();

    // Then send at intervals
    const interval = setInterval(sendHealthStatus, intervalMs);
    this.subscriptions.set('health-status', interval);
  }

  /**
   * Start metrics subscription
   */
  subscribeToMetrics(intervalMs: number = 10000): void {
    if (this.subscriptions.has('metrics')) {
      return;
    }

    // Start metrics collection if not already running
    metricsCollector.startCollecting(intervalMs);

    // Metrics are automatically broadcast via event listener
    this.subscriptions.set(
      'metrics',
      setInterval(() => {}, intervalMs)
    ); // Placeholder
  }

  /**
   * Subscribe to job updates for a specific job
   */
  subscribeToJob(jobId: string, checkIntervalMs: number = 1000): void {
    const key = `job-${jobId}`;
    if (this.subscriptions.has(key)) {
      return;
    }

    const checkJob = async () => {
      try {
        const queue = getMusicBrainzQueue().getQueue();
        const job = await queue.getJob(jobId);

        if (!job) {
          this.unsubscribe(key);
          return;
        }

        const state = await job.getState();
        const progress = job.progress;

        this.broadcast({
          type: 'job-update',
          data: {
            jobId,
            type: job.name,
            status: state.toUpperCase(),
            progress: typeof progress === 'number' ? progress : 0,
            message:
              typeof progress === 'object' &&
              progress !== null &&
              'message' in progress
                ? (progress as any).message
                : undefined,
          },
          timestamp: new Date(),
        });

        // Stop checking if job is completed or failed
        if (state === 'completed' || state === 'failed') {
          this.unsubscribe(key);
        }
      } catch (error) {
        console.error(`Failed to check job ${jobId}:`, error);
      }
    };

    // Check immediately
    checkJob();

    // Then check at intervals
    const interval = setInterval(checkJob, checkIntervalMs);
    this.subscriptions.set(key, interval);
  }

  /**
   * Unsubscribe from a specific subscription
   */
  unsubscribe(key: string): void {
    const interval = this.subscriptions.get(key);
    if (interval) {
      clearInterval(interval);
      this.subscriptions.delete(key);
    }
  }

  /**
   * Unsubscribe from all subscriptions
   */
  unsubscribeAll(): void {
    for (const [key, interval] of this.subscriptions) {
      clearInterval(interval);
    }
    this.subscriptions.clear();
    metricsCollector.stopCollecting();
  }

  /**
   * Broadcast message to all listeners
   */
  private broadcast(message: WebSocketMessage): void {
    this.emit('message', message);
  }

  /**
   * Get active subscriptions
   */
  getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }
}

// Export singleton instance
export const monitoringWebSocket = MonitoringWebSocket.getInstance();
