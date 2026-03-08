'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  XCircle,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ListMusic,
} from 'lucide-react';

import AlbumImage from '@/components/ui/AlbumImage';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  useSuggestedGameAlbumsQuery,
  useUpdateAlbumGameStatusMutation,
  useAddAlbumToPoolMutation,
  AlbumGameStatus,
} from '@/generated/graphql';

const SYNC_SOURCE_OPTIONS = [
  { value: 'all', label: 'All Sources' },
  { value: 'deezer_playlists', label: 'Deezer Playlists' },
  { value: 'spotify_playlists', label: 'Spotify Playlists' },
  { value: 'spotify_search', label: 'Spotify Search' },
  { value: 'musicbrainz_sync', label: 'MusicBrainz' },
  { value: 'user_collection', label: 'User Collection' },
  { value: 'user_recommendation', label: 'User Recommendation' },
];

const PAGE_SIZE = 50;

/** Build the page number array: 1 2 ... 5 [6] 7 ... 10 */
function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | '...')[] = [1];

  if (current > 3) {
    pages.push('...');
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push('...');
  }

  pages.push(total);
  return pages;
}

export function SuggestedAlbumsTable() {
  const queryClient = useQueryClient();
  const [offset, setOffset] = useState(0);
  const [syncSource, setSyncSource] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState<string | undefined>(undefined);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [addExternalOpen, setAddExternalOpen] = useState(false);

  const { data, isLoading } = useSuggestedGameAlbumsQuery({
    limit: PAGE_SIZE,
    offset,
    syncSource: syncSource === 'all' ? undefined : syncSource,
    search: searchQuery,
  });

  const { mutateAsync: updateStatus } = useUpdateAlbumGameStatusMutation();

  const { mutateAsync: addToPool, isPending: isAddingToPool } =
    useAddAlbumToPoolMutation();

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['SuggestedGameAlbums'] });
    queryClient.invalidateQueries({ queryKey: ['AlbumsByGameStatus'] });
    queryClient.invalidateQueries({ queryKey: ['GamePoolStats'] });
    queryClient.invalidateQueries({ queryKey: ['CuratedChallenges'] });
  }, [queryClient]);

  const albums = useMemo(
    () => data?.suggestedGameAlbums?.albums || [],
    [data?.suggestedGameAlbums?.albums]
  );
  const totalCount = data?.suggestedGameAlbums?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const hasFilters = syncSource !== 'all' || searchQuery;

  // Selection helpers
  const allSelected = albums.length > 0 && selectedIds.size === albums.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < albums.length;

  const toggleAlbum = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(albums.map(a => a.id)));
    }
  }, [allSelected, albums]);

  // Reset selection on filter/page change
  const resetSelection = useCallback(() => setSelectedIds(new Set()), []);

  // Single-album actions
  const handleAddToPool = async (albumId: string, albumTitle: string) => {
    try {
      const result = await addToPool({ albumId });
      if (result.addAlbumToPool.success) {
        toast.success(`"${albumTitle}" added to pool`);
      } else {
        toast.error(result.addAlbumToPool.error || 'Failed to add to pool');
      }
      invalidateAll();
    } catch (error) {
      toast.error('Failed to add to pool');
      console.error('Add to pool error:', error);
    }
  };

  const handleExclude = async (albumId: string) => {
    try {
      const result = await updateStatus({
        input: { albumId, gameStatus: AlbumGameStatus.Excluded },
      });
      if (result.updateAlbumGameStatus.success) {
        toast.success('Album excluded from game pool');
      } else {
        toast.error(result.updateAlbumGameStatus.error || 'Exclusion failed');
      }
      invalidateAll();
    } catch (error) {
      toast.error('Failed to exclude album');
      console.error('Exclusion error:', error);
    }
  };

  // Bulk actions
  const handleBulkAddToPool = async () => {
    const ids = Array.from(selectedIds);
    setBulkAction('pool');
    const toastId = toast.loading(`Adding ${ids.length} albums to pool...`);
    let success = 0;
    let failed = 0;

    for (const albumId of ids) {
      try {
        const result = await addToPool({ albumId });
        if (result.addAlbumToPool.success) success++;
        else failed++;
      } catch {
        failed++;
      }
    }

    toast.dismiss(toastId);
    if (failed === 0) {
      toast.success(`${success} albums added to pool`);
    } else {
      toast.warning(`${success} added to pool, ${failed} failed`);
    }
    resetSelection();
    invalidateAll();
    setBulkAction(null);
  };

  const handleBulkExclude = async () => {
    const ids = Array.from(selectedIds);
    setBulkAction('exclude');
    const toastId = toast.loading(`Excluding ${ids.length} albums...`);
    let success = 0;
    let failed = 0;

    for (const albumId of ids) {
      try {
        const result = await updateStatus({
          input: { albumId, gameStatus: AlbumGameStatus.Excluded },
        });
        if (result.updateAlbumGameStatus.success) success++;
        else failed++;
      } catch {
        failed++;
      }
    }

    toast.dismiss(toastId);
    if (failed === 0) {
      toast.success(`${success} albums excluded`);
    } else {
      toast.warning(`${success} excluded, ${failed} failed`);
    }
    resetSelection();
    invalidateAll();
    setBulkAction(null);
  };

  const isBulkRunning = bulkAction !== null;

  // Filter handlers
  const handleSearch = () => {
    const trimmed = searchInput.trim();
    setSearchQuery(trimmed || undefined);
    setOffset(0);
    resetSelection();
  };

  const handleSyncSourceChange = (value: string) => {
    setSyncSource(value);
    setOffset(0);
    resetSelection();
  };

  const handleClearFilters = () => {
    setSyncSource('all');
    setSearchInput('');
    setSearchQuery(undefined);
    setOffset(0);
    resetSelection();
  };

  const goToPage = (page: number) => {
    setOffset((page - 1) * PAGE_SIZE);
    resetSelection();
  };

  return (
    <div className='space-y-4'>
      {/* Top Bar: Add External + Filters */}
      <div className='flex flex-wrap items-center gap-3'>
        <Button
          variant='outline'
          size='sm'
          className='h-9'
          onClick={() => setAddExternalOpen(true)}
        >
          <Plus className='h-4 w-4 mr-1' />
          Add External
        </Button>

        <div className='flex items-center gap-2 flex-1 min-w-[200px] max-w-sm'>
          <Input
            placeholder='Search albums or artists...'
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className='h-9'
          />
          <Button
            variant='outline'
            size='sm'
            onClick={handleSearch}
            className='h-9 px-3'
          >
            <Search className='h-4 w-4' />
          </Button>
        </div>

        <Select value={syncSource} onValueChange={handleSyncSourceChange}>
          <SelectTrigger className='w-48 h-9'>
            <SelectValue placeholder='Filter by source' />
          </SelectTrigger>
          <SelectContent>
            {SYNC_SOURCE_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            variant='ghost'
            size='sm'
            onClick={handleClearFilters}
            className='h-9 text-zinc-400 hover:text-white'
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className='flex items-center gap-3 rounded-md border border-zinc-700 bg-zinc-800/50 px-4 py-2.5'>
          <span className='text-sm text-zinc-300 font-medium'>
            {selectedIds.size} selected
          </span>
          <div className='flex items-center gap-2 ml-auto'>
            <Button
              size='sm'
              variant='outline'
              className='text-green-500 border-green-500/20 hover:bg-green-500/10'
              disabled={isBulkRunning}
              onClick={handleBulkAddToPool}
            >
              {bulkAction === 'pool' ? (
                <Loader2 className='h-4 w-4 mr-1 animate-spin' />
              ) : (
                <Plus className='h-4 w-4 mr-1' />
              )}
              Add All to Pool
            </Button>
            <Button
              size='sm'
              variant='outline'
              className='text-red-500 border-red-500/20 hover:bg-red-500/10'
              disabled={isBulkRunning}
              onClick={handleBulkExclude}
            >
              {bulkAction === 'exclude' ? (
                <Loader2 className='h-4 w-4 mr-1 animate-spin' />
              ) : (
                <XCircle className='h-4 w-4 mr-1' />
              )}
              Exclude All
            </Button>
            <button
              onClick={resetSelection}
              disabled={isBulkRunning}
              className='text-xs text-zinc-500 hover:text-white transition-colors ml-2 disabled:opacity-50'
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className='text-center py-8 text-muted-foreground'>Loading...</div>
      ) : albums.length === 0 ? (
        <div className='text-center py-8 text-muted-foreground'>
          {hasFilters
            ? 'No albums match the current filters'
            : 'No albums found'}
        </div>
      ) : (
        <div className='rounded-md border border-zinc-800'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='w-10 px-3'>
                  <Checkbox
                    checked={allSelected}
                    ref={el => {
                      if (el) {
                        (el as unknown as HTMLInputElement).indeterminate =
                          someSelected;
                      }
                    }}
                    onCheckedChange={toggleAll}
                    disabled={isBulkRunning}
                  />
                </TableHead>
                <TableHead className='w-16'>Cover</TableHead>
                <TableHead>Album</TableHead>
                <TableHead>Artist</TableHead>
                <TableHead className='w-24'>Year</TableHead>
                <TableHead className='w-52'>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {albums.map(album => {
                const artistNames = album.artists
                  .map(a => a.artist.name)
                  .join(', ');
                const year = album.releaseDate
                  ? format(new Date(album.releaseDate), 'yyyy')
                  : 'N/A';
                const isSelected = selectedIds.has(album.id);

                return (
                  <TableRow
                    key={album.id}
                    className={isSelected ? 'bg-zinc-800/30' : ''}
                  >
                    <TableCell className='px-3'>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleAlbum(album.id)}
                        disabled={isBulkRunning}
                      />
                    </TableCell>
                    <TableCell>
                      <AlbumImage
                        src={album.coverArtUrl}
                        cloudflareImageId={album.cloudflareImageId}
                        alt={album.title}
                        width={40}
                        height={40}
                        className='rounded'
                      />
                    </TableCell>
                    <TableCell className='font-medium text-white'>
                      {album.title}
                    </TableCell>
                    <TableCell className='text-zinc-400'>
                      {artistNames}
                    </TableCell>
                    <TableCell className='text-zinc-300'>{year}</TableCell>
                    <TableCell>
                      <div className='flex gap-2'>
                        <Button
                          size='sm'
                          variant='outline'
                          className='text-green-500 border-green-500/20 hover:bg-green-500/10'
                          disabled={isAddingToPool || isBulkRunning}
                          onClick={() => handleAddToPool(album.id, album.title)}
                        >
                          <Plus className='h-4 w-4 mr-1' />
                          Add to Pool
                        </Button>
                        <Button
                          size='sm'
                          variant='outline'
                          className='text-red-500 border-red-500/20 hover:bg-red-500/10'
                          disabled={isBulkRunning}
                          onClick={() => handleExclude(album.id)}
                        >
                          <XCircle className='h-4 w-4 mr-1' />
                          Exclude
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalCount > 0 && (
        <div className='flex items-center justify-between'>
          <p className='text-sm text-zinc-500'>
            Showing {offset + 1}–{offset + albums.length} of{' '}
            {totalCount.toLocaleString()}
          </p>
          <div className='flex items-center gap-1'>
            <Button
              variant='ghost'
              size='sm'
              className='h-8 w-8 p-0'
              disabled={currentPage === 1}
              onClick={() => goToPage(currentPage - 1)}
            >
              <ChevronLeft className='h-4 w-4' />
            </Button>
            {getPageNumbers(currentPage, totalPages).map((page, i) =>
              page === '...' ? (
                <span
                  key={`ellipsis-${i}`}
                  className='px-1 text-sm text-zinc-600'
                >
                  ...
                </span>
              ) : (
                <Button
                  key={page}
                  variant='ghost'
                  size='sm'
                  className={`h-8 w-8 p-0 text-sm ${
                    page === currentPage
                      ? 'bg-zinc-700 text-white font-semibold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                  onClick={() => goToPage(page as number)}
                >
                  {page}
                </Button>
              )
            )}
            <Button
              variant='ghost'
              size='sm'
              className='h-8 w-8 p-0'
              disabled={currentPage === totalPages}
              onClick={() => goToPage(currentPage + 1)}
            >
              <ChevronRight className='h-4 w-4' />
            </Button>
          </div>
        </div>
      )}

      {/* Add External Dialog */}
      <Dialog open={addExternalOpen} onOpenChange={setAddExternalOpen}>
        <DialogContent className='max-w-sm'>
          <DialogHeader>
            <DialogTitle>Add External Album</DialogTitle>
            <DialogDescription>
              Add an album to the pool from an external source
            </DialogDescription>
          </DialogHeader>
          <div className='grid grid-cols-2 gap-3 pt-2'>
            <Button
              variant='outline'
              className='flex flex-col items-center gap-2 h-24 hover:bg-zinc-800'
              onClick={() => {
                setAddExternalOpen(false);
              }}
            >
              <Search className='h-5 w-5' />
              <span className='text-sm'>Search</span>
            </Button>
            <Button
              variant='outline'
              className='flex flex-col items-center gap-2 h-24 hover:bg-zinc-800'
              onClick={() => {
                setAddExternalOpen(false);
              }}
            >
              <ListMusic className='h-5 w-5' />
              <span className='text-sm'>Import Playlist</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
