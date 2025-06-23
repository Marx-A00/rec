'use client';

import { Home, Search, User, Music, BookOpen, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function NavigationSidebar() {
  return (
    <div className='fixed left-0 top-20 w-16 h-full bg-zinc-900/95 shadow-md z-40 hidden md:block'>
      <div className='flex flex-col gap-3 p-2'>
        {/* Home */}
        <Link href='/'>
          <button
            className='w-12 h-12 flex items-center justify-center rounded-lg hover:bg-zinc-800 transition-colors group'
            aria-label='Home'
          >
            <Home className='w-6 h-6 text-zinc-400 group-hover:text-cosmic-latte' />
          </button>
        </Link>

        {/* Browse */}
        <Link href='/browse'>
          <button
            className='w-12 h-12 flex items-center justify-center rounded-lg hover:bg-zinc-800 transition-colors group'
            aria-label='Browse'
          >
            <Search className='w-6 h-6 text-zinc-400 group-hover:text-cosmic-latte' />
          </button>
        </Link>

        {/* Recommend */}
        <Link href='/recommend'>
          <button
            className='w-12 h-12 flex items-center justify-center rounded-lg hover:bg-zinc-800 transition-colors group'
            aria-label='Recommend'
          >
            <Music className='w-6 h-6 text-zinc-400 group-hover:text-cosmic-latte' />
          </button>
        </Link>

        {/* Collections */}
        <Link href='/collections'>
          <button
            className='w-12 h-12 flex items-center justify-center rounded-lg hover:bg-zinc-800 transition-colors group'
            aria-label='Collections'
          >
            <BookOpen className='w-6 h-6 text-zinc-400 group-hover:text-cosmic-latte' />
          </button>
        </Link>

        {/* Profile */}
        <Link href='/profile'>
          <button
            className='w-12 h-12 flex items-center justify-center rounded-lg hover:bg-zinc-800 transition-colors group'
            aria-label='Profile'
          >
            <User className='w-6 h-6 text-zinc-400 group-hover:text-cosmic-latte' />
          </button>
        </Link>

        {/* Trending/Discover */}
        <Link href='/discover'>
          <button
            className='w-12 h-12 flex items-center justify-center rounded-lg hover:bg-zinc-800 transition-colors group'
            aria-label='Discover'
          >
            <TrendingUp className='w-6 h-6 text-zinc-400 group-hover:text-cosmic-latte' />
          </button>
        </Link>
      </div>
    </div>
  );
}
