import { NextRequest, NextResponse } from 'next/server';

import { withApiLogging } from '@/lib/api-utils';
import { auth } from '@/../auth';
import { isAdmin } from '@/lib/permissions';
import { redis } from '@/lib/queue/redis';
import { cache } from '@/lib/cache/redis-cache';

async function checkAdmin() {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  return null;
}

/**
 * GET /api/admin/cache?action=stats|keys&pattern=cache:*
 */
export const GET = withApiLogging(async (request: NextRequest) => {
  const denied = await checkAdmin();
  if (denied) return denied;

  const action = request.nextUrl.searchParams.get('action') || 'stats';
  const pattern = request.nextUrl.searchParams.get('pattern') || 'cache:*';

  if (action === 'stats') {
    const info = await redis.info('memory');
    const keyCount = await redis.dbsize();

    const memMatch = info.match(/used_memory_human:(\S+)/);
    const peakMatch = info.match(/used_memory_peak_human:(\S+)/);

    return NextResponse.json({
      keyCount,
      memoryUsed: memMatch?.[1] || 'unknown',
      memoryPeak: peakMatch?.[1] || 'unknown',
      cacheMetrics: cache.getMetrics(),
    });
  }

  if (action === 'keys') {
    const keys: string[] = [];
    let cursor = '0';
    do {
      const [nextCursor, batch] = await redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100
      );
      cursor = nextCursor;
      keys.push(...batch);
    } while (cursor !== '0' && keys.length < 200);

    return NextResponse.json({
      pattern,
      count: keys.length,
      keys: keys.sort(),
    });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
});

/**
 * DELETE /api/admin/cache?pattern=cache:spotify:*
 */
export const DELETE = withApiLogging(async (request: NextRequest) => {
  const denied = await checkAdmin();
  if (denied) return denied;

  const pattern = request.nextUrl.searchParams.get('pattern');

  if (!pattern) {
    return NextResponse.json(
      { error: 'pattern query param required' },
      { status: 400 }
    );
  }

  await cache.invalidatePattern(pattern);

  return NextResponse.json({ success: true, pattern });
});
