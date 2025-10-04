import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cacheArtistImage } from '@/lib/cloudflare-images';

/**
 * POST /api/artists/[id]/cache-image
 * Cache artist image from external URL to Cloudflare Images CDN
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch artist from database
    const artist = await prisma.artist.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        cloudflareImageId: true,
      },
    });

    if (!artist) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
    }

    // If already cached, return existing ID
    if (artist.cloudflareImageId && artist.cloudflareImageId !== 'none') {
      return NextResponse.json({
        success: true,
        cached: true,
        cloudflareImageId: artist.cloudflareImageId,
      });
    }

    // If no image URL, mark as 'none'
    if (!artist.imageUrl) {
      await prisma.artist.update({
        where: { id },
        data: { cloudflareImageId: 'none' },
      });
      return NextResponse.json({
        success: true,
        message: 'No image URL available',
      });
    }

    // Cache the image
    const result = await cacheArtistImage(
      artist.imageUrl,
      artist.id,
      artist.name
    );

    if (!result) {
      await prisma.artist.update({
        where: { id },
        data: { cloudflareImageId: 'none' },
      });
      return NextResponse.json({
        success: true,
        message: 'Failed to cache image',
      });
    }

    // Update database with Cloudflare image ID
    await prisma.artist.update({
      where: { id },
      data: { cloudflareImageId: result.id },
    });

    return NextResponse.json({
      success: true,
      cloudflareImageId: result.id,
      cloudflareUrl: result.url,
    });
  } catch (error) {
    console.error('Error caching artist image:', error);
    return NextResponse.json(
      { error: 'Failed to cache artist image' },
      { status: 500 }
    );
  }
}
