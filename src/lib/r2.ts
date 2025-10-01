import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// R2 client configuration
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'rec-images';
const PUBLIC_URL = process.env.R2_PUBLIC_URL || `https://pub-${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.dev`;

// File type configurations
export const IMAGE_TYPES = {
  albumArt: 'album-art',
  userAvatar: 'user-avatars',
  userUploads: 'user-uploads',
} as const;

type ImageType = typeof IMAGE_TYPES[keyof typeof IMAGE_TYPES];

// Helper to generate file key
function generateFileKey(type: ImageType, fileName: string): string {
  const timestamp = Date.now();
  const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '-');
  return `${type}/${timestamp}-${cleanFileName}`;
}

// Upload image to R2
export async function uploadImage(
  file: Buffer | Uint8Array,
  fileName: string,
  type: ImageType,
  contentType: string = 'image/webp'
): Promise<{ url: string; key: string }> {
  const key = generateFileKey(type, fileName);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: contentType,
    // Optional: Add cache control headers
    CacheControl: 'public, max-age=31536000', // 1 year cache
  });

  await r2Client.send(command);

  // Return public URL
  const url = `${PUBLIC_URL}/${key}`;

  return { url, key };
}

// Generate presigned URL for direct browser uploads
export async function getUploadPresignedUrl(
  fileName: string,
  type: ImageType,
  contentType: string = 'image/webp'
): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
  const key = generateFileKey(type, fileName);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  // Generate presigned URL valid for 1 hour
  const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
  const publicUrl = `${PUBLIC_URL}/${key}`;

  return { uploadUrl, publicUrl, key };
}

// Delete image from R2
export async function deleteImage(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await r2Client.send(command);
}

// Download image from URL and upload to R2 (for caching external images)
export async function cacheExternalImage(
  imageUrl: string,
  type: ImageType,
  identifier: string
): Promise<{ url: string; key: string } | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    return await uploadImage(
      new Uint8Array(buffer),
      `${identifier}.${contentType.split('/')[1]}`,
      type,
      contentType
    );
  } catch (error) {
    console.error('Failed to cache external image:', error);
    return null;
  }
}

// Helper to get image URL with fallback
export async function getImageUrl(
  storedUrl: string | null,
  externalUrl: string | null,
  fallback: string = '/placeholder-album.png'
): Promise<string> {
  // Priority: Our R2 storage -> External URL -> Fallback
  if (storedUrl) return storedUrl;
  if (externalUrl) return externalUrl;
  return fallback;
}