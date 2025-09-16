// src/lib/monitoring/alert-manager.ts
import { EventEmitter } from 'events';
import { metricsCollector } from './metrics-collector';
import type { SystemMetrics } from './metrics-collector';

export enum AlertLevel {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export enum AlertType {
  QUEUE_DEPTH = 'QUEUE_DEPTH',
  ERROR_RATE = 'ERROR_RATE',
  MEMORY_USAGE = 'MEMORY_USAGE',
  PROCESSING_TIME = 'PROCESSING_TIME',
  RATE_LIMIT = 'RATE_LIMIT',
  WORKER_FAILURE = 'WORKER_FAILURE',
  REDIS_CONNECTION = 'REDIS_CONNECTION',
}

export interface Alert {
  id: string;
  level: AlertLevel;
  type: AlertType;
  message: string;
  details?: any;
  timestamp: Date;
  acknowledged: boolean;
  resolvedAt?: Date;
}

export interface AlertRule {
  type: AlertType;
  level: AlertLevel;
  condition: (metrics: SystemMetrics) => boolean;
  message: (metrics: SystemMetrics) => string;
  cooldownMs: number; // Prevent alert spam
}

export class AlertManager extends EventEmitter {
  private static instance: AlertManager | null = null;
  private alerts: Map<string, Alert> = new Map();
  private rules: Map<AlertType, AlertRule> = new Map();
  private lastAlertTime: Map<AlertType, number> = new Map();
  private alertHistory: Alert[] = [];
  private readonly maxHistorySize = 500;

  private constructor() {
    super();
    this.initializeDefaultRules();
    this.startMonitoring();
  }

  static getInstance(): AlertManager {
    if (!AlertManager.instance) {
      AlertManager.instance = new AlertManager();
    }
    return AlertManager.instance;
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultRules(): void {
    // Queue depth alert
    this.rules.set(AlertType.QUEUE_DEPTH, {
      type: AlertType.QUEUE_DEPTH,
      level: AlertLevel.WARNING,
      condition: (metrics) => metrics.queue.depth > 1000,
      message: (metrics) => `Queue depth (${metrics.queue.depth}) exceeds threshold (1000)`,
      cooldownMs: 300000, // 5 minutes
    });

    // Critical queue depth
    this.rules.set(AlertType.QUEUE_DEPTH, {
      type: AlertType.QUEUE_DEPTH,
      level: AlertLevel.CRITICAL,
      condition: (metrics) => metrics.queue.depth > 5000,
      message: (metrics) => `CRITICAL: Queue depth (${metrics.queue.depth}) exceeds critical threshold (5000)`,
      cooldownMs: 60000, // 1 minute for critical
    });

    // Error rate alert
    this.rules.set(AlertType.ERROR_RATE, {
      type: AlertType.ERROR_RATE,
      level: AlertLevel.WARNING,
      condition: (metrics) => metrics.queue.errorRate > 10,
      message: (metrics) => `Error rate (${metrics.queue.errorRate.toFixed(2)}%) exceeds threshold (10%)`,
      cooldownMs: 300000,
    });

    // Memory usage alert
    this.rules.set(AlertType.MEMORY_USAGE, {
      type: AlertType.MEMORY_USAGE,
      level: AlertLevel.WARNING,
      condition: (metrics) => {
        const memoryMB = metrics.system.memory.heapUsed / 1024 / 1024;
        return memoryMB > 512;
      },
      message: (metrics) => {
        const memoryMB = (metrics.system.memory.heapUsed / 1024 / 1024).toFixed(2);
        return `Memory usage (${memoryMB}MB) exceeds threshold (512MB)`;
      },
      cooldownMs: 600000, // 10 minutes
    });

    // Processing time alert
    this.rules.set(AlertType.PROCESSING_TIME, {
      type: AlertType.PROCESSING_TIME,
      level: AlertLevel.WARNING,
      condition: (metrics) => metrics.queue.throughput.avgProcessingTime > 30000,
      message: (metrics) => `Average processing time (${metrics.queue.throughput.avgProcessingTime}ms) exceeds threshold (30000ms)`,
      cooldownMs: 300000,
    });

    // Redis connection alert
    this.rules.set(AlertType.REDIS_CONNECTION, {
      type: AlertType.REDIS_CONNECTION,
      level: AlertLevel.CRITICAL,
      condition: (metrics) => !metrics.redis.connected,
      message: () => 'Redis connection lost',
      cooldownMs: 60000,
    });
  }

  /**
   * Start monitoring for alerts
   */
  private startMonitoring(): void {
    // Listen for metrics updates
    metricsCollector.on('metrics', (metrics: SystemMetrics) => {
      this.checkRules(metrics);
    });

    // Listen for specific alerts from metrics collector
    metricsCollector.on('alert', (alertData: any) => {
      this.createAlert(
        AlertType.QUEUE_DEPTH,
        AlertLevel.WARNING,
        alertData.alerts.join(', '),
        alertData.metrics
      );
    });
  }

  /**
   * Check all rules against current metrics
   */
  private checkRules(metrics: SystemMetrics): void {
    for (const [type, rule] of this.rules) {
      // Check if condition is met
      if (rule.condition(metrics)) {
        // Check cooldown
        const lastAlert = this.lastAlertTime.get(type) || 0;
        const now = Date.now();

        if (now - lastAlert > rule.cooldownMs) {
          this.createAlert(
            rule.type,
            rule.level,
            rule.message(metrics),
            metrics
          );
          this.lastAlertTime.set(type, now);
        }
      } else {
        // Condition no longer met, resolve any active alerts of this type
        this.resolveAlertsOfType(type);
      }
    }
  }

  /**
   * Create a new alert
   */
  createAlert(type: AlertType, level: AlertLevel, message: string, details?: any): Alert {
    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      level,
      message,
      details,
      timestamp: new Date(),
      acknowledged: false,
    };

    // Store alert
    this.alerts.set(alert.id, alert);

    // Add to history
    this.alertHistory.push(alert);
    if (this.alertHistory.length > this.maxHistorySize) {
      this.alertHistory.shift();
    }

    // Emit alert event
    this.emit('alert', alert);

    // Log based on level
    switch (level) {
      case AlertLevel.CRITICAL:
        console.error(`🚨 CRITICAL ALERT: ${message}`);
        break;
      case AlertLevel.ERROR:
        console.error(`❌ ERROR ALERT: ${message}`);
        break;
      case AlertLevel.WARNING:
        console.warn(`⚠️ WARNING: ${message}`);
        break;
      case AlertLevel.INFO:
        console.log(`ℹ️ INFO: ${message}`);
        break;
    }

    return alert;
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert && !alert.acknowledged) {
      alert.acknowledged = true;
      this.emit('alert:acknowledged', alert);
      return true;
    }
    return false;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert && !alert.resolvedAt) {
      alert.resolvedAt = new Date();
      this.emit('alert:resolved', alert);

      // Remove from active alerts after a delay
      setTimeout(() => {
        this.alerts.delete(alertId);
      }, 300000); // Keep for 5 minutes after resolution

      return true;
    }
    return false;
  }

  /**
   * Resolve all alerts of a specific type
   */
  private resolveAlertsOfType(type: AlertType): void {
    for (const [id, alert] of this.alerts) {
      if (alert.type === type && !alert.resolvedAt) {
        this.resolveAlert(id);
      }
    }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values())
      .filter(alert => !alert.resolvedAt)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit: number = 100): Alert[] {
    return this.alertHistory.slice(-limit);
  }

  /**
   * Add custom alert rule
   */
  addRule(rule: AlertRule): void {
    this.rules.set(rule.type, rule);
    console.log(`📊 Added alert rule: ${rule.type}`);
  }

  /**
   * Remove alert rule
   */
  removeRule(type: AlertType): boolean {
    return this.rules.delete(type);
  }

  /**
   * Get all alert rules
   */
  getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Clear all alerts
   */
  clearAlerts(): void {
    this.alerts.clear();
    this.alertHistory = [];
    this.emit('alerts:cleared');
    console.log('📊 Cleared all alerts');
  }

  /**
   * Test alert system
   */
  testAlert(): Alert {
    return this.createAlert(
      AlertType.QUEUE_DEPTH,
      AlertLevel.INFO,
      'This is a test alert',
      { test: true }
    );
  }
}

// Export singleton instance
export const alertManager = AlertManager.getInstance();