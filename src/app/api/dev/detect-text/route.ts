import { NextRequest, NextResponse } from 'next/server';

import {
  detectAllText,
  filterAnswerRevealingRegions,
} from '@/lib/vision/text-detection';

/**
 * Dev-only API endpoint for on-demand text detection on album covers.
 * POST /api/dev/detect-text
 * Body: { imageUrl: string, albumTitle: string, artistName: string, threshold?: number }
 */
export async function POST(request: NextRequest) {
  // Guard: only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as {
      imageUrl?: string;
      albumTitle?: string;
      artistName?: string;
      threshold?: number;
    };

    const { imageUrl, albumTitle, artistName, threshold = 0.5 } = body;

    if (!imageUrl || !albumTitle || !artistName) {
      return NextResponse.json(
        { error: 'Missing required fields: imageUrl, albumTitle, artistName' },
        { status: 400 }
      );
    }

    // Run full detection pipeline
    const allText = await detectAllText(imageUrl);

    if (allText === null) {
      return NextResponse.json(
        { error: 'Text detection failed — check Cloud Vision credentials' },
        { status: 500 }
      );
    }

    // Filter for answer-revealing regions
    const { regions, details } = filterAnswerRevealingRegions(
      allText,
      albumTitle,
      artistName,
      threshold
    );

    return NextResponse.json({
      raw: allText,
      filtered: details,
      regions,
      summary: {
        totalDetected: allText.length,
        keptCount: regions.length,
        discardedCount: details.filter(d => !d.kept).length,
      },
    });
  } catch (error) {
    console.error('[dev/detect-text] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
