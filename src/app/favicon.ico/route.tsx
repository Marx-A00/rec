// src/app/favicon.ico/route.tsx
import { NextRequest } from 'next/server';
import { ImageResponse } from 'next/og';

export async function GET(request: NextRequest) {
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
      width: 32,
      height: 32,
    }
  );
}


