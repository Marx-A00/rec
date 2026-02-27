'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

import type {
  DeezerPlaylistPreviewResult,
  PreviewProgressEvent,
} from '@/lib/deezer/playlist-import';

// ============================================================================
// Types
// ============================================================================

export interface DeezerPreviewProgress {
  phase: 'playlist' | 'tracks' | 'albums' | 'done' | 'error';
  playlistName: string | null;
  current: number;
  total: number;
  percent: number;
}

interface UseDeezerPreviewStreamReturn {
  /** The final preview result (null until done) */
  result: DeezerPlaylistPreviewResult | null;
  /** Current progress state */
  progress: DeezerPreviewProgress | null;
  /** Whether the stream is active */
  isLoading: boolean;
  /** Error message if the stream failed */
  error: string | null;
  /** Trigger a preview for a playlist ID */
  startPreview: (playlistId: string) => void;
  /** Reset state (clear result/progress/error) */
  reset: () => void;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Streams a Deezer playlist preview via SSE with real-time progress updates.
 *
 * Uses fetch + ReadableStream reader to consume Server-Sent Events from
 * /api/admin/deezer/preview. Provides progress state for rendering a
 * progress bar and the final result when complete.
 */
export function useDeezerPreviewStream(): UseDeezerPreviewStreamReturn {
  const [result, setResult] = useState<DeezerPlaylistPreviewResult | null>(
    null
  );
  const [progress, setProgress] = useState<DeezerPreviewProgress | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setResult(null);
    setProgress(null);
    setIsLoading(false);
    setError(null);
  }, []);

  const startPreview = useCallback((playlistId: string) => {
    // Abort any in-flight stream
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    setResult(null);
    setProgress(null);
    setError(null);
    setIsLoading(true);

    void (async () => {
      try {
        const res = await fetch(
          `/api/admin/deezer/preview?playlistId=${encodeURIComponent(playlistId)}`,
          {
            signal: controller.signal,
            credentials: 'include',
          }
        );

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            (body as { error?: string }).error ??
              `HTTP ${res.status}: ${res.statusText}`
          );
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events from buffer (format: "data: {...}\n\n")
          const events = buffer.split('\n\n');
          // Keep the last incomplete chunk in the buffer
          buffer = events.pop() ?? '';

          for (const event of events) {
            const line = event.trim();
            if (!line.startsWith('data: ')) continue;

            const json = line.slice(6); // Remove "data: " prefix
            let parsed: PreviewProgressEvent;
            try {
              parsed = JSON.parse(json) as PreviewProgressEvent;
            } catch {
              continue;
            }

            switch (parsed.phase) {
              case 'playlist':
                setProgress({
                  phase: 'playlist',
                  playlistName: parsed.name,
                  current: 0,
                  total: parsed.trackCount,
                  percent: 0,
                });
                break;

              case 'tracks':
                setProgress(prev => ({
                  phase: 'tracks',
                  playlistName: prev?.playlistName ?? null,
                  current: parsed.current,
                  total: parsed.total,
                  percent: Math.round(
                    (parsed.current / Math.max(parsed.total, 1)) * 10
                  ), // Tracks = 0-10% (fast phase)
                }));
                break;

              case 'albums':
                setProgress(prev => ({
                  phase: 'albums',
                  playlistName: prev?.playlistName ?? null,
                  current: parsed.current,
                  total: parsed.total,
                  percent:
                    10 +
                    Math.round(
                      (parsed.current / Math.max(parsed.total, 1)) * 90
                    ), // Albums = 10-100% (slow phase)
                }));
                break;

              case 'done':
                setResult(parsed.result);
                setProgress(prev => ({
                  phase: 'done',
                  playlistName: prev?.playlistName ?? null,
                  current: prev?.total ?? 0,
                  total: prev?.total ?? 0,
                  percent: 100,
                }));
                setIsLoading(false);
                break;

              case 'error':
                setError(parsed.message);
                setIsLoading(false);
                break;
            }
          }
        }

        // Stream ended without a done/error event — shouldn't happen, but handle it
        setIsLoading(false);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Stream failed');
        setIsLoading(false);
      }
    })();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return { result, progress, isLoading, error, startPreview, reset };
}
