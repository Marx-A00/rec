'use client';

interface ImageLoaderProps {
  src: string;
  width: number;
  quality?: number;
}

export default function cloudflareLoader({ src, width, quality }: ImageLoaderProps) {
  // If it's already a Cloudflare Images URL, modify it with the desired parameters
  if (src.includes('imagedelivery.net')) {
    // Extract the base URL and image ID
    const urlParts = src.match(/^(https:\/\/imagedelivery\.net\/[^\/]+\/[^\/]+)\/(.*?)(\?.*)?$/);

    if (urlParts) {
      const baseUrl = urlParts[1];
      const variant = urlParts[2] || 'public';

      // Build new URL with width parameter
      const params = new URLSearchParams();
      params.set('w', width.toString());
      if (quality) {
        params.set('q', quality.toString());
      }

      return `${baseUrl}/${variant}?${params.toString()}`;
    }
  }

  // For non-Cloudflare URLs, return as-is (Next.js will handle them normally)
  return src;
}