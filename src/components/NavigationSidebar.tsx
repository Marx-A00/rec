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
            className='group relative w-12 h-12 flex items-center justify-center rounded-lg hover:bg-zinc-800 transition-colors group'
            aria-label='Home'
            aria-describedby='home-tooltip'
          >
            <Home className='w-6 h-6 text-zinc-400 group-hover:text-cosmic-latte transition-colors duration-200' />
            <span
              id='home-tooltip'
              className='absolute left-full ml-2 opacity-0 group-hover:opacity-100 group-focus:opacity-100 bg-zinc-800 text-white rounded-md px-3 py-2 text-sm whitespace-nowrap transition-opacity duration-200 pointer-events-none z-50'
              role='tooltip'
            >
              Home
              <div className='absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-full w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-zinc-800'></div>
            </span>
          </button>
        </Link>

        {/* Browse */}
        <Link href='/browse'>
          <button
            className='group relative w-12 h-12 flex items-center justify-center rounded-lg hover:bg-zinc-800 transition-colors group'
            aria-label='Browse'
            aria-describedby='browse-sidebar-tooltip'
          >
            <Search className='w-6 h-6 text-zinc-400 group-hover:text-cosmic-latte transition-colors duration-200' />
            <span
              id='browse-sidebar-tooltip'
              className='absolute left-full ml-2 opacity-0 group-hover:opacity-100 group-focus:opacity-100 bg-zinc-800 text-white rounded-md px-3 py-2 text-sm whitespace-nowrap transition-opacity duration-200 pointer-events-none z-50'
              role='tooltip'
            >
              Browse & Discover
              <div className='absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-full w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-zinc-800'></div>
            </span>
          </button>
        </Link>

        {/* Recommend */}
        <Link href='/recommend'>
          <button
            className='group relative w-12 h-12 flex items-center justify-center rounded-lg hover:bg-zinc-800 transition-colors group'
            aria-label='Recommend'
            aria-describedby='recommend-sidebar-tooltip'
          >
            <Music className='w-6 h-6 text-zinc-400 group-hover:text-cosmic-latte transition-colors duration-200' />
            <span
              id='recommend-sidebar-tooltip'
              className='absolute left-full ml-2 opacity-0 group-hover:opacity-100 group-focus:opacity-100 bg-zinc-800 text-white rounded-md px-3 py-2 text-sm whitespace-nowrap transition-opacity duration-200 pointer-events-none z-50'
              role='tooltip'
            >
              Create Recommendation
              <div className='absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-full w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-zinc-800'></div>
            </span>
          </button>
        </Link>

        {/* Collections */}
        <Link href='/collections'>
          <button
            className='group relative w-12 h-12 flex items-center justify-center rounded-lg hover:bg-zinc-800 transition-colors group'
            aria-label='Collections'
            aria-describedby='collections-tooltip'
          >
            <BookOpen className='w-6 h-6 text-zinc-400 group-hover:text-cosmic-latte transition-colors duration-200' />
            <span
              id='collections-tooltip'
              className='absolute left-full ml-2 opacity-0 group-hover:opacity-100 group-focus:opacity-100 bg-zinc-800 text-white rounded-md px-3 py-2 text-sm whitespace-nowrap transition-opacity duration-200 pointer-events-none z-50'
              role='tooltip'
            >
              My Collections
              <div className='absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-full w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-zinc-800'></div>
            </span>
          </button>
        </Link>

        {/* Profile */}
        <Link href='/profile'>
          <button
            className='group relative w-12 h-12 flex items-center justify-center rounded-lg hover:bg-zinc-800 transition-colors group'
            aria-label='Profile'
            aria-describedby='profile-tooltip'
          >
            <User className='w-6 h-6 text-zinc-400 group-hover:text-cosmic-latte transition-colors duration-200' />
            <span
              id='profile-tooltip'
              className='absolute left-full ml-2 opacity-0 group-hover:opacity-100 group-focus:opacity-100 bg-zinc-800 text-white rounded-md px-3 py-2 text-sm whitespace-nowrap transition-opacity duration-200 pointer-events-none z-50'
              role='tooltip'
            >
              My Profile
              <div className='absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-full w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-zinc-800'></div>
            </span>
          </button>
        </Link>

        {/* Trending/Discover */}
        <Link href='/discover'>
          <button
            className='group relative w-12 h-12 flex items-center justify-center rounded-lg hover:bg-zinc-800 transition-colors group'
            aria-label='Discover'
            aria-describedby='discover-tooltip'
          >
            <TrendingUp className='w-6 h-6 text-zinc-400 group-hover:text-cosmic-latte transition-colors duration-200' />
            <span
              id='discover-tooltip'
              className='absolute left-full ml-2 opacity-0 group-hover:opacity-100 group-focus:opacity-100 bg-zinc-800 text-white rounded-md px-3 py-2 text-sm whitespace-nowrap transition-opacity duration-200 pointer-events-none z-50'
              role='tooltip'
            >
              Trending & Discovery
              <div className='absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-full w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-zinc-800'></div>
            </span>
          </button>
        </Link>
      </div>
    </div>
  );
}
