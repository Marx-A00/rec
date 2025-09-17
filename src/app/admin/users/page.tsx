'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Users, Music, Calendar, ExternalLink } from 'lucide-react';
import { useAdminUsersQuery } from '@/hooks/useAdminUsersQuery';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { data, isLoading, error } = useAdminUsersQuery(page, 20, search);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-cosmic-latte mb-2">Users Management</h1>
        <p className="text-zinc-400">Manage and monitor user accounts</p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-5 h-5" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search users by name or email..."
          className="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emeraled-green focus:border-transparent"
        />
      </form>

      {/* Stats Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-zinc-800 p-4 rounded-lg border border-zinc-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Total Users</p>
                <p className="text-2xl font-bold text-cosmic-latte">{data.totalCount}</p>
              </div>
              <Users className="w-8 h-8 text-emeraled-green" />
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-900 border-b border-zinc-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-4 text-center text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Collections
                </th>
                <th className="px-6 py-4 text-center text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Recommendations
                </th>
                <th className="px-6 py-4 text-center text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Followers
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-4 text-center text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emeraled-green"></div>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-red-400">
                    Error loading users: {error.message}
                  </td>
                </tr>
              ) : data?.users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-zinc-400">
                    No users found
                  </td>
                </tr>
              ) : (
                data?.users.map((user) => (
                  <tr key={user.id} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.image || undefined} alt={user.name || 'User'} />
                          <AvatarFallback className="bg-zinc-700 text-zinc-300">
                            {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-cosmic-latte">
                            {user.name || 'Unnamed User'}
                          </div>
                          <div className="text-xs text-zinc-400">
                            ID: {user.id.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-zinc-300">{user.email || 'No email'}</div>
                      {user.emailVerified && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emeraled-green/20 text-emeraled-green">
                          Verified
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-zinc-300">{user._count?.collections || 0}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-zinc-300">{user._count?.recommendations || 0}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-zinc-300">{user.followersCount || 0}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-zinc-400">
                        <Calendar className="w-4 h-4 mr-1" />
                        {user.profileUpdatedAt ? formatDate(user.profileUpdatedAt) : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <Link
                        href={`/profile/${user.id}`}
                        className="inline-flex items-center px-3 py-1 text-xs font-medium text-emeraled-green hover:text-emeraled-green/80 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View Profile
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalCount > 20 && (
          <div className="bg-zinc-900 px-6 py-4 border-t border-zinc-700 flex items-center justify-between">
            <div className="text-sm text-zinc-400">
              Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, data.totalCount)} of {data.totalCount} users
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * 20 >= data.totalCount}
                className="px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}