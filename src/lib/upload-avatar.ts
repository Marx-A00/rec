import { getImageUrl } from '@/lib/cloudflare-images';

/**
 * Upload an avatar blob to the image upload API and return the Cloudflare delivery URL.
 */
export async function uploadAvatar(blob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append(
    'file',
    new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
  );
  formData.append('type', 'avatar');

  const res = await fetch('/api/images/upload', {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();

  if (!data.success) {
    throw new Error(data.error || 'Avatar upload failed');
  }

  return getImageUrl(data.id, { width: 200, height: 200 });
}
