'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang='en'>
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          backgroundColor: '#000',
          color: '#fff',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 420, padding: '0 24px' }}>
          {/* Scratched vinyl graphic */}
          <div
            style={{
              fontSize: 120,
              lineHeight: 1,
              marginBottom: 8,
              filter: 'grayscale(0.3)',
            }}
          >
            💿
          </div>
          <p
            style={{
              fontSize: 14,
              color: '#71717a',
              marginBottom: 24,
              fontStyle: 'italic',
            }}
          >
            &ldquo;I used to be a perfectly good app, then I took a scratch to
            the disc.&rdquo;
          </p>

          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              marginBottom: 8,
              color: '#fff',
            }}
          >
            Something skipped a beat
          </h1>
          <p style={{ fontSize: 15, color: '#a1a1aa', marginBottom: 32 }}>
            Don&apos;t worry, just give the record a flip.
          </p>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <button
              onClick={() => reset()}
              style={{
                backgroundColor: '#16a34a',
                color: '#fff',
                border: 'none',
                padding: '14px 24px',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            <button
              onClick={() => (window.location.href = '/')}
              style={{
                backgroundColor: '#27272a',
                color: '#fff',
                border: '1px solid #3f3f46',
                padding: '14px 24px',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Go home
            </button>
          </div>

          {error.digest && (
            <p
              style={{
                fontSize: 11,
                color: '#52525b',
                marginTop: 24,
              }}
            >
              Error ID: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
