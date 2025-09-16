// src/app/admin/layout.tsx
import { redirect } from 'next/navigation';
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h2>
          </div>
          <nav className="px-4 pb-6">
            <a href="/admin" className="flex items-center px-4 py-2 mb-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <span>Overview</span>
            </a>
            <a href="/admin/queue" className="flex items-center px-4 py-2 mb-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <span>Queue Management</span>
            </a>
            <a href="/admin/jobs" className="flex items-center px-4 py-2 mb-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <span>Job History</span>
            </a>
            <a href="/admin/alerts" className="flex items-center px-4 py-2 mb-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <span>Alerts</span>
            </a>
            <a href="/admin/users" className="flex items-center px-4 py-2 mb-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <span>Users</span>
            </a>
            <hr className="my-4 border-gray-200 dark:border-gray-700" />
            <a href="/" className="flex items-center px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <span>← Back to App</span>
            </a>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}