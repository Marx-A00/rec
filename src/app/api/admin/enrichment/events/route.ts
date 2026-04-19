// SSE endpoint for real-time enrichment status updates
// Bridges Redis pub/sub (worker) → browser EventSource (admin page)

import { NextRequest } from 'next/server';
import { auth } from '@/../auth';
import { isAdmin } from '@/lib/permissions';
import { createRedisSubscriber } from '@/lib/queue/redis';
import { ENRICHMENT_CHANNEL } from '@/lib/queue/enrichment-events';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user.role)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const subscriber = createRedisSubscriber();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Initial connection comment (SSE spec: lines starting with : are comments)
      controller.enqueue(encoder.encode(': connected\n\n'));

      subscriber
        .subscribe(ENRICHMENT_CHANNEL)
        .then(() => {
          console.log('[SSE] Client subscribed to enrichment events');
        })
        .catch((err: unknown) => {
          console.error('[SSE] Failed to subscribe:', err);
          controller.close();
        });

      // Forward Redis pub/sub messages as SSE events
      subscriber.on('message', (channel: string, message: string) => {
        if (channel !== ENRICHMENT_CHANNEL) return;
        try {
          // Validate JSON before forwarding
          JSON.parse(message);
          controller.enqueue(encoder.encode(`data: ${message}\n\n`));
        } catch (err) {
          console.warn('[SSE] Invalid message on enrichment channel:', err);
        }
      });

      // Keepalive every 30s to prevent proxy/LB idle timeouts
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keepalive\n\n'));
        } catch {
          clearInterval(keepalive);
        }
      }, 30_000);

      // Store for cleanup
      request.signal.addEventListener('abort', () => {
        clearInterval(keepalive);
        subscriber.unsubscribe(ENRICHMENT_CHANNEL).catch(() => {});
        subscriber.disconnect();
        console.log('[SSE] Client disconnected, cleaned up subscriber');
      });
    },
    cancel() {
      subscriber.unsubscribe(ENRICHMENT_CHANNEL).catch(() => {});
      subscriber.disconnect();
      console.log('[SSE] Stream cancelled, cleaned up subscriber');
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
