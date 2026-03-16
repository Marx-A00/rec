'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  X,
  XCircle,
  Plus,
  Search,
  Loader2,
  ListMusic,
  ArrowLeft,
  User,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

import AlbumImage from '@/components/ui/AlbumImage';
import AnimatedLoader from '@/components/ui/AnimatedLoader';
import { PlaylistImportDialog } from '@/components/admin/game-pool/PlaylistImportDialog';
import { ClaudeRecommendationsView } from '@/components/admin/game-pool/ClaudeRecommendationsView';
import type { UnifiedSearchResult } from '@/types/search';
import {
  useUniversalSearch,
  type UseUniversalSearchOptions,
} from '@/hooks/useUniversalSearch';
import {
  buildDualInputQuery,
  hasSearchableInput,
} from '@/lib/musicbrainz/query-builder';
import { sanitizeArtistName } from '@/lib/utils';
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
import { TablePagination } from '@/components/ui/table-pagination';
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
  useCuratedChallengesQuery,
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

export function SuggestedAlbumsTable() {
  const queryClient = useQueryClient();
  const [offset, setOffset] = useState(0);
  const [syncSource, setSyncSource] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState<string | undefined>(undefined);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [addExternalOpen, setAddExternalOpen] = useState(false);
  const [playlistImportOpen, setPlaylistImportOpen] = useState(false);
  const [externalMode, setExternalMode] = useState<
    'menu' | 'search' | 'preview' | 'claude'
  >('menu');
  const [selectedResult, setSelectedResult] =
    useState<UnifiedSearchResult | null>(null);

  // Dual-input external search state
  const [extAlbumQuery, setExtAlbumQuery] = useState('');
  const [extArtistQuery, setExtArtistQuery] = useState('');
  const [extSearchQuery, setExtSearchQuery] = useState('');

  const { data, isLoading } = useSuggestedGameAlbumsQuery({
    limit: PAGE_SIZE,
    offset,
    syncSource: syncSource === 'all' ? undefined : syncSource,
    search: searchQuery,
  });

  const { mutateAsync: updateStatus } = useUpdateAlbumGameStatusMutation();

  const { mutateAsync: addToPool, isPending: isAddingToPool } =
    useAddAlbumToPoolMutation();

  const { mutateAsync: addExternalToPool, isPending: isAddingExternal } =
    useAddAlbumToPoolMutation();

  // External search hook (dual-input: album + artist)
  const extSearchOptions: UseUniversalSearchOptions = {
    entityTypes: [
      {
        type: 'album',
        displayName: 'Albums',
        searchFields: ['title', 'artist', 'year'],
        weight: 1,
        deduplicate: true,
        maxResults: 20,
      },
    ],
    searchType: 'albums',
    filters: [],
    debounceMs: 0,
    minQueryLength: 2,
    maxResults: 20,
    enabled: extSearchQuery.length >= 2,
    searchMode: 'LOCAL_AND_EXTERNAL',
  };

  const { results: extSearchResults = [], isLoading: isExtSearching } =
    useUniversalSearch(extSearchQuery, extSearchOptions);

  const extAlbumResults = useMemo(
    () =>
      extSearchResults.filter(
        r => r.type === 'album' && r.primaryType !== 'Single'
      ),
    [extSearchResults]
  );

  // Fetch pool entries to cross-reference search results
  const { data: poolData } = useCuratedChallengesQuery(
    { limit: 2000 },
    { enabled: addExternalOpen }
  );

  // Build lookup sets for "In Pool" badge
  const poolMbIds = useMemo(() => {
    const set = new Set<string>();
    poolData?.curatedChallenges?.forEach(entry => {
      if (entry.album.musicbrainzId) {
        set.add(entry.album.musicbrainzId);
      }
    });
    return set;
  }, [poolData?.curatedChallenges]);

  const poolAlbumIds = useMemo(() => {
    const set = new Set<string>();
    poolData?.curatedChallenges?.forEach(entry => {
      set.add(entry.album.id);
    });
    return set;
  }, [poolData?.curatedChallenges]);

  /** Check if a search result is already in the pool */
  const isInPool = useCallback(
    (result: UnifiedSearchResult): boolean => {
      // For local results, check by album ID
      if (result.source === 'local' && poolAlbumIds.has(result.id)) {
        return true;
      }
      // For MusicBrainz results, check by MB ID
      if (result.source === 'musicbrainz' && poolMbIds.has(result.id)) {
        return true;
      }
      return false;
    },
    [poolAlbumIds, poolMbIds]
  );

  const triggerExtSearch = useCallback(() => {
    if (!hasSearchableInput(extAlbumQuery, extArtistQuery)) return;
    const query = buildDualInputQuery(extAlbumQuery, extArtistQuery);
    if (query) {
      setExtSearchQuery(query);
    }
  }, [extAlbumQuery, extArtistQuery]);

  const handleExtKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        triggerExtSearch();
      }
    },
    [triggerExtSearch]
  );

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['SuggestedGameAlbums'] });
    queryClient.invalidateQueries({ queryKey: ['AlbumsByGameStatus'] });
    queryClient.invalidateQueries({ queryKey: ['GamePoolStats'] });
    queryClient.invalidateQueries({ queryKey: ['CuratedChallenges'] });
    queryClient.invalidateQueries({ queryKey: ['UncoverPoolStatus'] });
  }, [queryClient]);

  const handleExternalSearchSelect = useCallback(
    (result: UnifiedSearchResult) => {
      if (result.type !== 'album') return;
      setSelectedResult(result);
      setExternalMode('preview');
    },
    []
  );

  const handleConfirmAddToPool = useCallback(async () => {
    if (!selectedResult) return;

    try {
      const res = await addExternalToPool({
        albumData: {
          title: selectedResult.title,
          musicbrainzId:
            selectedResult.source === 'musicbrainz'
              ? selectedResult.id
              : undefined,
          releaseDate: selectedResult.releaseDate || undefined,
          coverImageUrl:
            selectedResult.image?.url ||
            selectedResult.cover_image ||
            undefined,
          artists: [
            {
              artistName: selectedResult.artist || 'Unknown Artist',
              role: 'PRIMARY',
            },
          ],
        },
      });

      if (res.addAlbumToPool.success) {
        toast.success(
          res.addAlbumToPool.message ||
            `"${selectedResult.title}" added to pool`
        );
        // Go back to search results so user can add more albums
        setSelectedResult(null);
        setExternalMode('search');
        invalidateAll();
      } else {
        toast.error(res.addAlbumToPool.error || 'Failed to add to pool');
      }
    } catch (error) {
      toast.error('Failed to add album to pool');
      console.error('Add external to pool error:', error);
    }
  }, [selectedResult, addExternalToPool, invalidateAll]);

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

      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={goToPage}
        totalCount={totalCount}
        currentPageItemCount={albums.length}
      />

      {/* Add External Dialog */}
      <Dialog
        open={addExternalOpen}
        onOpenChange={open => {
          setAddExternalOpen(open);
          if (!open) {
            setExternalMode('menu');
            setExtAlbumQuery('');
            setExtArtistQuery('');
            setExtSearchQuery('');
          }
        }}
      >
        <DialogContent
          className={
            externalMode === 'claude'
              ? 'max-w-4xl max-h-[85vh] overflow-hidden p-0 flex flex-col'
              : externalMode === 'search'
                ? 'max-w-lg'
                : externalMode === 'preview'
                  ? 'max-w-sm'
                  : 'max-w-sm'
          }
        >
          {externalMode === 'menu' ? (
            <>
              <DialogHeader>
                <DialogTitle>Add External Album</DialogTitle>
                <DialogDescription>
                  Add an album to the pool from an external source
                </DialogDescription>
              </DialogHeader>
              <div className='grid grid-cols-3 gap-3 pt-2'>
                <Button
                  variant='outline'
                  className='flex flex-col items-center gap-2 h-24 hover:bg-zinc-800'
                  onClick={() => setExternalMode('search')}
                >
                  <Search className='h-5 w-5' />
                  <span className='text-sm'>Search</span>
                </Button>
                <Button
                  variant='outline'
                  className='flex flex-col items-center gap-2 h-24 hover:bg-zinc-800'
                  onClick={() => {
                    setAddExternalOpen(false);
                    setExternalMode('menu');
                    setPlaylistImportOpen(true);
                  }}
                >
                  <ListMusic className='h-5 w-5' />
                  <span className='text-sm'>Import Playlist</span>
                </Button>
                <Button
                  variant='outline'
                  className='flex flex-col items-center gap-2 h-24 hover:bg-zinc-800'
                  onClick={() => setExternalMode('claude')}
                >
                  <Sparkles className='h-5 w-5' />
                  <span className='text-sm'>Claude Picks</span>
                </Button>
              </div>
            </>
          ) : externalMode === 'search' ? (
            <>
              <DialogHeader>
                <div className='flex items-center gap-2'>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-8 w-8 p-0'
                    onClick={() => {
                      setExternalMode('menu');
                      setExtAlbumQuery('');
                      setExtArtistQuery('');
                      setExtSearchQuery('');
                    }}
                  >
                    <ArrowLeft className='h-4 w-4' />
                  </Button>
                  <div>
                    <DialogTitle>Search Albums</DialogTitle>
                    <DialogDescription>
                      Search by album title, artist name, or both
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className='pt-2 space-y-3 overflow-hidden'>
                {/* Album title input */}
                <div className='relative'>
                  <Search className='absolute left-3 top-3 h-4 w-4 text-zinc-400' />
                  <input
                    type='text'
                    placeholder='Album title...'
                    value={extAlbumQuery}
                    onChange={e => setExtAlbumQuery(e.target.value)}
                    onKeyDown={handleExtKeyDown}
                    autoFocus
                    className='w-full pl-10 pr-9 py-2.5 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cosmic-latte transition-colors'
                  />
                  {extAlbumQuery && (
                    <button
                      type='button'
                      onClick={() => setExtAlbumQuery('')}
                      className='absolute right-3 top-3 text-zinc-500 hover:text-zinc-300 transition-colors'
                    >
                      <X className='h-4 w-4' />
                    </button>
                  )}
                </div>

                {/* Artist name input */}
                <div className='relative'>
                  <User className='absolute left-3 top-3 h-4 w-4 text-zinc-400' />
                  <input
                    type='text'
                    placeholder='Artist name...'
                    value={extArtistQuery}
                    onChange={e => setExtArtistQuery(e.target.value)}
                    onKeyDown={handleExtKeyDown}
                    className='w-full pl-10 pr-9 py-2.5 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cosmic-latte transition-colors'
                  />
                  {extArtistQuery && (
                    <button
                      type='button'
                      onClick={() => setExtArtistQuery('')}
                      className='absolute right-3 top-3 text-zinc-500 hover:text-zinc-300 transition-colors'
                    >
                      <X className='h-4 w-4' />
                    </button>
                  )}
                </div>

                {/* Search button + hint */}
                <div className='flex items-center gap-2'>
                  <Button
                    size='sm'
                    className='h-9'
                    disabled={
                      !hasSearchableInput(extAlbumQuery, extArtistQuery)
                    }
                    onClick={triggerExtSearch}
                  >
                    <Search className='h-4 w-4 mr-1.5' />
                    Search
                  </Button>
                  {hasSearchableInput(extAlbumQuery, extArtistQuery) &&
                    !extSearchQuery && (
                      <span className='text-xs text-zinc-500'>
                        or press Enter
                      </span>
                    )}
                </div>

                {/* Results */}
                {isExtSearching && (
                  <div className='flex justify-center py-6'>
                    <AnimatedLoader className='scale-50' />
                  </div>
                )}

                {!isExtSearching &&
                  extSearchQuery &&
                  extAlbumResults.length === 0 && (
                    <p className='text-center text-sm text-zinc-500 py-4'>
                      No albums found
                    </p>
                  )}

                {!isExtSearching && extAlbumResults.length > 0 && (
                  <div className='space-y-1.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar'>
                    {extAlbumResults.map(result => (
                      <div
                        key={result.id}
                        onClick={() => handleExternalSearchSelect(result)}
                        className='flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-zinc-800 transition-colors overflow-hidden'
                      >
                        <div className='w-10 h-10 flex-shrink-0'>
                          <AlbumImage
                            src={result.image?.url || result.cover_image}
                            alt={result.title}
                            width={40}
                            height={40}
                            className='w-full h-full rounded object-cover'
                          />
                        </div>
                        <div className='min-w-0 flex-1'>
                          <div className='flex items-center gap-1.5 min-w-0'>
                            <span className='text-sm font-medium text-white truncate'>
                              {result.title}
                            </span>
                            {result.source === 'local' && (
                              <span className='inline-flex items-center gap-0.5 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 leading-none flex-shrink-0'>
                                <CheckCircle2 className='h-2.5 w-2.5' />
                                In DB
                              </span>
                            )}
                            {isInPool(result) && (
                              <span className='inline-flex items-center gap-0.5 rounded bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-medium text-blue-400 leading-none flex-shrink-0'>
                                <CheckCircle2 className='h-2.5 w-2.5' />
                                In Pool
                              </span>
                            )}
                          </div>
                          <p className='text-xs text-zinc-400 truncate'>
                            {sanitizeArtistName(
                              result.artist || 'Unknown Artist'
                            )}
                            {result.releaseDate && (
                              <span className='text-zinc-600'>
                                {' '}
                                &middot;{' '}
                                {new Date(result.releaseDate).getFullYear()}
                              </span>
                            )}
                          </p>
                        </div>
                        {result.source !== 'local' && (
                          <span className='text-[10px] text-zinc-600 flex-shrink-0'>
                            {result.source === 'musicbrainz'
                              ? 'MB'
                              : result.source}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : externalMode === 'preview' ? (
            <>
              <DialogHeader>
                <div className='flex items-center gap-2'>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-8 w-8 p-0'
                    onClick={() => {
                      setSelectedResult(null);
                      setExternalMode('search');
                    }}
                  >
                    <ArrowLeft className='h-4 w-4' />
                  </Button>
                  <div>
                    <DialogTitle>Confirm Album</DialogTitle>
                    <DialogDescription>
                      Review before adding to pool
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              {selectedResult && (
                <div className='flex flex-col items-center gap-4 pt-2'>
                  {/* Album Cover */}
                  <div className='relative w-48 h-48 rounded-lg overflow-hidden bg-zinc-800 shrink-0'>
                    {selectedResult.image?.url || selectedResult.cover_image ? (
                      <AlbumImage
                        src={
                          selectedResult.image?.url ||
                          selectedResult.cover_image ||
                          ''
                        }
                        alt={selectedResult.title}
                        width={192}
                        height={192}
                        className='w-full h-full object-cover'
                      />
                    ) : (
                      <div className='w-full h-full flex items-center justify-center text-zinc-600'>
                        <ListMusic className='h-12 w-12' />
                      </div>
                    )}
                  </div>

                  {/* Album Details */}
                  <div className='text-center space-y-1 w-full min-w-0'>
                    <p className='font-semibold text-white text-lg leading-tight line-clamp-2'>
                      {selectedResult.title}
                    </p>
                    <p className='text-zinc-400 text-sm truncate'>
                      {selectedResult.artist || 'Unknown Artist'}
                    </p>
                    {selectedResult.releaseDate && (
                      <p className='text-zinc-500 text-xs'>
                        {new Date(selectedResult.releaseDate).getFullYear()}
                      </p>
                    )}
                  </div>

                  {/* Status Badges */}
                  <div className='flex flex-wrap items-center justify-center gap-2'>
                    <span className='inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700'>
                      {selectedResult.source === 'musicbrainz'
                        ? 'MusicBrainz'
                        : selectedResult.source === 'local'
                          ? 'Local DB'
                          : selectedResult.source}
                    </span>
                    {selectedResult.source === 'local' && (
                      <span className='inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-500/15 text-emerald-400'>
                        <CheckCircle2 className='h-3 w-3' />
                        In DB
                      </span>
                    )}
                    {isInPool(selectedResult) && (
                      <span className='inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-500/15 text-blue-400'>
                        <CheckCircle2 className='h-3 w-3' />
                        In Pool
                      </span>
                    )}
                  </div>

                  {/* Action Button */}
                  {isInPool(selectedResult) ? (
                    <p className='text-sm text-zinc-500 mt-2'>
                      This album is already in the pool.
                    </p>
                  ) : (
                    <Button
                      className='w-full mt-2'
                      disabled={isAddingExternal}
                      onClick={handleConfirmAddToPool}
                    >
                      {isAddingExternal ? (
                        <>
                          <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className='h-4 w-4 mr-2' />
                          Add to Pool
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className='flex flex-col h-full min-h-0 p-6'>
              <ClaudeRecommendationsView
                onBack={() => setExternalMode('menu')}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Playlist Import Dialog (controlled from "Add External" menu) */}
      <PlaylistImportDialog
        open={playlistImportOpen}
        onOpenChange={setPlaylistImportOpen}
      />
    </div>
  );
}
