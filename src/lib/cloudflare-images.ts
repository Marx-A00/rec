// Cloudflare Images API wrapper
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!;
const DELIVERY_URL = process.env.CLOUDFLARE_IMAGES_DELIVERY_URL || `https://imagedelivery.net/${process.env.CLOUDFLARE_IMAGES_ACCOUNT_HASH}`;

const API_BASE_URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/images/v1`;
// TODO: add images for albums to cloudflare
// TODO: Think about monitoring who can upload images and shit
export type ImageVariant = 'thumbnail' | 'small' | 'medium' | 'large' | 'public';

// Upload image from URL (for caching external images)
export async function uploadImageFromUrl(
  url: string,
  id?: string,
  metadata?: Record<string, string>
) {
  const formData = new FormData();
  formData.append('url', url);
  if (id) formData.append('id', id);
  if (metadata) {
    formData.append('metadata', JSON.stringify(metadata));
  }

  const response = await fetch(API_BASE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
    },
    body: formData,
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.errors?.[0]?.message || 'Failed to upload image');
  }

  return {
    id: data.result.id,
    url: `${DELIVERY_URL}/${data.result.id}/public`,
    variants: data.result.variants,
  };
}

// Upload image from file/blob
export async function uploadImageFromFile(
  file: File | Blob,
  id?: string,
  metadata?: Record<string, string>
) {
  const formData = new FormData();
  formData.append('file', file);
  if (id) formData.append('id', id);
  if (metadata) {
    formData.append('metadata', JSON.stringify(metadata));
  }

  const response = await fetch(API_BASE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
    },
    body: formData,
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.errors?.[0]?.message || 'Failed to upload image');
  }

  return {
    id: data.result.id,
    url: `${DELIVERY_URL}/${data.result.id}/public`,
    variants: data.result.variants,
  };
}

// Get direct upload URL (for client-side uploads)
export async function getDirectUploadUrl() {
  const response = await fetch(`${API_BASE_URL}/direct_upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
    },
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.errors?.[0]?.message || 'Failed to get upload URL');
  }

  return {
    uploadURL: data.result.uploadURL,
    id: data.result.id,
  };
}

// Delete image
export async function deleteImage(imageId: string) {
  const response = await fetch(`${API_BASE_URL}/${imageId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
    },
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.errors?.[0]?.message || 'Failed to delete image');
  }

  return true;
}

// Helper to get image URL with specific dimensions
export function getImageUrl(
  imageId: string,
  options?: {
    width?: number;
    height?: number;
    variant?: ImageVariant;
    format?: 'auto' | 'webp' | 'avif' | 'json';
    quality?: number;
    blur?: number;
  }
) {
  if (!imageId) return '/placeholder-album.png';

  // Fallback if DELIVERY_URL is not set properly
  const deliveryUrl = DELIVERY_URL || `https://imagedelivery.net/F-PXhcq4KOZZUABhQIYZ4Q`;

  // Use variant if specified
  if (options?.variant) {
    return `${deliveryUrl}/${imageId}/${options.variant}`;
  }

  // Build custom transform URL
  const params = new URLSearchParams();
  if (options?.width) params.append('w', options.width.toString());
  if (options?.height) params.append('h', options.height.toString());
  if (options?.format) params.append('f', options.format);
  if (options?.quality) params.append('q', options.quality.toString());
  if (options?.blur) params.append('blur', options.blur.toString());

  const queryString = params.toString();
  return `${deliveryUrl}/${imageId}/public${queryString ? '?' + queryString : ''}`;
}

// Cache external album art
export async function cacheAlbumArt(
  externalUrl: string,
  albumId: string,
  albumTitle?: string
): Promise<string | null> {
  try {
    const result = await uploadImageFromUrl(
      externalUrl,
      `album-${albumId}`,
      {
        type: 'album-art',
        albumId,
        albumTitle: albumTitle || '',
      }
    );

    return result.url;
  } catch (error) {
    console.error('Failed to cache album art:', error);
    return null;
  }
}