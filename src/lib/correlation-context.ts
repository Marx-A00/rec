import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

// Context shape for correlation tracking
interface CorrelationContext {
  correlationId: string;
  requestPath?: string;
  userId?: string;
}

// AsyncLocalStorage instance for correlation context
export const correlationStorage =
  new AsyncLocalStorage<CorrelationContext>();

/**
 * Get the current correlation ID from the async context
 * Returns undefined if not in a request context
 */
export function getCorrelationId(): string | undefined {
  return correlationStorage.getStore()?.correlationId;
}

/**
 * Get the full correlation context
 */
export function getCorrelationContext(): CorrelationContext | undefined {
  return correlationStorage.getStore();
}

/**
 * Generate a new correlation ID
 */
export function generateCorrelationId(): string {
  return randomUUID();
}

/**
 * Run a function within a correlation context
 * This is primarily used by middleware to wrap request handling
 */
export function runWithCorrelationId<T>(
  correlationId: string,
  context: Partial<Omit<CorrelationContext, 'correlationId'>>,
  fn: () => T
): T {
  const fullContext: CorrelationContext = {
    correlationId,
    ...context,
  };
  return correlationStorage.run(fullContext, fn);
}

/**
 * Update the correlation context with additional information
 * (e.g., add userId after authentication)
 */
export function updateCorrelationContext(
  updates: Partial<CorrelationContext>
): void {
  const current = correlationStorage.getStore();
  if (current) {
    Object.assign(current, updates);
  }
}
