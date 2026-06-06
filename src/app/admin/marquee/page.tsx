'use client';

import Link from 'next/link';
import { ExternalLink, GalleryHorizontalEnd } from 'lucide-react';

import { MarqueeManager } from '@/components/admin/marquee/MarqueeManager';

export default function MarqueePage() {
  return (
    <div className='p-8'>
      {/* Header */}
      <div className='mb-8'>
        <div className='flex items-center gap-3 mb-2'>
          <GalleryHorizontalEnd className='h-8 w-8 text-purple-500' />
          <h1 className='text-3xl font-bold text-white'>Marquee</h1>
        </div>
        <p className='text-zinc-400 mt-1'>
          Curate the album covers shown in the landing page gallery
        </p>
        <div className='mt-3 flex items-center gap-4'>
          <Link
            href='/'
            className='inline-flex items-center gap-1.5 text-sm text-purple-400 hover:text-purple-300'
          >
            View landing page <ExternalLink className='h-3.5 w-3.5' />
          </Link>
        </div>
      </div>

      <MarqueeManager />
    </div>
  );
}
