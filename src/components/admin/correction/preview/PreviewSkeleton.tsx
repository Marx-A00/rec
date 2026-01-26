'use client';

/**
 * Skeleton placeholder component for consistent loading states.
 */
function Skeleton({ className }: { className: string }) {
  return (
    <div className={`animate-pulse bg-zinc-800 rounded ${className}`} />
  );
}

/**
 * Single column skeleton content matching preview structure.
 */
function ColumnSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header placeholder */}
      <Skeleton className="w-24 h-4" />

      {/* Cover art placeholder */}
      <Skeleton className="w-32 h-32 rounded-lg" />

      {/* Field rows */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <Skeleton className="w-20 h-3" />
          <Skeleton className="w-48 h-3" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="w-20 h-3" />
          <Skeleton className="w-36 h-3" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="w-20 h-3" />
          <Skeleton className="w-52 h-3" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="w-20 h-3" />
          <Skeleton className="w-40 h-3" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="w-20 h-3" />
          <Skeleton className="w-28 h-3" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="w-20 h-3" />
          <Skeleton className="w-44 h-3" />
        </div>
      </div>

      {/* Track section header */}
      <div className="pt-4">
        <Skeleton className="w-32 h-4 mb-3" />

        {/* Track rows */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Skeleton className="w-6 h-3" />
            <Skeleton className="w-48 h-3" />
            <Skeleton className="w-12 h-3 ml-auto" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="w-6 h-3" />
            <Skeleton className="w-52 h-3" />
            <Skeleton className="w-12 h-3 ml-auto" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="w-6 h-3" />
            <Skeleton className="w-40 h-3" />
            <Skeleton className="w-12 h-3 ml-auto" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="w-6 h-3" />
            <Skeleton className="w-56 h-3" />
            <Skeleton className="w-12 h-3 ml-auto" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="w-6 h-3" />
            <Skeleton className="w-44 h-3" />
            <Skeleton className="w-12 h-3 ml-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Loading skeleton for PreviewView that mimics the comparison layout.
 *
 * Displays two-column skeleton matching the structure of:
 * - Cover art thumbnails
 * - Field rows (title, artist, date, type, label, barcode)
 * - Track listing section
 *
 * Uses animate-pulse for subtle loading animation.
 */
export function PreviewSkeleton() {
  return (
    <div className="space-y-6">
      {/* Summary change counts skeleton */}
      <div className="flex items-center gap-4 p-4 bg-zinc-800/50 rounded-lg">
        <Skeleton className="w-24 h-5" />
        <Skeleton className="w-16 h-5" />
        <Skeleton className="w-20 h-5" />
        <Skeleton className="w-16 h-5" />
      </div>

      {/* Two-column comparison skeleton */}
      <div className="grid grid-cols-2 gap-6">
        <ColumnSkeleton />
        <ColumnSkeleton />
      </div>
    </div>
  );
}
