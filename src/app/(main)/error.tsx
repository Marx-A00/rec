'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Main app error:', error);
  }, [error]);

  return (
    <div className='min-h-screen bg-black text-white'>
      <div className='container mx-auto px-4 py-8'>
        <div className='text-center max-w-lg mx-auto'>
          <h1 className='text-3xl font-bold text-red-500 mb-4'>
            Oops! Something went wrong
          </h1>
          <p className='text-zinc-400 mb-6'>
            We encountered an error while loading this page. This could be a
            temporary issue.
          </p>
          {error.digest && (
            <p className='text-xs text-zinc-500 mb-6'>
              Error ID: {error.digest}
            </p>
          )}
          <div className='space-y-3'>
            <button
              onClick={() => reset()}
              className='w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-medium transition-colors mr-0 sm:mr-4 mb-3 sm:mb-0'
            >
              Try again
            </button>
            <Link
              href='/'
              className='block sm:inline-block w-full sm:w-auto bg-zinc-700 hover:bg-zinc-600 text-white px-8 py-3 rounded-lg font-medium transition-colors text-center'
            >
              Go home
            </Link>
          </div>

          {/* Additional navigation options */}
          <div className='mt-8 pt-8 border-t border-zinc-800'>
            <p className='text-zinc-500 text-sm mb-4'>Or try browsing:</p>
            <div className='flex flex-wrap gap-2 justify-center'>
              <Link
                href='/browse'
                className='text-blue-400 hover:text-blue-300 text-sm hover:underline'
              >
                Browse
              </Link>
              <span className='text-zinc-600'>•</span>
              <Link
                href='/recommend'
                className='text-blue-400 hover:text-blue-300 text-sm hover:underline'
              >
                Recommend
              </Link>
              <span className='text-zinc-600'>•</span>
              <Link
                href='/profile'
                className='text-blue-400 hover:text-blue-300 text-sm hover:underline'
              >
                Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
