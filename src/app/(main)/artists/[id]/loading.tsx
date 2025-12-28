import { ArrowLeft, User } from 'lucide-react';
import Link from 'next/link';

export default function ArtistLoading() {
  return (
    <div className='min-h-screen bg-black text-white'>
      <div className='container mx-auto px-4 py-8'>
        {/* Back Navigation */}
        <Link
          href='/home-mosaic'
          className='inline-flex items-center text-zinc-400 hover:text-white mb-6 transition-colors'
        >
          <ArrowLeft className='h-4 w-4 mr-2' />
          Back to Search
        </Link>

        {/* Artist Header Skeleton */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8'>
          {/* Artist Image Skeleton */}
          <div className='lg:col-span-1'>
            <div className='relative aspect-square w-full max-w-md mx-auto bg-zinc-800 rounded-lg flex items-center justify-center'>
              <User className='h-24 w-24 text-zinc-600 animate-pulse' />
            </div>
          </div>

          {/* Artist Info Skeleton */}
          <div className='lg:col-span-2 space-y-6'>
            <div>
              <div className='h-12 w-3/4 bg-zinc-800 rounded animate-pulse mb-2'></div>
              <div className='h-6 w-24 bg-zinc-800 rounded animate-pulse mb-4'></div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {/* Biography skeleton */}
              <div className='md:col-span-2'>
                <div className='h-6 w-24 bg-zinc-800 rounded animate-pulse mb-2'></div>
                <div className='space-y-2'>
                  <div className='h-4 w-full bg-zinc-800 rounded animate-pulse'></div>
                  <div className='h-4 w-full bg-zinc-800 rounded animate-pulse'></div>
                  <div className='h-4 w-3/4 bg-zinc-800 rounded animate-pulse'></div>
                </div>
              </div>

              {/* Info items skeleton */}
              {[...Array(2)].map((_, i) => (
                <div key={i} className='flex items-center space-x-2'>
                  <div className='h-5 w-5 bg-zinc-800 rounded animate-pulse'></div>
                  <div className='h-5 flex-1 bg-zinc-800 rounded animate-pulse'></div>
                </div>
              ))}

              {/* Aliases skeleton */}
              <div className='md:col-span-2'>
                <div className='h-6 w-32 bg-zinc-800 rounded animate-pulse mb-2'></div>
                <div className='flex flex-wrap gap-2'>
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className='h-8 w-20 bg-zinc-800 rounded-full animate-pulse'
                    ></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Skeleton */}
        <div className='w-full'>
          <div className='grid grid-cols-4 bg-zinc-900 rounded-lg p-1 mb-6'>
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className='h-10 bg-zinc-800 rounded animate-pulse mx-1'
              ></div>
            ))}
          </div>

          {/* Tab Content Skeleton */}
          <div className='bg-zinc-900 rounded-lg p-6'>
            <div className='h-6 w-32 bg-zinc-800 rounded animate-pulse mb-4'></div>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
              {[...Array(6)].map((_, i) => (
                <div key={i} className='space-y-3'>
                  <div className='h-48 bg-zinc-800 rounded-lg animate-pulse'></div>
                  <div className='h-4 bg-zinc-800 rounded animate-pulse'></div>
                  <div className='h-3 w-3/4 bg-zinc-800 rounded animate-pulse'></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Loading message */}
        <div className='fixed bottom-8 right-8 bg-zinc-900 rounded-lg px-4 py-2 border border-zinc-800'>
          <div className='flex items-center space-x-2'>
            <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-red-500'></div>
            <span className='text-zinc-400 text-sm'>
              Loading artist details...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
