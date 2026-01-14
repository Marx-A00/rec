// src/app/icon.tsx
import { ImageResponse } from 'next/og';
import { readFileSync } from 'fs';
import { join } from 'path';

// Image metadata
export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

// Image generation
export default function Icon() {
  const isDev = process.env.NODE_ENV === 'development';

  // In development, serve the custom dev favicon
  if (isDev) {
    try {
      const iconPath = join(process.cwd(), 'public', 'favicon-256.png');
      const iconBuffer = readFileSync(iconPath);
      return new Response(iconBuffer, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-cache',
        },
      });
    } catch {
      // Fallback to generated icon if file not found
    }
  }

  // Production: generated icon
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          background: '#1f2937',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#f3f4f6',
          fontWeight: 'bold',
          borderRadius: '4px',
        }}
      >
        R
      </div>
    ),
    {
      ...size,
    }
  );
}
