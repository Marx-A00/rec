// src/lib/db/pagination.ts
// Shared pagination utilities for Prisma queries.

/**
 * Build Prisma cursor pagination args (keyset pagination).
 *
 * Uses the standard pattern: fetch `limit + 1` rows, skip 1 when a cursor is
 * provided (to exclude the cursor row itself).
 *
 * @example
 *   const items = await prisma.album.findMany({
 *     ...buildCursorPagination(cursor, limit),
 *     orderBy: { createdAt: 'desc' },
 *   });
 *   const nextCursor = getNextCursor(items, limit);
 */
export function buildCursorPagination(
  cursor: string | undefined | null,
  limit: number
): { skip: number; take: number; cursor?: { id: string } } {
  return {
    take: limit + 1,
    skip: cursor ? 1 : 0,
    ...(cursor ? { cursor: { id: cursor } } : {}),
  };
}

/**
 * Build Prisma offset pagination args (skip/take).
 */
export function buildOffsetPagination(
  offset: number,
  limit: number
): { skip: number; take: number } {
  return {
    skip: offset,
    take: limit,
  };
}

/**
 * Extract the next cursor from a result set fetched with `buildCursorPagination`.
 *
 * Because `buildCursorPagination` fetches `limit + 1`, if the array length
 * exceeds `limit` there are more rows. The extra row is popped and the last
 * remaining item's ID becomes the next cursor.
 *
 * Returns `{ items, nextCursor, hasMore }` — the trimmed array plus pagination
 * metadata.
 */
export function extractCursorPage<T extends { id: string }>(
  rows: T[],
  limit: number
): { items: T[]; nextCursor: string | null; hasMore: boolean } {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? items[items.length - 1].id : null;
  return { items, nextCursor, hasMore };
}

/**
 * Build a stable orderBy clause with secondary ID sort to guarantee
 * deterministic ordering for cursor pagination.
 */
export function buildStableSort(
  primaryField: string,
  direction: 'asc' | 'desc' = 'desc'
): Array<Record<string, 'asc' | 'desc'>> {
  return [{ [primaryField]: direction }, { id: direction }];
}
