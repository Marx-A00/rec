'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function PublicHeader() {
  const { data: session, status } = useSession();
  const isLoading = status === 'loading';
  const isAuthenticated = !!session?.user;

  return (
    <header className='fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-zinc-950/70 border-b border-zinc-800/50'>
      <div className='mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex h-16 items-center justify-between'>
          {/* Logo */}
          <Link href='/' className='flex items-center'>
            <span className='text-2xl font-bold bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent'>
              rec
            </span>
          </Link>

          {/* Navigation buttons */}
          <nav className='flex items-center gap-3'>
            {isLoading ? (
              // Loading skeleton
              <div className='flex items-center gap-3'>
                <div className='h-9 w-20 bg-zinc-800/50 rounded-md animate-pulse' />
                <div className='h-9 w-24 bg-zinc-800/50 rounded-md animate-pulse' />
              </div>
            ) : isAuthenticated ? (
              // Authenticated - show dashboard link
              <Button
                asChild
                variant='ghost'
                className='text-zinc-300 hover:text-white hover:bg-zinc-800/50'
              >
                <Link href='/browse' className='flex items-center gap-2'>
                  Go to Dashboard
                  <ArrowRight className='h-4 w-4' />
                </Link>
              </Button>
            ) : (
              // Not authenticated - show sign in / sign up
              <>
                <Button
                  asChild
                  variant='ghost'
                  className='text-zinc-300 hover:text-white hover:bg-zinc-800/50'
                >
                  <Link href='/signin'>Sign In</Link>
                </Button>
                <Button
                  asChild
                  className='bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium rounded-lg shadow-lg shadow-emerald-500/20'
                >
                  <Link href='/register'>Get Started</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
