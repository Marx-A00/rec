'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  X,
  Plus,
  Search,
  Loader2,
  User,
  Trash2,
  ListMusic,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';

import AlbumImage from '@/components/ui/AlbumImage';
import AnimatedLoader from '@/components/ui/AnimatedLoader';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeletons/Skeleton';
import {
  useMarqueeAlbumsQuery,
  useAddAlbumToMarqueeMutation,
  useRemoveMarqueeAlbumMutation,
} from '@/generated/graphql';

export function MarqueeManager() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useMarqueeAlbumsQuery();
  const entries = useMemo(() => data?.marqueeAlbums ?? [], [data]);

  const { mutateAsync: removeMarquee, isPending: isRemoving } =
    useRemoveMarqueeAlbumMutation({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['MarqueeAlbums'] });
      },
    });

  const { mutateAsync: addToMarquee, isPending: isAdding } =
    useAddAlbumToMarqueeMutation();

  // Add dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [mode, setMode] = useState<'search' | 'preview'>('search');
  const [selectedResult, setSelectedResult] =
    useState<UnifiedSearchResult | null>(null);
  const [albumQuery, setAlbumQuery] = useState('');
  const [artistQuery, setArtistQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const searchOptions: UseUniversalSearchOptions = {
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
    enabled: searchQuery.length >= 2,
    searchMode: 'LOCAL_AND_EXTERNAL',
  };

  const { results: searchResults = [], isLoading: isSearching } =
    useUniversalSearch(searchQuery, searchOptions);

  const albumResults = useMemo(
    () =>
      searchResults.filter(
        r => r.type === 'album' && r.primaryType !== 'Single'
      ),
    [searchResults]
  );

  // Albums already in the marquee — to flag duplicates in search
  const marqueeAlbumIds = useMemo(() => {
    const set = new Set<string>();
    entries.forEach(e => set.add(e.album.id));
    return set;
  }, [entries]);

  const marqueeMbIds = useMemo(() => {
    const set = new Set<string>();
    entries.forEach(e => {
      if (e.album.musicbrainzId) set.add(e.album.musicbrainzId);
    });
    return set;
  }, [entries]);

  const isInMarquee = useCallback(
    (result: UnifiedSearchResult): boolean => {
      if (result.source === 'local' && marqueeAlbumIds.has(result.id))
        return true;
      if (result.source === 'musicbrainz' && marqueeMbIds.has(result.id))
        return true;
      return false;
    },
    [marqueeAlbumIds, marqueeMbIds]
  );

  const triggerSearch = useCallback(() => {
    if (!hasSearchableInput(albumQuery, artistQuery)) return;
    const query = buildDualInputQuery(albumQuery, artistQuery);
    if (query) setSearchQuery(query);
  }, [albumQuery, artistQuery]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        triggerSearch();
      }
    },
    [triggerSearch]
  );

  const resetDialog = useCallback(() => {
    setMode('search');
    setSelectedResult(null);
    setAlbumQuery('');
    setArtistQuery('');
    setSearchQuery('');
  }, []);

  const handleRemove = async (id: string, albumTitle: string) => {
    try {
      await removeMarquee({ id });
      toast.success(`Removed "${albumTitle}" from marquee`);
    } catch {
      toast.error('Failed to remove from marquee');
    }
  };

  const handleConfirmAdd = useCallback(async () => {
    if (!selectedResult) return;
    try {
      const res = await addToMarquee({
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

      if (res.addAlbumToMarquee.success) {
        toast.success(
          res.addAlbumToMarquee.message ||
            `"${selectedResult.title}" added to marquee`
        );
        setSelectedResult(null);
        setMode('search');
        queryClient.invalidateQueries({ queryKey: ['MarqueeAlbums'] });
      } else {
        toast.error(res.addAlbumToMarquee.error || 'Failed to add to marquee');
      }
    } catch (error) {
      toast.error('Failed to add album to marquee');
      console.error('Add to marquee error:', error);
    }
  }, [selectedResult, addToMarquee, queryClient]);

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <Button
          variant='outline'
          size='sm'
          className='h-9'
          onClick={() => setAddOpen(true)}
        >
          <Plus className='h-4 w-4 mr-1' />
          Add Album
        </Button>
        {!isLoading && (
          <span className='text-zinc-400 text-sm'>
            {entries.length} album{entries.length !== 1 ? 's' : ''} in marquee
          </span>
        )}
      </div>

      {isLoading ? (
        <div className='rounded-lg border border-zinc-800 overflow-hidden'>
          <Table>
            <TableHeader>
              <TableRow className='border-zinc-800 hover:bg-transparent'>
                <TableHead className='text-zinc-400 w-[96px]'>Cover</TableHead>
                <TableHead className='text-zinc-400'>Album</TableHead>
                <TableHead className='text-zinc-400'>Artist</TableHead>
                <TableHead className='text-zinc-400 w-36'>Added</TableHead>
                <TableHead className='text-zinc-400 w-16'></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i} className='border-zinc-800'>
                  <TableCell>
                    <Skeleton className='w-20 h-20 rounded' />
                  </TableCell>
                  <TableCell>
                    <Skeleton className='h-4 w-40' />
                  </TableCell>
                  <TableCell>
                    <Skeleton className='h-4 w-28' />
                  </TableCell>
                  <TableCell>
                    <Skeleton className='h-4 w-24' />
                  </TableCell>
                  <TableCell>
                    <Skeleton className='h-8 w-8 rounded' />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : entries.length === 0 ? (
        <div className='text-zinc-400 text-sm py-8 text-center'>
          No albums in the marquee yet. Click &quot;Add Album&quot; to get
          started.
        </div>
      ) : (
        <div className='rounded-lg border border-zinc-800 overflow-hidden'>
          <Table>
            <TableHeader>
              <TableRow className='border-zinc-800 hover:bg-transparent'>
                <TableHead className='text-zinc-400 w-[96px]'>Cover</TableHead>
                <TableHead className='text-zinc-400'>Album</TableHead>
                <TableHead className='text-zinc-400'>Artist</TableHead>
                <TableHead className='text-zinc-400 w-36'>Added</TableHead>
                <TableHead className='text-zinc-400 w-16'></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map(entry => {
                const artistNames = entry.album.artists
                  .map(a => a.artist.name)
                  .join(', ');
                return (
                  <TableRow
                    key={entry.id}
                    className='border-zinc-800 hover:bg-zinc-800/50'
                  >
                    <TableCell>
                      <div className='w-20 h-20 rounded overflow-hidden'>
                        <AlbumImage
                          src={entry.album.coverArtUrl}
                          cloudflareImageId={entry.album.cloudflareImageId}
                          alt={entry.album.title}
                          width={80}
                          height={80}
                          className='object-cover'
                        />
                      </div>
                    </TableCell>
                    <TableCell className='font-medium text-white'>
                      {entry.album.title}
                    </TableCell>
                    <TableCell className='text-zinc-300'>
                      {artistNames}
                    </TableCell>
                    <TableCell className='text-zinc-500 text-sm'>
                      {format(new Date(entry.createdAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant='ghost'
                        size='sm'
                        disabled={isRemoving}
                        onClick={() =>
                          handleRemove(entry.id, entry.album.title)
                        }
                        className='h-8 w-8 p-0 text-zinc-500 hover:text-red-400'
                        title='Remove from marquee'
                      >
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Album Dialog */}
      <Dialog
        open={addOpen}
        onOpenChange={open => {
          setAddOpen(open);
          if (!open) resetDialog();
        }}
      >
        <DialogContent className={mode === 'preview' ? 'max-w-sm' : 'max-w-lg'}>
          {mode === 'search' ? (
            <>
              <DialogHeader>
                <DialogTitle>Add Album to Marquee</DialogTitle>
                <DialogDescription>
                  Search by album title, artist name, or both
                </DialogDescription>
              </DialogHeader>
              <div className='pt-2 space-y-3 overflow-hidden'>
                <div className='relative'>
                  <Search className='absolute left-3 top-3 h-4 w-4 text-zinc-400' />
                  <input
                    type='text'
                    placeholder='Album title...'
                    value={albumQuery}
                    onChange={e => setAlbumQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    className='w-full pl-10 pr-9 py-2.5 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cosmic-latte transition-colors'
                  />
                  {albumQuery && (
                    <button
                      type='button'
                      onClick={() => setAlbumQuery('')}
                      className='absolute right-3 top-3 text-zinc-500 hover:text-zinc-300 transition-colors'
                    >
                      <X className='h-4 w-4' />
                    </button>
                  )}
                </div>

                <div className='relative'>
                  <User className='absolute left-3 top-3 h-4 w-4 text-zinc-400' />
                  <input
                    type='text'
                    placeholder='Artist name...'
                    value={artistQuery}
                    onChange={e => setArtistQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className='w-full pl-10 pr-9 py-2.5 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cosmic-latte transition-colors'
                  />
                  {artistQuery && (
                    <button
                      type='button'
                      onClick={() => setArtistQuery('')}
                      className='absolute right-3 top-3 text-zinc-500 hover:text-zinc-300 transition-colors'
                    >
                      <X className='h-4 w-4' />
                    </button>
                  )}
                </div>

                <div className='flex items-center gap-2'>
                  <Button
                    size='sm'
                    className='h-9'
                    disabled={!hasSearchableInput(albumQuery, artistQuery)}
                    onClick={triggerSearch}
                  >
                    <Search className='h-4 w-4 mr-1.5' />
                    Search
                  </Button>
                  {hasSearchableInput(albumQuery, artistQuery) &&
                    !searchQuery && (
                      <span className='text-xs text-zinc-500'>
                        or press Enter
                      </span>
                    )}
                </div>

                {isSearching && (
                  <div className='flex justify-center py-6'>
                    <AnimatedLoader className='scale-50' />
                  </div>
                )}

                {!isSearching && searchQuery && albumResults.length === 0 && (
                  <p className='text-center text-sm text-zinc-500 py-4'>
                    No albums found
                  </p>
                )}

                {!isSearching && albumResults.length > 0 && (
                  <div className='space-y-1.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar'>
                    {albumResults.map(result => (
                      <div
                        key={result.id}
                        onClick={() => {
                          setSelectedResult(result);
                          setMode('preview');
                        }}
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
                            {isInMarquee(result) && (
                              <span className='inline-flex items-center gap-0.5 rounded bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-medium text-blue-400 leading-none flex-shrink-0'>
                                <CheckCircle2 className='h-2.5 w-2.5' />
                                In Marquee
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
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <div className='flex items-center gap-2'>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-8 w-8 p-0'
                    onClick={() => {
                      setSelectedResult(null);
                      setMode('search');
                    }}
                  >
                    <ArrowLeft className='h-4 w-4' />
                  </Button>
                  <div>
                    <DialogTitle>Confirm Album</DialogTitle>
                    <DialogDescription>
                      Review before adding to marquee
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              {selectedResult && (
                <div className='flex flex-col items-center gap-4 pt-2'>
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

                  {isInMarquee(selectedResult) ? (
                    <p className='text-sm text-zinc-500 mt-2'>
                      This album is already in the marquee.
                    </p>
                  ) : (
                    <Button
                      className='w-full mt-2'
                      disabled={isAdding}
                      onClick={handleConfirmAdd}
                    >
                      {isAdding ? (
                        <>
                          <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className='h-4 w-4 mr-2' />
                          Add to Marquee
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
