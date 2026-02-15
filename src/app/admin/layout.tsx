// src/app/admin/layout.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

import { isAdmin } from '@/lib/permissions';
import { UserAvatar } from '@/components/navigation/UserAvatar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'loading') return;

    // Check if user is authenticated
    if (!session?.user) {
      router.push('/signin');
      return;
    }

    // Admin access restricted to ADMIN and OWNER roles
    if (!isAdmin(session.user.role)) {
      router.push('/home-mosaic'); // Redirect to home if not admin or owner
    }
  }, [session, status, router]);

  // Show loading state while checking auth
  if (status === 'loading') {
    return (
      <div className='min-h-screen bg-black flex items-center justify-center'>
        <div className='text-white'>Loading...</div>
      </div>
    );
  }

  // Don't render admin UI if not authenticated
  if (!session?.user) {
    return null;
  }

  return (
    <div className='min-h-screen bg-black'>
      <div className='flex'>
        {/* Sidebar */}
        <aside className='w-64 bg-zinc-950 border-r border-zinc-800'>
          <div className='p-6 border-b border-zinc-800 space-y-4'>
            <h2 className='text-xl font-bold text-white'>Admin Dashboard</h2>
            <UserAvatar />
          </div>
          <nav className='px-4 py-6'>
            <Link
              href='/admin'
              className={`flex items-center px-4 py-2 mb-1 rounded-lg transition-colors ${
                pathname === '/admin'
                  ? 'text-white bg-zinc-800'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <span>Overview</span>
            </Link>
            <Link
              href='/admin/queue'
              className={`flex items-center px-4 py-2 mb-1 rounded-lg transition-colors ${
                pathname === '/admin/queue'
                  ? 'text-white bg-zinc-800'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <span>Queue Management</span>
            </Link>
            <Link
              href='/admin/music-database'
              className={`flex items-center px-4 py-2 mb-1 rounded-lg transition-colors ${
                pathname === '/admin/music-database'
                  ? 'text-white bg-zinc-800'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <span>Music Database</span>
            </Link>
            <Link
              href='/admin/game-pool'
              className={`flex items-center px-4 py-2 mb-1 rounded-lg transition-colors ${
                pathname === '/admin/game-pool'
                  ? 'text-white bg-zinc-800'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <span>Game Pool</span>
            </Link>
            <Link
              href='/admin/job-history'
              className={`flex items-center px-4 py-2 mb-1 rounded-lg transition-colors ${
                pathname === '/admin/job-history'
                  ? 'text-white bg-zinc-800'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <span>Job History</span>
            </Link>
            <Link
              href='/admin/weekly-sync'
              className={`flex items-center px-4 py-2 mb-1 rounded-lg transition-colors ${
                pathname === '/admin/weekly-sync'
                  ? 'text-white bg-zinc-800'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <span>Weekly Sync</span>
            </Link>
            <Link
              href='/admin/users'
              className={`flex items-center px-4 py-2 mb-1 rounded-lg transition-colors ${
                pathname === '/admin/users'
                  ? 'text-white bg-zinc-800'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <span>Users</span>
            </Link>
            <Link
              href='/admin/analytics'
              className={`flex items-center px-4 py-2 mb-1 rounded-lg transition-colors ${
                pathname === '/admin/analytics'
                  ? 'text-white bg-zinc-800'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <span>Analytics</span>
            </Link>
            <Link
              href='/admin/testing'
              className={`flex items-center px-4 py-2 mb-1 rounded-lg transition-colors ${
                pathname === '/admin/testing'
                  ? 'text-white bg-zinc-800'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <span>Testing</span>
            </Link>
            <Link
              href='/admin/help'
              className={`flex items-center px-4 py-2 mb-1 rounded-lg transition-colors ${
                pathname === '/admin/help'
                  ? 'text-white bg-zinc-800'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <span>Help</span>
            </Link>
            <hr className='my-4 border-zinc-800' />
            <Link
              href='/home-mosaic'
              className='flex items-center px-4 py-2 text-zinc-400 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors'
            >
              <span>← Back to App</span>
            </Link>
          </nav>
        </aside>

        {/* Main content */}
        <main className='flex-1 bg-zinc-950'>{children}</main>
      </div>
    </div>
  );
}
