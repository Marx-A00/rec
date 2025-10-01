import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import {
  uploadImageFromFile,
  uploadImageFromUrl,
  getDirectUploadUrl
} from '@/lib/cloudflare-images';
import { prisma } from '@/lib/prisma';

// Upload image from file
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';

    // Handle form data upload
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      const type = formData.get('type') as string; // 'avatar' | 'album'

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
      }

      // Max 10MB for Cloudflare Images
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
      }

      // Generate metadata
      const metadata: Record<string, string> = {
        userId: session.user.id,
        type: type || 'user-upload',
        uploadedAt: new Date().toISOString(),
      };

      // Upload to Cloudflare Images
      const result = await uploadImageFromFile(file, undefined, metadata);

      // Update user avatar if this is an avatar upload
      if (type === 'avatar') {
        await prisma.user.update({
          where: { id: session.user.id },
          data: { image: result.url }
        });
      }

      return NextResponse.json({
        success: true,
        id: result.id,
        url: result.url,
        variants: result.variants
      });
    }

    // Handle URL upload (for caching external images)
    const body = await request.json();
    const { url, type, albumId } = body;

    if (!url) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    }

    const metadata: Record<string, string> = {
      userId: session.user.id,
      type: type || 'cached-image',
      sourceUrl: url,
    };

    if (albumId) {
      metadata.albumId = albumId;
    }

    const result = await uploadImageFromUrl(url, undefined, metadata);

    return NextResponse.json({
      success: true,
      id: result.id,
      url: result.url,
      variants: result.variants
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload image' },
      { status: 500 }
    );
  }
}

// Get direct upload URL for client-side uploads
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get direct upload URL from Cloudflare
    const { uploadURL, id } = await getDirectUploadUrl();

    return NextResponse.json({
      uploadURL,
      id,
      // The final URL will be available after upload
      publicUrl: `${process.env.CLOUDFLARE_IMAGES_DELIVERY_URL}/${id}/public`
    });

  } catch (error) {
    console.error('Direct upload URL error:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}