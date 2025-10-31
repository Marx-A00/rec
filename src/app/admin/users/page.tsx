'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Users,
  Music,
  Calendar,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Mail,
  Heart,
  Star,
  Info,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAdminUsersQuery } from '@/hooks/useAdminUsersQuery';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useUpdateUserRoleMutation, UserRole } from '@/generated/graphql';

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');

  const { data, isLoading, error, refetch } = useAdminUsersQuery(
    page,
    20,
    search
  );
  const updateUserRoleMutation = useUpdateUserRoleMutation();

  const toggleExpanded = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

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

  const handleOpenRoleModal = (user: any) => {
    setSelectedUser(user);
    setSelectedRole(user.role || 'USER');
    setRoleModalOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedUser || !selectedRole) return;

    try {
      const result = await updateUserRoleMutation.mutateAsync({
        userId: selectedUser.id,
        role: selectedRole as UserRole,
      });

      if (result.updateUserRole?.success) {
        toast.success(
          result.updateUserRole.message || 'Role updated successfully'
        );
        setRoleModalOpen(false);
        // Refresh the data
        await refetch();
      } else {
        throw new Error('Failed to update role');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user role');
    }
  };

  // Component for expanded user details
  const UserExpandedContent = ({ user }: { user: any }) => {
    return (
      <tr>
        <td colSpan={6} className='p-0 bg-zinc-900/30'>
          <div className='p-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200'>
            {/* User Info Grid */}
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
              <div>
                <div className='text-xs text-zinc-500 uppercase mb-1'>
                  User ID
                </div>
                <div className='text-sm text-zinc-300 font-mono'>{user.id}</div>
              </div>
              <div>
                <div className='text-xs text-zinc-500 uppercase mb-1'>Role</div>
                <div className='text-sm text-zinc-300 flex items-center gap-2'>
                  {(user.role === 'ADMIN' || user.role === 'OWNER') && (
                    <Shield className='h-3 w-3 text-emeraled-green' />
                  )}
                  {user.role || 'USER'}
                </div>
              </div>
              <div>
                <div className='text-xs text-zinc-500 uppercase mb-1'>
                  Email Status
                </div>
                <div className='text-sm text-zinc-300 flex items-center gap-2'>
                  <Mail className='h-3 w-3' />
                  {user.emailVerified ? (
                    <span className='text-emeraled-green'>Verified</span>
                  ) : (
                    <span className='text-zinc-400'>Not Verified</span>
                  )}
                </div>
              </div>
              <div>
                <div className='text-xs text-zinc-500 uppercase mb-1'>
                  Created At
                </div>
                <div className='text-sm text-zinc-300'>
                  {user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString()
                    : 'N/A'}
                </div>
              </div>
            </div>

            {/* Activity Stats */}
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-zinc-800'>
              <div className='flex items-center gap-3 bg-zinc-800/50 p-3 rounded-lg'>
                <Music className='h-5 w-5 text-emeraled-green' />
                <div>
                  <div className='text-xs text-zinc-500'>Collections</div>
                  <div className='text-lg font-semibold text-zinc-300'>
                    {user._count?.collections || 0}
                  </div>
                </div>
              </div>
              <div className='flex items-center gap-3 bg-zinc-800/50 p-3 rounded-lg'>
                <Star className='h-5 w-5 text-yellow-500' />
                <div>
                  <div className='text-xs text-zinc-500'>Recommendations</div>
                  <div className='text-lg font-semibold text-zinc-300'>
                    {user._count?.recommendations || 0}
                  </div>
                </div>
              </div>
              <div className='flex items-center gap-3 bg-zinc-800/50 p-3 rounded-lg'>
                <Heart className='h-5 w-5 text-pink-500' />
                <div>
                  <div className='text-xs text-zinc-500'>Followers</div>
                  <div className='text-lg font-semibold text-zinc-300'>
                    {user.followersCount || 0}
                  </div>
                </div>
              </div>
              <div className='flex items-center gap-3 bg-zinc-800/50 p-3 rounded-lg'>
                <Users className='h-5 w-5 text-blue-500' />
                <div>
                  <div className='text-xs text-zinc-500'>Following</div>
                  <div className='text-lg font-semibold text-zinc-300'>
                    {user.followingCount || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Bio */}
            {user.bio && (
              <div className='pt-4 border-t border-zinc-800'>
                <div className='text-xs text-zinc-500 uppercase mb-2'>Bio</div>
                <div className='text-sm text-zinc-300'>{user.bio}</div>
              </div>
            )}

            {/* Action Buttons */}
            <div className='pt-4 border-t border-zinc-800 flex gap-2'>
              <Link
                href={`/profile/${user.id}`}
                className='inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-emeraled-green hover:bg-emeraled-green/80 rounded-lg transition-colors'
              >
                <ExternalLink className='w-4 h-4 mr-2' />
                View Profile
              </Link>
              <Button
                onClick={() => handleOpenRoleModal(user)}
                variant='outline'
                className='inline-flex items-center px-4 py-2 text-sm font-medium text-white border-zinc-700 hover:bg-zinc-700'
              >
                <Shield className='w-4 h-4 mr-2' />
                Change Role
              </Button>
            </div>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className='space-y-6'>
      {/* Role Change Modal */}
      <Dialog open={roleModalOpen} onOpenChange={setRoleModalOpen}>
        <DialogContent className='bg-zinc-900 border-zinc-800 text-white'>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription className='text-zinc-400'>
              Update the role for {selectedUser?.name || 'this user'}. This will
              affect their permissions across the platform.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <label className='text-sm font-medium text-zinc-300'>
                Current Role: {selectedUser?.role || 'USER'}
              </label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className='bg-zinc-800 border-zinc-700 text-white'>
                  <SelectValue placeholder='Select a role' />
                </SelectTrigger>
                <SelectContent className='bg-zinc-800 border-zinc-700'>
                  <SelectItem value='USER'>User</SelectItem>
                  <SelectItem value='MODERATOR'>Moderator</SelectItem>
                  <SelectItem value='ADMIN'>Admin</SelectItem>
                  <SelectItem value='OWNER'>Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='bg-zinc-800/50 p-3 rounded-lg text-xs text-zinc-400'>
              <p className='font-semibold mb-1'>Role Permissions:</p>
              <ul className='space-y-1 ml-4 list-disc'>
                <li>
                  <strong>User:</strong> Basic access to the platform
                </li>
                <li>
                  <strong>Moderator:</strong> Can moderate content
                </li>
                <li>
                  <strong>Admin:</strong> Full administrative access
                </li>
                <li>
                  <strong>Owner:</strong> Highest level of access (can manage
                  admins)
                </li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setRoleModalOpen(false)}
              className='text-white border-zinc-700 hover:bg-zinc-700'
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateRole}
              className='bg-emeraled-green hover:bg-emeraled-green/80 text-white'
            >
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Header */}
      <div>
        <h1 className='text-3xl font-bold text-cosmic-latte mb-2'>
          Users Management
        </h1>
        <p className='text-zinc-400'>Manage and monitor user accounts</p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className='relative'>
        <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-5 h-5' />
        <input
          type='text'
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder='Search users by name or email...'
          className='w-full pl-10 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emeraled-green focus:border-transparent'
        />
      </form>

      {/* Stats Cards */}
      {data && (
        <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
          <div className='bg-zinc-800 p-4 rounded-lg border border-zinc-700'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-zinc-400 text-sm'>Total Users</p>
                <p className='text-2xl font-bold text-cosmic-latte'>
                  {data.totalCount}
                </p>
              </div>
              <Users className='w-8 h-8 text-emeraled-green' />
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className='bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden'>
        {data?.users && data.users.length > 0 && (
          <div className='px-4 pt-3 pb-2 border-b border-zinc-700'>
            <p className='text-xs text-zinc-500 flex items-center gap-1'>
              <Info className='h-3 w-3' />
              Click on any row to view detailed user information
            </p>
          </div>
        )}
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead className='bg-zinc-900 border-b border-zinc-700'>
              <tr>
                <th className='px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider'>
                  User
                </th>
                <th className='px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider'>
                  Email
                </th>
                <th className='px-6 py-4 text-center text-xs font-medium text-zinc-400 uppercase tracking-wider'>
                  Collections
                </th>
                <th className='px-6 py-4 text-center text-xs font-medium text-zinc-400 uppercase tracking-wider'>
                  Recommendations
                </th>
                <th className='px-6 py-4 text-center text-xs font-medium text-zinc-400 uppercase tracking-wider'>
                  Followers
                </th>
                <th className='px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider'>
                  Last Active
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-zinc-700'>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className='px-6 py-8 text-center'>
                    <div className='flex justify-center'>
                      <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-emeraled-green'></div>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={6}
                    className='px-6 py-8 text-center text-red-400'
                  >
                    Error loading users: {error.message}
                  </td>
                </tr>
              ) : data?.users.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className='px-6 py-8 text-center text-zinc-400'
                  >
                    No users found
                  </td>
                </tr>
              ) : (
                data?.users.map(user => (
                  <React.Fragment key={user.id}>
                    <tr
                      className='hover:bg-zinc-900/50 transition-colors cursor-pointer'
                      onClick={e => {
                        // Don't toggle if clicking a link
                        if ((e.target as HTMLElement).closest('a')) {
                          return;
                        }
                        toggleExpanded(user.id);
                      }}
                    >
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='flex items-center gap-2'>
                          {expandedRows.has(user.id) ? (
                            <ChevronDown className='h-4 w-4 text-zinc-400 flex-shrink-0' />
                          ) : (
                            <ChevronRight className='h-4 w-4 text-zinc-400 flex-shrink-0' />
                          )}
                          <Avatar className='h-10 w-10'>
                            <AvatarImage
                              src={user.image || undefined}
                              alt={user.name || 'User'}
                            />
                            <AvatarFallback className='bg-zinc-700 text-zinc-300'>
                              {user.name?.charAt(0)?.toUpperCase() ||
                                user.email?.charAt(0)?.toUpperCase() ||
                                'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className='ml-1'>
                            <div className='text-sm font-medium text-cosmic-latte'>
                              {user.name || 'Unnamed User'}
                            </div>
                            <div className='text-xs text-zinc-400'>
                              ID: {user.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='text-sm text-zinc-300'>
                          {user.email || 'No email'}
                        </div>
                        {user.emailVerified && (
                          <span className='inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emeraled-green/20 text-emeraled-green'>
                            Verified
                          </span>
                        )}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-center'>
                        <span className='text-zinc-300'>
                          {user._count?.collections || 0}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-center'>
                        <span className='text-zinc-300'>
                          {user._count?.recommendations || 0}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-center'>
                        <span className='text-zinc-300'>
                          {user.followersCount || 0}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='flex items-center text-sm text-zinc-400'>
                          <Calendar className='w-4 h-4 mr-1' />
                          {user.profileUpdatedAt
                            ? formatDate(user.profileUpdatedAt)
                            : 'N/A'}
                        </div>
                      </td>
                    </tr>
                    {expandedRows.has(user.id) && (
                      <UserExpandedContent
                        key={`${user.id}-expanded`}
                        user={user}
                      />
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalCount > 20 && (
          <div className='bg-zinc-900 px-6 py-4 border-t border-zinc-700 flex items-center justify-between'>
            <div className='text-sm text-zinc-400'>
              Showing {(page - 1) * 20 + 1} to{' '}
              {Math.min(page * 20, data.totalCount)} of {data.totalCount} users
            </div>
            <div className='flex gap-2'>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className='px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * 20 >= data.totalCount}
                className='px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
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
