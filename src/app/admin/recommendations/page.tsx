'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Star,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  Filter,
  X,
  Trash2,
  Edit,
  Info,
  ArrowRight,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

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
import { TablePagination } from '@/components/ui/table-pagination';
import { ClearableInput } from '@/components/ui/ClearableInput';
import AlbumImage from '@/components/ui/AlbumImage';
import {
  useGetAdminRecommendationsQuery,
  useAdminUpdateRecommendationMutation,
  useAdminDeleteRecommendationMutation,
  AdminRecommendationSortField,
  SortOrder,
  GetAdminRecommendationsQuery,
} from '@/generated/graphql';

type AdminRec =
  GetAdminRecommendationsQuery['adminRecommendations'][number];

function getArtistNames(
  artists: Array<{ artist: { name: string } }>
): string {
  return artists.map(a => a.artist.name).join(', ') || 'Unknown Artist';
}

export default function AdminRecommendationsPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminRec | null>(null);
  const [editScore, setEditScore] = useState(5);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminRec | null>(null);

  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    userId: '',
    minScore: undefined as number | undefined,
    maxScore: undefined as number | undefined,
    sortBy: AdminRecommendationSortField.CreatedAt,
    sortOrder: SortOrder.Desc,
  });

  const limit = 20;
  const offset = (page - 1) * limit;

  const { data, isLoading, error, refetch } =
    useGetAdminRecommendationsQuery(
      {
        offset,
        limit,
        search: filters.search || undefined,
        userId: filters.userId || undefined,
        minScore: filters.minScore,
        maxScore: filters.maxScore,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      },
      { staleTime: 30000 }
    );

  const updateMutation = useAdminUpdateRecommendationMutation();
  const deleteMutation = useAdminDeleteRecommendationMutation();

  const recommendations = data?.adminRecommendations ?? [];
  const totalCount = data?.totalCount ?? 0;

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
    setFilters(prev => ({ ...prev, search: searchInput }));
    setPage(1);
  };

  const handleSortChange = (field: AdminRecommendationSortField) => {
    setFilters(prev => ({
      ...prev,
      sortBy: field,
      sortOrder:
        prev.sortBy === field && prev.sortOrder === SortOrder.Desc
          ? SortOrder.Asc
          : SortOrder.Desc,
    }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      userId: '',
      minScore: undefined,
      maxScore: undefined,
      sortBy: AdminRecommendationSortField.CreatedAt,
      sortOrder: SortOrder.Desc,
    });
    setSearchInput('');
    setPage(1);
  };

  const hasActiveFilters =
    filters.search ||
    filters.userId ||
    filters.minScore !== undefined ||
    filters.maxScore !== undefined ||
    filters.sortBy !== AdminRecommendationSortField.CreatedAt ||
    filters.sortOrder !== SortOrder.Desc;

  const getSortIcon = (field: AdminRecommendationSortField) => {
    if (filters.sortBy !== field) return null;
    return filters.sortOrder === SortOrder.Asc ? ' \u2191' : ' \u2193';
  };

  const handleOpenEditModal = (rec: AdminRec) => {
    setEditTarget(rec);
    setEditScore(rec.score);
    setEditModalOpen(true);
  };

  const handleUpdateScore = async () => {
    if (!editTarget) return;
    try {
      await updateMutation.mutateAsync({
        id: editTarget.id,
        score: editScore,
      });
      toast.success('Score updated');
      setEditModalOpen(false);
      await refetch();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to update score';
      toast.error(msg);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync({ id: deleteTarget.id });
      toast.success('Recommendation deleted');
      setDeleteModalOpen(false);
      setDeleteTarget(null);
      await refetch();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to delete';
      toast.error(msg);
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Expanded row content
  const RecExpandedContent = ({ rec }: { rec: AdminRec }) => (
    <tr className='hover:bg-transparent'>
      <td colSpan={5} className='p-0 bg-zinc-900/30'>
        <div className='p-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200'>
          {/* IDs */}
          <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
            <div>
              <div className='text-xs text-zinc-500 uppercase mb-1'>
                Recommendation ID
              </div>
              <div className='text-sm text-zinc-300 font-mono'>{rec.id}</div>
            </div>
            <div>
              <div className='text-xs text-zinc-500 uppercase mb-1'>
                Created
              </div>
              <div className='text-sm text-zinc-300'>
                {formatDate(rec.createdAt)}
                <span className='text-zinc-500 text-xs ml-1.5'>
                  (
                  {formatDistanceToNow(new Date(rec.createdAt), {
                    addSuffix: true,
                  })}
                  )
                </span>
              </div>
            </div>
            <div>
              <div className='text-xs text-zinc-500 uppercase mb-1'>
                Updated
              </div>
              <div className='text-sm text-zinc-300'>
                {formatDate(rec.updatedAt)}
                <span className='text-zinc-500 text-xs ml-1.5'>
                  (
                  {formatDistanceToNow(new Date(rec.updatedAt), {
                    addSuffix: true,
                  })}
                  )
                </span>
              </div>
            </div>
          </div>

          {/* Album Details */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-zinc-800'>
            {/* Basis Album */}
            <div className='flex gap-4'>
              <div className='w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-zinc-800'>
                <AlbumImage
                  src={rec.basisAlbum.coverArtUrl}
                  cloudflareImageId={rec.basisAlbum.cloudflareImageId}
                  alt={rec.basisAlbum.title}
                  width={96}
                  height={96}
                  className='w-full h-full object-cover'
                />
              </div>
              <div>
                <div className='text-xs text-zinc-500 uppercase mb-1'>
                  Basis Album
                </div>
                <div className='text-sm font-medium text-white'>
                  {rec.basisAlbum.title}
                </div>
                <div className='text-xs text-zinc-400'>
                  {getArtistNames(rec.basisAlbum.artists)}
                </div>
                <div className='text-xs text-zinc-500 font-mono mt-1'>
                  {rec.basisAlbum.id}
                </div>
              </div>
            </div>

            {/* Recommended Album */}
            <div className='flex gap-4'>
              <div className='w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-zinc-800'>
                <AlbumImage
                  src={rec.recommendedAlbum.coverArtUrl}
                  cloudflareImageId={rec.recommendedAlbum.cloudflareImageId}
                  alt={rec.recommendedAlbum.title}
                  width={96}
                  height={96}
                  className='w-full h-full object-cover'
                />
              </div>
              <div>
                <div className='text-xs text-zinc-500 uppercase mb-1'>
                  Recommended Album
                </div>
                <div className='text-sm font-medium text-white'>
                  {rec.recommendedAlbum.title}
                </div>
                <div className='text-xs text-zinc-400'>
                  {getArtistNames(rec.recommendedAlbum.artists)}
                </div>
                <div className='text-xs text-zinc-500 font-mono mt-1'>
                  {rec.recommendedAlbum.id}
                </div>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className='pt-4 border-t border-zinc-800'>
            <div className='text-xs text-zinc-500 uppercase mb-2'>
              Created By
            </div>
            <div className='flex items-center gap-3'>
              <Avatar className='h-8 w-8'>
                <AvatarImage
                  src={rec.user.image || undefined}
                  alt={rec.user.username || 'User'}
                />
                <AvatarFallback className='bg-zinc-700 text-zinc-300 text-xs'>
                  {rec.user.username?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <Link
                  href={`/profile/${rec.user.id}`}
                  className='text-sm text-emeraled-green hover:underline'
                >
                  {rec.user.username || 'Unknown User'}
                </Link>
                <div className='text-xs text-zinc-500 font-mono'>
                  {rec.user.id}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className='pt-4 border-t border-zinc-800 flex flex-wrap gap-2'>
            <Button
              onClick={() => handleOpenEditModal(rec)}
              className='inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-zinc-700 hover:bg-zinc-600'
            >
              <Edit className='w-4 h-4 mr-2' />
              Edit Score
            </Button>
            <Button
              onClick={() => {
                setDeleteTarget(rec);
                setDeleteModalOpen(true);
              }}
              className='inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-700 hover:bg-red-800'
            >
              <Trash2 className='w-4 h-4 mr-2' />
              Delete
            </Button>
          </div>
        </div>
      </td>
    </tr>
  );

  return (
    <div className='space-y-6 p-6'>
      {/* Edit Score Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className='bg-zinc-900 border-zinc-800 text-white'>
          <DialogHeader>
            <DialogTitle>Edit Recommendation Score</DialogTitle>
            <DialogDescription className='text-zinc-400'>
              Update the score for this recommendation.
            </DialogDescription>
          </DialogHeader>

          {editTarget && (
            <div className='space-y-4 py-4'>
              <div className='bg-zinc-800/50 p-4 rounded-lg space-y-2'>
                <div className='text-sm'>
                  <span className='text-zinc-500'>Basis:</span>{' '}
                  <span className='text-white font-medium'>
                    {editTarget.basisAlbum.title}
                  </span>
                </div>
                <div className='text-sm'>
                  <span className='text-zinc-500'>Recommended:</span>{' '}
                  <span className='text-white font-medium'>
                    {editTarget.recommendedAlbum.title}
                  </span>
                </div>
                <div className='text-sm'>
                  <span className='text-zinc-500'>Current Score:</span>{' '}
                  <span className='text-yellow-400 font-medium'>
                    {editTarget.score}
                  </span>
                </div>
              </div>

              <div>
                <label className='text-sm text-zinc-300 block mb-2'>
                  New Score (5-10)
                </label>
                <input
                  type='number'
                  min={5}
                  max={10}
                  value={editScore}
                  onChange={e =>
                    setEditScore(
                      Math.min(10, Math.max(5, parseInt(e.target.value) || 5))
                    )
                  }
                  className='w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-hidden focus:border-emeraled-green'
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              onClick={() => setEditModalOpen(false)}
              className='text-white bg-zinc-700 hover:bg-zinc-600'
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateScore}
              disabled={updateMutation.isPending}
              className='bg-emeraled-green hover:bg-emeraled-green/80 text-white'
            >
              {updateMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className='bg-zinc-900 border-zinc-800 text-white'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-red-400'>
              <Trash2 className='h-5 w-5' />
              Delete Recommendation
            </DialogTitle>
            <DialogDescription className='text-zinc-400'>
              This will permanently delete this recommendation and soft-delete
              its activity entry.
            </DialogDescription>
          </DialogHeader>

          {deleteTarget && (
            <div className='space-y-3 py-4'>
              <div className='bg-zinc-800/50 p-4 rounded-lg space-y-2'>
                <div className='text-sm'>
                  <span className='text-zinc-500'>By:</span>{' '}
                  <span className='text-white font-medium'>
                    {deleteTarget.user.username || 'Unknown'}
                  </span>
                </div>
                <div className='text-sm'>
                  <span className='text-zinc-500'>Basis:</span>{' '}
                  <span className='text-white font-medium'>
                    {deleteTarget.basisAlbum.title}
                  </span>
                </div>
                <div className='text-sm'>
                  <span className='text-zinc-500'>Recommended:</span>{' '}
                  <span className='text-white font-medium'>
                    {deleteTarget.recommendedAlbum.title}
                  </span>
                </div>
                <div className='text-sm'>
                  <span className='text-zinc-500'>Score:</span>{' '}
                  <span className='text-yellow-400 font-medium'>
                    {deleteTarget.score}/10
                  </span>
                </div>
              </div>
              <div className='bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-300'>
                This action is irreversible. The recommendation will be
                permanently removed from the database.
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              onClick={() => setDeleteModalOpen(false)}
              className='text-white bg-zinc-700 hover:bg-zinc-600'
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className='bg-red-600 hover:bg-red-700 text-white'
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div>
        <h1 className='text-3xl font-bold text-cosmic-latte mb-2'>
          Recommendations Management
        </h1>
        <p className='text-zinc-400'>
          Search, view, edit, and delete recommendations
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className='flex gap-2'>
        <div className='relative flex-1'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-5 h-5 z-10' />
          <ClearableInput
            type='text'
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onClear={() => {
              setSearchInput('');
              setFilters(prev => ({ ...prev, search: '' }));
            }}
            placeholder='Search by album title or username...'
            className='w-full pl-10 pr-8 py-3 bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400'
          />
        </div>
        <Button
          type='submit'
          className='bg-emeraled-green hover:bg-emeraled-green/80 text-white'
        >
          Search
        </Button>
        <Button
          type='button'
          variant='outline'
          onClick={() => setShowFilters(!showFilters)}
          className={`text-white border-zinc-700 hover:bg-zinc-700 ${showFilters ? 'bg-zinc-700' : ''}`}
        >
          <Filter className='w-4 h-4 mr-2' />
          Filters
          {hasActiveFilters && (
            <span className='ml-2 w-2 h-2 bg-emeraled-green rounded-full' />
          )}
        </Button>
      </form>

      {/* Filters Panel */}
      {showFilters && (
        <div className='bg-zinc-800 rounded-lg border border-zinc-700 p-4 space-y-4'>
          <div className='flex items-center justify-between'>
            <h3 className='text-sm font-medium text-white'>Filters</h3>
            {hasActiveFilters && (
              <Button
                variant='ghost'
                size='sm'
                onClick={clearFilters}
                className='text-zinc-400 hover:text-white'
              >
                <X className='w-4 h-4 mr-1' />
                Clear all
              </Button>
            )}
          </div>

          <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
            {/* Min Score */}
            <div>
              <label className='text-xs text-zinc-500 uppercase mb-1 block'>
                Min Score
              </label>
              <Select
                value={
                  filters.minScore !== undefined
                    ? String(filters.minScore)
                    : 'any'
                }
                onValueChange={v => {
                  setFilters(prev => ({
                    ...prev,
                    minScore: v === 'any' ? undefined : parseInt(v),
                  }));
                  setPage(1);
                }}
              >
                <SelectTrigger className='bg-zinc-900 border-zinc-700 text-white'>
                  <SelectValue placeholder='Any' />
                </SelectTrigger>
                <SelectContent className='bg-zinc-800 border-zinc-700'>
                  <SelectItem value='any'>Any</SelectItem>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                    <SelectItem key={n} value={String(n)}>
                      {n}+
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Max Score */}
            <div>
              <label className='text-xs text-zinc-500 uppercase mb-1 block'>
                Max Score
              </label>
              <Select
                value={
                  filters.maxScore !== undefined
                    ? String(filters.maxScore)
                    : 'any'
                }
                onValueChange={v => {
                  setFilters(prev => ({
                    ...prev,
                    maxScore: v === 'any' ? undefined : parseInt(v),
                  }));
                  setPage(1);
                }}
              >
                <SelectTrigger className='bg-zinc-900 border-zinc-700 text-white'>
                  <SelectValue placeholder='Any' />
                </SelectTrigger>
                <SelectContent className='bg-zinc-800 border-zinc-700'>
                  <SelectItem value='any'>Any</SelectItem>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort By */}
            <div>
              <label className='text-xs text-zinc-500 uppercase mb-1 block'>
                Sort By
              </label>
              <Select
                value={filters.sortBy}
                onValueChange={value => {
                  setFilters(prev => ({
                    ...prev,
                    sortBy: value as AdminRecommendationSortField,
                  }));
                  setPage(1);
                }}
              >
                <SelectTrigger className='bg-zinc-900 border-zinc-700 text-white'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className='bg-zinc-800 border-zinc-700'>
                  <SelectItem value={AdminRecommendationSortField.CreatedAt}>
                    Created Date
                  </SelectItem>
                  <SelectItem value={AdminRecommendationSortField.UpdatedAt}>
                    Updated Date
                  </SelectItem>
                  <SelectItem value={AdminRecommendationSortField.Score}>
                    Score
                  </SelectItem>
                  <SelectItem value={AdminRecommendationSortField.User}>
                    User
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort Order */}
            <div>
              <label className='text-xs text-zinc-500 uppercase mb-1 block'>
                Order
              </label>
              <Select
                value={filters.sortOrder}
                onValueChange={value => {
                  setFilters(prev => ({
                    ...prev,
                    sortOrder: value as SortOrder,
                  }));
                  setPage(1);
                }}
              >
                <SelectTrigger className='bg-zinc-900 border-zinc-700 text-white'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className='bg-zinc-800 border-zinc-700'>
                  <SelectItem value={SortOrder.Desc}>Descending</SelectItem>
                  <SelectItem value={SortOrder.Asc}>Ascending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Stats Card */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
        <div className='bg-zinc-800 p-4 rounded-lg border border-zinc-700'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-zinc-400 text-sm'>Total Recommendations</p>
              <p className='text-2xl font-bold text-cosmic-latte'>
                {totalCount}
              </p>
            </div>
            <Star className='w-8 h-8 text-yellow-500' />
          </div>
        </div>
      </div>

      {/* Recommendations Table */}
      <div className='bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden'>
        {recommendations.length > 0 && (
          <div className='px-4 pt-3 pb-2 border-b border-zinc-700'>
            <p className='text-xs text-zinc-500 flex items-center gap-1'>
              <Info className='h-3 w-3' />
              Click on any row to view details. Click column headers to sort.
            </p>
          </div>
        )}
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead className='bg-zinc-900 border-b border-zinc-700'>
              <tr>
                <th className='px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider'>
                  <button
                    onClick={() =>
                      handleSortChange(
                        AdminRecommendationSortField.User
                      )
                    }
                    className='flex items-center gap-1 hover:text-white transition-colors'
                  >
                    User
                    <ArrowUpDown className='w-3 h-3' />
                    {getSortIcon(AdminRecommendationSortField.User)}
                  </button>
                </th>
                <th className='px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider'>
                  Pairing
                </th>
                <th className='px-6 py-4 text-center text-xs font-medium text-zinc-400 uppercase tracking-wider'>
                  <button
                    onClick={() =>
                      handleSortChange(
                        AdminRecommendationSortField.Score
                      )
                    }
                    className='flex items-center gap-1 hover:text-white transition-colors mx-auto'
                  >
                    Score
                    <ArrowUpDown className='w-3 h-3' />
                    {getSortIcon(AdminRecommendationSortField.Score)}
                  </button>
                </th>
                <th className='px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider'>
                  <button
                    onClick={() =>
                      handleSortChange(
                        AdminRecommendationSortField.CreatedAt
                      )
                    }
                    className='flex items-center gap-1 hover:text-white transition-colors'
                  >
                    Created
                    <ArrowUpDown className='w-3 h-3' />
                    {getSortIcon(
                      AdminRecommendationSortField.CreatedAt
                    )}
                  </button>
                </th>
                <th className='px-6 py-4 text-center text-xs font-medium text-zinc-400 uppercase tracking-wider'>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-zinc-700'>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className='px-6 py-8 text-center'>
                    <div className='flex justify-center'>
                      <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-emeraled-green' />
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={5}
                    className='px-6 py-8 text-center text-red-400'
                  >
                    Error loading recommendations:{' '}
                    {error instanceof Error
                      ? error.message
                      : 'Unknown error'}
                  </td>
                </tr>
              ) : recommendations.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className='px-6 py-8 text-center text-zinc-400'
                  >
                    No recommendations found
                  </td>
                </tr>
              ) : (
                recommendations.map(rec => (
                  <React.Fragment key={rec.id}>
                    <tr
                      className='hover:bg-zinc-900/50 transition-colors cursor-pointer'
                      onClick={e => {
                        if (
                          (e.target as HTMLElement).closest('button')
                        ) {
                          return;
                        }
                        toggleExpanded(rec.id);
                      }}
                    >
                      {/* User */}
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='flex items-center gap-2'>
                          {expandedRows.has(rec.id) ? (
                            <ChevronDown className='h-4 w-4 text-zinc-400 shrink-0' />
                          ) : (
                            <ChevronRight className='h-4 w-4 text-zinc-400 shrink-0' />
                          )}
                          <Avatar className='h-8 w-8'>
                            <AvatarImage
                              src={rec.user.image || undefined}
                              alt={rec.user.username || 'User'}
                            />
                            <AvatarFallback className='bg-zinc-700 text-zinc-300 text-xs'>
                              {rec.user.username
                                ?.charAt(0)
                                ?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className='text-sm text-cosmic-latte font-medium'>
                            {rec.user.username || 'Unknown'}
                          </span>
                        </div>
                      </td>

                      {/* Pairing */}
                      <td className='px-6 py-4'>
                        <div className='flex items-center gap-2 min-w-0'>
                          <div className='flex items-center gap-2 min-w-0'>
                            <div className='w-10 h-10 shrink-0 rounded overflow-hidden bg-zinc-700'>
                              <AlbumImage
                                src={rec.basisAlbum.coverArtUrl}
                                cloudflareImageId={
                                  rec.basisAlbum.cloudflareImageId
                                }
                                alt={rec.basisAlbum.title}
                                width={40}
                                height={40}
                                className='w-full h-full object-cover'
                                showSkeleton={false}
                              />
                            </div>
                            <div className='min-w-0'>
                              <div className='text-sm text-white truncate max-w-[140px]'>
                                {rec.basisAlbum.title}
                              </div>
                              <div className='text-xs text-zinc-500 truncate max-w-[140px]'>
                                {getArtistNames(rec.basisAlbum.artists)}
                              </div>
                            </div>
                          </div>
                          <ArrowRight className='w-4 h-4 text-zinc-500 shrink-0' />
                          <div className='flex items-center gap-2 min-w-0'>
                            <div className='w-10 h-10 shrink-0 rounded overflow-hidden bg-zinc-700'>
                              <AlbumImage
                                src={
                                  rec.recommendedAlbum.coverArtUrl
                                }
                                cloudflareImageId={
                                  rec.recommendedAlbum
                                    .cloudflareImageId
                                }
                                alt={rec.recommendedAlbum.title}
                                width={40}
                                height={40}
                                className='w-full h-full object-cover'
                                showSkeleton={false}
                              />
                            </div>
                            <div className='min-w-0'>
                              <div className='text-sm text-white truncate max-w-[140px]'>
                                {rec.recommendedAlbum.title}
                              </div>
                              <div className='text-xs text-zinc-500 truncate max-w-[140px]'>
                                {getArtistNames(
                                  rec.recommendedAlbum.artists
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Score */}
                      <td className='px-6 py-4 text-center'>
                        <span className='inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold bg-yellow-500/20 text-yellow-400'>
                          {rec.score}/10
                        </span>
                      </td>

                      {/* Created */}
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='text-sm text-zinc-400'>
                          {formatDate(rec.createdAt)}
                        </div>
                        <div className='text-xs text-zinc-500'>
                          {formatDistanceToNow(
                            new Date(rec.createdAt),
                            { addSuffix: true }
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className='px-6 py-4 text-center'>
                        <div className='flex items-center justify-center gap-1'>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleOpenEditModal(rec);
                            }}
                            className='p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors'
                            title='Edit score'
                          >
                            <Edit className='w-4 h-4' />
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setDeleteTarget(rec);
                              setDeleteModalOpen(true);
                            }}
                            className='p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors'
                            title='Delete'
                          >
                            <Trash2 className='w-4 h-4' />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedRows.has(rec.id) && (
                      <RecExpandedContent
                        key={`${rec.id}-expanded`}
                        rec={rec}
                      />
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className='bg-zinc-900 px-6 py-4 border-t border-zinc-700'>
          <TablePagination
            currentPage={page}
            totalPages={Math.max(1, Math.ceil(totalCount / limit))}
            onPageChange={setPage}
            totalCount={totalCount}
            pageSize={limit}
            currentPageItemCount={recommendations.length}
          />
        </div>
      </div>
    </div>
  );
}
