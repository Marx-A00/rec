// Schema migration broke GraphQL resolvers, needs complete rewrite
// src/lib/graphql/resolvers/subscriptions.ts
// Subscription resolvers for GraphQL API

import { GraphQLError } from 'graphql';
import { withFilter } from 'graphql-subscriptions';

import { SubscriptionResolvers } from '@/generated/graphql';
import { getMusicBrainzQueue } from '@/lib/queue';
import {
  healthChecker,
  metricsCollector,
  alertManager,
  monitoringWebSocket,
} from '@/lib/monitoring';

import { pubsub } from '../pubsub';

// PubSub event names
const QUEUE_STATUS_UPDATE = 'QUEUE_STATUS_UPDATE';
const JOB_STATUS_UPDATE = 'JOB_STATUS_UPDATE';
const SYSTEM_HEALTH_UPDATE = 'SYSTEM_HEALTH_UPDATE';
const ALERT_EVENT = 'ALERT_EVENT';
const METRICS_UPDATE = 'METRICS_UPDATE';

// Initialize monitoring WebSocket listeners to publish to GraphQL subscriptions
function initializeMonitoringListeners() {
  // Forward WebSocket messages to GraphQL subscriptions
  monitoringWebSocket.on('message', message => {
    switch (message.type) {
      case 'queue-status':
        pubsub.publish(QUEUE_STATUS_UPDATE, {
          queueStatusUpdates: message.data,
        });
        break;
      case 'job-update':
        pubsub.publish(JOB_STATUS_UPDATE, { jobStatusUpdates: message.data });
        break;
      case 'health-update':
        pubsub.publish(SYSTEM_HEALTH_UPDATE, {
          systemHealthUpdates: message.data,
        });
        break;
      case 'alert':
        pubsub.publish(ALERT_EVENT, { alertStream: message.data });
        break;
      case 'metrics':
        pubsub.publish(METRICS_UPDATE, { metricsStream: message.data });
        break;
    }
  });

  // Start monitoring subscriptions
  monitoringWebSocket.subscribeToQueueStatus(5000);
  monitoringWebSocket.subscribeToHealthStatus(10000);
  monitoringWebSocket.subscribeToMetrics(10000);

  // Listen for alert events directly
  alertManager.on('alert', alert => {
    pubsub.publish(ALERT_EVENT, { alertStream: alert });
  });

  console.log('📊 Initialized monitoring subscription listeners');
}

// Initialize listeners on module load
initializeMonitoringListeners();

// @ts-expect-error - Temporarily suppress complex GraphQL resolver type issues
export const subscriptionResolvers: SubscriptionResolvers = {
  // Real-time queue status updates
  queueStatusUpdates: {
    subscribe: () => pubsub.asyncIterator([QUEUE_STATUS_UPDATE]),
    resolve: (payload: any) => payload.queueStatusUpdates,
  },

  // Job status updates with optional filtering
  jobStatusUpdates: {
    subscribe: withFilter(
      () => pubsub.asyncIterator([JOB_STATUS_UPDATE]),
      (payload, variables) => {
        // Filter by jobId if provided
        if (variables.jobId) {
          return payload.jobStatusUpdates.jobId === variables.jobId;
        }
        return true;
      }
    ),
    resolve: (payload: any) => payload.jobStatusUpdates,
  },

  // System health updates
  systemHealthUpdates: {
    subscribe: () => pubsub.asyncIterator([SYSTEM_HEALTH_UPDATE]),
    resolve: (payload: any) => payload.systemHealthUpdates,
  },

  // Alert stream
  alertStream: {
    subscribe: () => pubsub.asyncIterator([ALERT_EVENT]),
    resolve: (payload: any) => payload.alertStream,
  },

  // Metrics stream with configurable interval
  metricsStream: {
    subscribe: (_: any, { interval = 10 }: any) => {
      // Create custom interval for this subscription
      const intervalMs = interval * 1000;

      // Publish initial metrics
      const sendMetrics = async () => {
        try {
          const metrics = metricsCollector.getCurrentMetrics();
          const history = metricsCollector.getMetricsHistory(100);
          const jobMetrics = metricsCollector.getJobMetrics(100);

          const now = Date.now();
          const jobsPerMinute = jobMetrics.filter(
            j => j.endTime && j.endTime.getTime() > now - 60000
          ).length;
          const jobsPerHour = jobMetrics.filter(
            j => j.endTime && j.endTime.getTime() > now - 3600000
          ).length;

          const jobsProcessed = jobMetrics.filter(j => j.success).length;
          const jobsFailed = jobMetrics.filter(j => !j.success).length;
          const totalJobs = jobsProcessed + jobsFailed;

          const avgProcessingTime =
            jobMetrics.length > 0
              ? jobMetrics.reduce((sum, j) => sum + (j.duration || 0), 0) /
                jobMetrics.length
              : 0;

          const successRate =
            totalJobs > 0 ? (jobsProcessed / totalJobs) * 100 : 100;
          const errorRate = totalJobs > 0 ? (jobsFailed / totalJobs) * 100 : 0;

          const metricsData = {
            timeRange: 'LAST_HOUR',
            jobsProcessed,
            jobsFailed,
            avgProcessingTime,
            successRate,
            errorRate,
            throughput: {
              jobsPerMinute,
              jobsPerHour,
              peakJobsPerMinute: Math.max(
                jobsPerMinute,
                ...(history.map(h => h.queue?.throughput?.jobsPerMinute || 0) ||
                  [])
              ),
            },
            topErrors: [],
          };

          pubsub.publish(METRICS_UPDATE, { metricsStream: metricsData });
        } catch (error) {
          console.error('Failed to publish metrics:', error);
        }
      };

      // Send immediately
      sendMetrics();

      // Set up interval
      const intervalHandle = setInterval(sendMetrics, intervalMs);

      // Clean up on unsubscribe
      return {
        [Symbol.asyncIterator]() {
          const iterator = pubsub.asyncIterator([METRICS_UPDATE]);
          const originalReturn = iterator.return;

          // Override return to clean up interval
          iterator.return = async () => {
            clearInterval(intervalHandle);
            if (originalReturn) {
              return originalReturn.call(iterator);
            }
            return { value: undefined, done: true };
          };

          return iterator;
        },
      };
    },
    resolve: (payload: any) => payload.metricsStream,
  },
};
