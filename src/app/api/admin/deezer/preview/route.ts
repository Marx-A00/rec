import { NextRequest } from 'next/server';

import { auth } from '@/../auth';
import { isAdmin } from '@/lib/permissions';
import prisma from '@/lib/prisma';
import {
  previewDeezerPlaylistAlbums,
  extractDeezerPlaylistId,
  type PreviewProgressEvent,
} from '@/lib/deezer/playlist-import';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * SSE endpoint for Deezer playlist preview with real-time progress.
 *
 * GET /api/admin/deezer/preview?playlistId=867825522
 *
 * Streams progress events as the preview fetches tracks and album details,
 * then sends the final result. Uses TransformStream so the Response is
 * returned immediately and events flow as they happen.
 */
export async function GET(request: NextRequest) {
  // Auth check
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || !isAdmin(user.role)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
    });
  }

  // Validate playlistId param
  const playlistId = request.nextUrl.searchParams.get('playlistId');
  if (!playlistId) {
    return new Response(
      JSON.stringify({ error: 'playlistId parameter required' }),
      { status: 400 }
    );
  }

  const resolvedId = extractDeezerPlaylistId(playlistId);
  if (!resolvedId) {
    return new Response(
      JSON.stringify({ error: 'Invalid Deezer playlist ID or URL' }),
      { status: 400 }
    );
  }

  // Create a TransformStream — return the readable side immediately,
  // write progress events to the writable side in the background.
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  function sendEvent(event: PreviewProgressEvent) {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    writer.write(encoder.encode(data)).catch(() => {
      // Client disconnected, ignore write errors
    });
  }

  // Start async work in background IIFE — do NOT await this,
  // so the Response is returned immediately and events stream live.
  void (async () => {
    try {
      await previewDeezerPlaylistAlbums(resolvedId, {
        onProgress: sendEvent,
      });
    } catch (err) {
      sendEvent({
        phase: 'error',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      try {
        await writer.close();
      } catch {
        // Already closed / client disconnected
      }
    }
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
