'use client';

import { useEffect, useState } from 'react';

const ERROR_QUOTES = [
  'I used to be a perfectly good app, then I took a scratch to the disc.',
  'In Soviet Russia, error finds you.',
  'This is fine. \u2615\uFE0F\uD83D\uDD25',
  'You shall not pass!\u2026 this error boundary, apparently.',
  'Have you tried turning it off and on again?',
  'Error 💿: vibe check failed.',
  'Task failed successfully.',
  'It\u2019s not a bug, it\u2019s an unplanned feature.',
  'DJ Khaled voice: Another one. (error)',
  'The app said \u201Caight imma head out.\u201D',
  '404 vibes found, 0 pages loaded.',
  'Somebody once told me the server was gonna crash me\u2026',
];

function getRandomQuote() {
  return ERROR_QUOTES[Math.floor(Math.random() * ERROR_QUOTES.length)];
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [quote] = useState(getRandomQuote);

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
            &ldquo;{quote}&rdquo;
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
