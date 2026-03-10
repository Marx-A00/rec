import { NextResponse } from 'next/server';

import { getVisionUsage } from '@/lib/vision/text-detection';

/** GET /api/dev/vision-usage — returns current month's API call count */
export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    );
  }

  return NextResponse.json(getVisionUsage());
}
