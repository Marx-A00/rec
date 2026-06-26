import { AsyncLocalStorage } from 'async_hooks';

// Context shape for correlation tracking
interface CorrelationContext {
  correlationId: string;
  requestPath?: string;
  userId?: string;
}

// AsyncLocalStorage instance for correlation context
export const correlationStorage = new AsyncLocalStorage<CorrelationContext>();

export function getCorrelationId(): string | undefined {
  return correlationStorage.getStore()?.correlationId;
}

export function getCorrelationContext(): CorrelationContext | undefined {
  return correlationStorage.getStore();
}

export function generateCorrelationId(): string {
  return crypto.randomUUID();
}

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

export function updateCorrelationContext(
  updates: Partial<CorrelationContext>
): void {
  const current = correlationStorage.getStore();
  if (current) {
    Object.assign(current, updates);
  }
}
