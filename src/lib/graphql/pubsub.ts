// src/lib/graphql/pubsub.ts
// PubSub instance for GraphQL subscriptions

import { PubSub } from 'graphql-subscriptions';

// Create a single PubSub instance for the application
export const pubsub = new PubSub();

// Export event names for consistency
export const PUBSUB_EVENTS = {
  // Monitoring events
  QUEUE_STATUS_UPDATE: 'QUEUE_STATUS_UPDATE',
  JOB_STATUS_UPDATE: 'JOB_STATUS_UPDATE',
  SYSTEM_HEALTH_UPDATE: 'SYSTEM_HEALTH_UPDATE',
  ALERT_EVENT: 'ALERT_EVENT',
  METRICS_UPDATE: 'METRICS_UPDATE',

  // Future events
  RECOMMENDATION_CREATED: 'RECOMMENDATION_CREATED',
  COLLECTION_UPDATED: 'COLLECTION_UPDATED',
  USER_ACTIVITY: 'USER_ACTIVITY',
} as const;

export type PubSubEvent = typeof PUBSUB_EVENTS[keyof typeof PUBSUB_EVENTS];