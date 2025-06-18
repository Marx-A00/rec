'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Root level error:', error);
  }, [error]);

  return (
    <div className='min-h-screen bg-black text-white flex items-center justify-center'>
      <div className='text-center max-w-md mx-auto px-6'>
        <h1 className='text-3xl font-bold text-red-500 mb-4'>
          Something went wrong!
        </h1>
        <p className='text-zinc-400 mb-6'>
          An unexpected error occurred. Please try again or contact support if
          the problem persists.
        </p>
        {error.digest && (
          <p className='text-xs text-zinc-500 mb-6'>Error ID: {error.digest}</p>
        )}
        <div className='space-y-3'>
          <button
            onClick={() => reset()}
            className='w-full bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors'
          >
            Try again
          </button>
          <button
            onClick={() => (window.location.href = '/')}
            className='w-full bg-zinc-700 hover:bg-zinc-600 text-white px-6 py-3 rounded-lg font-medium transition-colors'
          >
            Go to home
          </button>
        </div>
      </div>
    </div>
  );
}
