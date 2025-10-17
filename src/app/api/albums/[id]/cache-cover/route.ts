import { NextResponse } from 'next/server';

import { cacheAlbumArt } from '@/lib/cloudflare-images';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: 'Album ID is required' },
      { status: 400 }
    );
  }

  try {
    // Fetch album from database
    const album = await prisma.album.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        coverArtUrl: true,
        cloudflareImageId: true,
      },
    });

    if (!album) {
      return NextResponse.json({ error: 'Album not found' }, { status: 404 });
    }

    // Check if already cached
    if (album.cloudflareImageId && album.cloudflareImageId !== 'none') {
      return NextResponse.json({
        success: true,
        cached: true,
        cloudflareImageId: album.cloudflareImageId,
        message: 'Album art already cached',
      });
    }

    // Check if we have a cover art URL to cache
    if (!album.coverArtUrl) {
      // Mark as 'none' to prevent repeated attempts
      await prisma.album.update({
        where: { id },
        data: { cloudflareImageId: 'none' },
      });

      return NextResponse.json(
        { error: 'No cover art URL available for this album' },
        { status: 404 }
      );
    }

    // Upload to Cloudflare
    const result = await cacheAlbumArt(
      album.coverArtUrl,
      album.id,
      album.title
    );

    if (!result) {
      // Mark as 'none' if upload failed (e.g., 404 from CAA)
      await prisma.album.update({
        where: { id },
        data: { cloudflareImageId: 'none' },
      });

      return NextResponse.json(
        { error: 'Failed to cache album art' },
        { status: 500 }
      );
    }

    // Update database with Cloudflare image ID
    await prisma.album.update({
      where: { id },
      data: { cloudflareImageId: result.id },
    });

    return NextResponse.json({
      success: true,
      cached: false,
      cloudflareImageId: result.id,
      cloudflareUrl: result.url,
      message: 'Album art cached successfully',
    });
  } catch (error) {
    console.error('Error caching album art:', error);
    return NextResponse.json(
      {
        error: 'Failed to cache album art',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
