'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Search,
  Loader2,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  ScanEye,
} from 'lucide-react';

import AlbumImage from '@/components/ui/AlbumImage';
import { RevealImage } from '@/components/uncover/RevealImage';
import { TOTAL_STAGES } from '@/lib/uncover/reveal-constants';
import { useSuggestedGameAlbumsQuery } from '@/generated/graphql';

import type {
  TextRegion,
  FilteredTextResult,
} from '@/lib/vision/text-detection';

// ─── Types ──────────────────────────────────────────────────────

interface DetectionResult {
  raw: Array<{ text: string; boundingBox: TextRegion; confidence?: number }>;
  filtered: FilteredTextResult[];
  regions: TextRegion[];
  summary: {
    totalDetected: number;
    keptCount: number;
    discardedCount: number;
  };
}

interface SelectedAlbum {
  id: string;
  title: string;
  artistName: string;
  coverArtUrl: string | null;
  cloudflareImageId: string | null;
}

const CLOUDFLARE_BASE = `https://imagedelivery.net/${process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_DELIVERY_URL?.split('/').pop() ?? ''}`;

// ─── Component ──────────────────────────────────────────────────

export default function UncoverVisionClient() {
  // Album selection
  const [selectedAlbum, setSelectedAlbum] = useState<SelectedAlbum | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState('');

  // Detection state
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionResult, setDetectionResult] =
    useState<DetectionResult | null>(null);
  const [detectionError, setDetectionError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(0.5);

  // Reveal stage & overlay
  const [stage, setStage] = useState(1);
  const [showOverlay, setShowOverlay] = useState(true);

  // Canvas overlay ref
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Usage tracking
  const [usage, setUsage] = useState<{
    count: number;
    limit: number;
    month: string;
  } | null>(null);

  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch('/api/dev/vision-usage');
      if (res.ok) {
        setUsage(
          (await res.json()) as { count: number; limit: number; month: string }
        );
      }
    } catch {
      // Silent fail
    }
  }, []);

  // Fetch usage on mount
  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  // Fetch albums from DB for picker
  const { data: albumsData } = useSuggestedGameAlbumsQuery({
    limit: 200,
    offset: 0,
    search: searchQuery || undefined,
  });

  const albums = albumsData?.suggestedGameAlbums?.albums ?? [];

  // ─── Detection ──────────────────────────────────────────────

  const runDetection = useCallback(
    async (album: SelectedAlbum, thresh: number) => {
      setIsDetecting(true);
      setDetectionError(null);
      setDetectionResult(null);

      const imageUrl = album.cloudflareImageId
        ? `${CLOUDFLARE_BASE}/${album.cloudflareImageId}/public`
        : album.coverArtUrl;

      if (!imageUrl) {
        setDetectionError('No image URL available');
        setIsDetecting(false);
        return;
      }

      try {
        const res = await fetch('/api/dev/detect-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl,
            albumTitle: album.title,
            artistName: album.artistName,
            threshold: thresh,
          }),
        });

        if (!res.ok) {
          const err = (await res.json()) as { error?: string };
          throw new Error(err.error ?? `HTTP ${res.status}`);
        }

        const result = (await res.json()) as DetectionResult;
        setDetectionResult(result);
        fetchUsage(); // Refresh usage counter
      } catch (error) {
        setDetectionError(
          error instanceof Error ? error.message : 'Detection failed'
        );
      } finally {
        setIsDetecting(false);
      }
    },
    []
  );

  const handleSelectAlbum = useCallback(
    (album: (typeof albums)[number]) => {
      const artistName =
        album.artists?.map(a => a.artist.name).join(', ') ?? 'Unknown';
      const selected: SelectedAlbum = {
        id: album.id,
        title: album.title,
        artistName,
        coverArtUrl: album.coverArtUrl ?? null,
        cloudflareImageId: album.cloudflareImageId ?? null,
      };
      setSelectedAlbum(selected);
      setStage(1);
      runDetection(selected, threshold);
    },
    [runDetection, threshold]
  );

  // ─── Overlay drawing ───────────────────────────────────────

  useEffect(() => {
    const canvas = overlayRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!showOverlay || !detectionResult) return;

    const { filtered } = detectionResult;

    for (const item of filtered) {
      const { boundingBox, kept } = item;
      const x = boundingBox.x * canvas.width;
      const y = boundingBox.y * canvas.height;
      const w = boundingBox.w * canvas.width;
      const h = boundingBox.h * canvas.height;

      if (kept) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
        ctx.fillRect(x, y, w, h);
      } else {
        ctx.strokeStyle = 'rgba(161, 161, 170, 0.6)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.fillStyle = 'rgba(161, 161, 170, 0.08)';
        ctx.fillRect(x, y, w, h);
      }

      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
    }
  }, [showOverlay, detectionResult, stage]);

  // ─── Keyboard navigation ───────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setStage(s => Math.max(1, s - 1));
      } else if (e.key === 'ArrowRight') {
        setStage(s => Math.min(TOTAL_STAGES, s + 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ─── Image URL ─────────────────────────────────────────────

  const imageUrl = selectedAlbum
    ? selectedAlbum.cloudflareImageId
      ? `${CLOUDFLARE_BASE}/${selectedAlbum.cloudflareImageId}/public`
      : selectedAlbum.coverArtUrl
    : null;

  // ─── Render ────────────────────────────────────────────────

  return (
    <div className='flex h-full items-start gap-12 px-[60px] pt-8'>
      {/* Art Column — matches game layout */}
      <div className='flex flex-col items-center gap-4'>
        <div className='overflow-hidden rounded-2xl border border-emerald-500/25 bg-zinc-900 shadow-[0_0_48px_rgba(16,185,129,0.07)]'>
          <div ref={containerRef} className='relative h-[500px] w-[500px]'>
            {selectedAlbum && imageUrl ? (
              <>
                <RevealImage
                  imageUrl={imageUrl}
                  challengeId={selectedAlbum.id}
                  stage={stage}
                  revealMode='regions'
                  textRegions={detectionResult?.regions ?? null}
                  className='h-full w-full'
                  showToggle={false}
                />
                <canvas
                  ref={overlayRef}
                  className='pointer-events-none absolute inset-0 h-full w-full'
                />
                {isDetecting && (
                  <div className='absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm'>
                    <div className='flex items-center gap-2 text-sm text-white'>
                      <Loader2 className='h-5 w-5 animate-spin' />
                      Detecting text...
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className='flex h-full w-full items-center justify-center'>
                <div className='text-center'>
                  <ScanEye className='mx-auto h-10 w-10 text-zinc-700 mb-3' />
                  <p className='text-sm text-zinc-500'>
                    Select an album to test
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stage navigation — below art, like AttemptDots */}
        <div className='flex items-center gap-3'>
          <button
            onClick={() => setStage(s => Math.max(1, s - 1))}
            disabled={stage <= 1}
            className='rounded-md bg-zinc-800 p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-white disabled:opacity-30'
          >
            <ChevronLeft className='h-4 w-4' />
          </button>
          <div className='flex gap-1'>
            {Array.from({ length: TOTAL_STAGES }, (_, i) => i + 1).map(s => (
              <button
                key={s}
                onClick={() => setStage(s)}
                className={`h-8 w-8 rounded text-xs font-medium transition-colors ${
                  s === stage
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <button
            onClick={() => setStage(s => Math.min(TOTAL_STAGES, s + 1))}
            disabled={stage >= TOTAL_STAGES}
            className='rounded-md bg-zinc-800 p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-white disabled:opacity-30'
          >
            <ChevronRight className='h-4 w-4' />
          </button>
          <span className='text-xs text-zinc-500'>
            Stage {stage} of {TOTAL_STAGES}
          </span>
        </div>
      </div>

      {/* Controls Column — matches game right panel */}
      <div className='flex min-h-0 flex-1 flex-col'>
        {/* Header */}
        <div className='flex items-center justify-between pb-1'>
          <h2 className='text-2xl font-bold text-white'>Vision Test</h2>
          {usage && (
            <span
              className={`text-xs font-mono px-2 py-1 rounded ${
                usage.count >= usage.limit * 0.9
                  ? 'bg-red-950/50 text-red-400'
                  : usage.count >= usage.limit * 0.5
                    ? 'bg-amber-950/50 text-amber-400'
                    : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {usage.count}/{usage.limit} calls
            </span>
          )}
        </div>
        <p className='text-xs text-zinc-500 pb-5'>
          Cloud Vision text detection pipeline
          {usage && <span className='text-zinc-600'> · {usage.month}</span>}
        </p>

        {/* Album picker */}
        <div className='pb-3'>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500' />
            <input
              type='text'
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder='Search approved albums...'
              className='w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-zinc-500 focus:border-zinc-600 focus:outline-none'
            />
          </div>
        </div>

        {/* Album grid */}
        <div className='max-h-[360px] overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900/50 p-2'>
          <div className='grid grid-cols-8 gap-1.5'>
            {albums.slice(0, 200).map(album => {
              const isSelected = selectedAlbum?.id === album.id;
              return (
                <button
                  key={album.id}
                  onClick={() => handleSelectAlbum(album)}
                  className={`group flex flex-col items-center gap-0.5 rounded p-1 transition-colors ${
                    isSelected
                      ? 'bg-emerald-500/20 ring-1 ring-emerald-500/50'
                      : 'hover:bg-zinc-800'
                  }`}
                  title={`${album.title} — ${album.artists?.map(a => a.artist.name).join(', ')}`}
                >
                  <AlbumImage
                    src={album.coverArtUrl}
                    cloudflareImageId={album.cloudflareImageId}
                    alt={album.title}
                    width={44}
                    height={44}
                    className='rounded'
                  />
                  <span className='w-full truncate text-center text-[8px] text-zinc-600 group-hover:text-zinc-400'>
                    {album.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className='h-px w-full bg-zinc-800 my-4' />

        {/* Selected album info + controls */}
        {selectedAlbum && (
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <div className='min-w-0'>
                <p className='text-sm font-medium text-white truncate'>
                  {selectedAlbum.title}
                </p>
                <p className='text-xs text-zinc-400 truncate'>
                  {selectedAlbum.artistName}
                </p>
              </div>
              <button
                onClick={() => setShowOverlay(o => !o)}
                className='flex items-center gap-1.5 rounded-lg bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700'
              >
                {showOverlay ? (
                  <>
                    <EyeOff className='h-3.5 w-3.5' /> Hide Overlay
                  </>
                ) : (
                  <>
                    <Eye className='h-3.5 w-3.5' /> Show Overlay
                  </>
                )}
              </button>
            </div>

            {/* Threshold slider */}
            <div className='rounded-lg border border-zinc-800 bg-zinc-900/50 p-3'>
              <div className='flex items-center justify-between mb-1.5'>
                <label className='text-xs font-medium text-zinc-400'>
                  Similarity Threshold
                </label>
                <span className='text-xs font-mono text-zinc-300'>
                  {threshold.toFixed(2)}
                </span>
              </div>
              <input
                type='range'
                min={0}
                max={1}
                step={0.05}
                value={threshold}
                onChange={e => {
                  const newThreshold = Number(e.target.value);
                  setThreshold(newThreshold);
                  if (selectedAlbum) {
                    runDetection(selectedAlbum, newThreshold);
                  }
                }}
                className='w-full accent-emerald-500'
              />
              <div className='mt-1 flex justify-between text-[10px] text-zinc-600'>
                <span>0 (match all)</span>
                <span>1 (exact only)</span>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {detectionError && (
          <div className='mt-3 rounded-lg border border-red-500/50 bg-red-950/20 p-3 text-center text-sm text-red-400'>
            {detectionError}
          </div>
        )}

        {/* Detection results — scrollable area */}
        {detectionResult && (
          <div className='min-h-0 flex-1 overflow-y-auto pt-3 space-y-3'>
            {/* Summary */}
            <div className='flex gap-4 text-sm'>
              <div>
                <span className='text-zinc-500'>Detected: </span>
                <span className='text-white font-medium'>
                  {detectionResult.summary.totalDetected}
                </span>
              </div>
              <div>
                <span className='text-zinc-500'>Kept: </span>
                <span className='text-red-400 font-medium'>
                  {detectionResult.summary.keptCount}
                </span>
              </div>
              <div>
                <span className='text-zinc-500'>Discarded: </span>
                <span className='text-zinc-300 font-medium'>
                  {detectionResult.summary.discardedCount}
                </span>
              </div>
            </div>

            {/* Filtered results */}
            <div className='space-y-1'>
              {detectionResult.filtered.map((item, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 rounded-md px-3 py-1.5 text-sm ${
                    item.kept
                      ? 'bg-red-950/30 border border-red-500/20'
                      : 'bg-zinc-800/50'
                  }`}
                >
                  <span
                    className={`font-mono text-[10px] w-7 ${
                      item.kept ? 'text-red-400' : 'text-zinc-600'
                    }`}
                  >
                    {item.kept ? 'KEPT' : 'SKIP'}
                  </span>
                  <span className='text-white font-medium truncate'>
                    &quot;{item.text}&quot;
                  </span>
                  <span className='text-zinc-600 text-xs flex-shrink-0'>
                    vs {item.matchedAgainst}
                  </span>
                  <span
                    className={`ml-auto text-xs font-mono flex-shrink-0 ${
                      item.similarity >= threshold
                        ? 'text-red-400'
                        : 'text-zinc-600'
                    }`}
                  >
                    {(item.similarity * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
              {detectionResult.filtered.length === 0 && (
                <p className='text-sm text-zinc-500 py-2'>
                  No text detected on this cover.
                </p>
              )}
            </div>

            {/* Raw data collapsible */}
            <details className='rounded-lg border border-zinc-800'>
              <summary className='cursor-pointer px-3 py-2 text-xs font-medium text-zinc-500 hover:text-zinc-300'>
                Raw data ({detectionResult.raw.length} items)
              </summary>
              <div className='border-t border-zinc-800 p-3'>
                <pre className='max-h-[200px] overflow-auto rounded bg-zinc-950 p-2 text-[10px] text-zinc-400 font-mono'>
                  {JSON.stringify(detectionResult.raw, null, 2)}
                </pre>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
