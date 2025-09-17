// src/app/admin/layout.tsx
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/../auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // TODO: Add proper admin role check
  // For now, just check if user is authenticated
  if (!session?.user) {
    redirect('/signin');
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-zinc-950 border-r border-zinc-800">
          <div className="p-6 border-b border-zinc-800">
            <h2 className="text-xl font-bold text-white">Admin Dashboard</h2>
          </div>
          <nav className="px-4 py-6">
            <Link href="/admin" className="flex items-center px-4 py-2 mb-1 text-white bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors">
              <span>Overview</span>
            </Link>
            <Link href="/admin/queue" className="flex items-center px-4 py-2 mb-1 text-zinc-400 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors">
              <span>Queue Management</span>
            </Link>
            <Link href="/admin/music-database" className="flex items-center px-4 py-2 mb-1 text-zinc-400 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors">
              <span>Music Database</span>
            </Link>
            <Link href="/admin/job-history" className="flex items-center px-4 py-2 mb-1 text-zinc-400 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors">
              <span>Job History</span>
            </Link>
            <Link href="/admin/alerts" className="flex items-center px-4 py-2 mb-1 text-zinc-400 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors">
              <span>Alerts</span>
            </Link>
            <Link href="/admin/users" className="flex items-center px-4 py-2 mb-1 text-zinc-400 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors">
              <span>Users</span>
            </Link>
            <hr className="my-4 border-zinc-800" />
            <Link href="/" className="flex items-center px-4 py-2 text-zinc-400 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors">
              <span>← Back to App</span>
            </Link>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 bg-zinc-950">
          {children}
        </main>
      </div>
    </div>
  );
}