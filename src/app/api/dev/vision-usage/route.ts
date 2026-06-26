import { NextResponse } from 'next/server';

import { withApiLogging } from '@/lib/api-utils';
import { auth } from '@/../auth';
import { isAdmin } from '@/lib/permissions';
import { getVisionUsage } from '@/lib/vision/text-detection';

/** GET /api/dev/vision-usage — returns current month's API call count (admin only) */
export const GET = withApiLogging(async () => {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  return NextResponse.json(getVisionUsage());
});
