'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  CheckCircle,
  XCircle,
  Zap,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
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
  useSuggestedGameAlbumsQuery,
  useUpdateAlbumGameStatusMutation,
  useAddAlbumToQueueMutation,
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

export function SuggestedAlbumsTable() {
  const queryClient = useQueryClient();
  const [offset, setOffset] = useState(0);
  const [syncSource, setSyncSource] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState<string | undefined>(undefined);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string | null>(null);

  const { data, isLoading } = useSuggestedGameAlbumsQuery({
    limit: PAGE_SIZE,
    offset,
    syncSource: syncSource === 'all' ? undefined : syncSource,
    search: searchQuery,
  });

  const { mutateAsync: updateStatus } = useUpdateAlbumGameStatusMutation();

  const { mutateAsync: addToQueue, isPending: isAddingToQueue } =
    useAddAlbumToQueueMutation();

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['SuggestedGameAlbums'] });
    queryClient.invalidateQueries({ queryKey: ['AlbumsByGameStatus'] });
    queryClient.invalidateQueries({ queryKey: ['GamePoolStats'] });
    queryClient.invalidateQueries({ queryKey: ['CuratedChallenges'] });
  }, [queryClient]);

  const albums = useMemo(
    () => data?.suggestedGameAlbums || [],
    [data?.suggestedGameAlbums]
  );
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
  const handleApprove = async (albumId: string) => {
    try {
      const result = await updateStatus({
        input: { albumId, gameStatus: AlbumGameStatus.Eligible },
      });
      if (result.updateAlbumGameStatus.success) {
        toast.success('Album approved for game pool');
      } else {
        toast.error(result.updateAlbumGameStatus.error || 'Approval failed');
      }
      invalidateAll();
    } catch (error) {
      toast.error('Failed to approve album');
      console.error('Approval error:', error);
    }
  };

  const handleAddToQueue = async (albumId: string, albumTitle: string) => {
    try {
      const result = await addToQueue({ albumId });
      if (result.addAlbumToQueue.success) {
        toast.success(`"${albumTitle}" added to game queue`);
      } else {
        toast.error(result.addAlbumToQueue.error || 'Failed to add to queue');
      }
      invalidateAll();
    } catch (error) {
      toast.error('Failed to add to queue');
      console.error('Add to queue error:', error);
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
  const handleBulkApprove = async () => {
    const ids = Array.from(selectedIds);
    setBulkAction('approve');
    const toastId = toast.loading(`Approving ${ids.length} albums...`);
    let success = 0;
    let failed = 0;

    for (const albumId of ids) {
      try {
        const result = await updateStatus({
          input: { albumId, gameStatus: AlbumGameStatus.Eligible },
        });
        if (result.updateAlbumGameStatus.success) success++;
        else failed++;
      } catch {
        failed++;
      }
    }

    toast.dismiss(toastId);
    if (failed === 0) {
      toast.success(`${success} albums approved`);
    } else {
      toast.warning(`${success} approved, ${failed} failed`);
    }
    resetSelection();
    invalidateAll();
    setBulkAction(null);
  };

  const handleBulkQueue = async () => {
    const ids = Array.from(selectedIds);
    setBulkAction('queue');
    const toastId = toast.loading(`Queuing ${ids.length} albums...`);
    let success = 0;
    let failed = 0;

    for (const albumId of ids) {
      try {
        const result = await addToQueue({ albumId });
        if (result.addAlbumToQueue.success) success++;
        else failed++;
      } catch {
        failed++;
      }
    }

    toast.dismiss(toastId);
    if (failed === 0) {
      toast.success(`${success} albums added to queue`);
    } else {
      toast.warning(`${success} queued, ${failed} failed`);
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

  const handlePrevPage = () => {
    setOffset(Math.max(0, offset - PAGE_SIZE));
    resetSelection();
  };

  const handleNextPage = () => {
    setOffset(offset + PAGE_SIZE);
    resetSelection();
  };

  return (
    <div className='space-y-4'>
      {/* Filter Controls */}
      <div className='flex flex-wrap items-center gap-3'>
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
              onClick={handleBulkApprove}
            >
              {bulkAction === 'approve' ? (
                <Loader2 className='h-4 w-4 mr-1 animate-spin' />
              ) : (
                <CheckCircle className='h-4 w-4 mr-1' />
              )}
              Approve All
            </Button>
            <Button
              size='sm'
              variant='outline'
              className='text-amber-500 border-amber-500/20 hover:bg-amber-500/10'
              disabled={isBulkRunning}
              onClick={handleBulkQueue}
            >
              {bulkAction === 'queue' ? (
                <Loader2 className='h-4 w-4 mr-1 animate-spin' />
              ) : (
                <Zap className='h-4 w-4 mr-1' />
              )}
              Queue All
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
            : 'No suggested albums found'}
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
                <TableHead className='w-64'>Actions</TableHead>
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
                          disabled={isBulkRunning}
                          onClick={() => handleApprove(album.id)}
                        >
                          <CheckCircle className='h-4 w-4 mr-1' />
                          Approve
                        </Button>
                        <Button
                          size='sm'
                          variant='outline'
                          className='text-amber-500 border-amber-500/20 hover:bg-amber-500/10'
                          disabled={isAddingToQueue || isBulkRunning}
                          onClick={() =>
                            handleAddToQueue(album.id, album.title)
                          }
                        >
                          <Zap className='h-4 w-4 mr-1' />
                          Queue
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
      {albums.length > 0 && (
        <div className='flex items-center justify-between'>
          <p className='text-sm text-zinc-500'>
            Showing {offset + 1}–{offset + albums.length}
          </p>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              size='sm'
              disabled={offset === 0}
              onClick={handlePrevPage}
            >
              <ChevronLeft className='h-4 w-4 mr-1' />
              Previous
            </Button>
            <Button
              variant='outline'
              size='sm'
              disabled={albums.length < PAGE_SIZE}
              onClick={handleNextPage}
            >
              Next
              <ChevronRight className='h-4 w-4 ml-1' />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
