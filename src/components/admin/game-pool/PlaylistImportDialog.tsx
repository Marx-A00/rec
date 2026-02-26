'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Music, Loader2, ListMusic, Disc3, Filter } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  usePreviewDeezerPlaylistQuery,
  useImportDeezerPlaylistMutation,
} from '@/generated/graphql';

// ============================================================================
// Preset Playlists
// ============================================================================

const PRESET_PLAYLISTS = [
  { id: '867825522', label: '80s Hits', tracks: 100 },
  { id: '1026896351', label: '90s Hits', tracks: 44 },
  { id: '1318937087', label: '2000s Hits', tracks: 209 },
  { id: '11153461484', label: '2010s Hits', tracks: 100 },
] as const;

// ============================================================================
// Component
// ============================================================================

export function PlaylistImportDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [playlistInput, setPlaylistInput] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const {
    data: deezerPreview,
    isLoading: isPreviewing,
    error: previewError,
  } = usePreviewDeezerPlaylistQuery(
    { playlistId: previewId! },
    { enabled: !!previewId }
  );

  const { mutateAsync: importDeezer } = useImportDeezerPlaylistMutation();

  const preview = deezerPreview?.previewDeezerPlaylist ?? null;
  const albums = useMemo(() => preview?.albums ?? [], [preview]);

  // Select all albums when preview loads
  useEffect(() => {
    if (albums.length > 0) {
      setSelectedIds(new Set(albums.map(a => a.deezerId)));
    }
  }, [albums]);

  const toggleAlbum = useCallback((deezerId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(deezerId)) {
        next.delete(deezerId);
      } else {
        next.add(deezerId);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selectedIds.size === albums.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(albums.map(a => a.deezerId)));
    }
  }, [selectedIds.size, albums]);

  const allSelected = albums.length > 0 && selectedIds.size === albums.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < albums.length;

  const handlePreview = (id?: string) => {
    const trimmed = (id ?? playlistInput).trim();
    if (!trimmed) {
      toast.error('Enter a Deezer playlist URL or ID');
      return;
    }
    setPlaylistInput(trimmed);
    setPreviewId(trimmed);
  };

  const handleImport = async () => {
    if (!previewId || selectedIds.size === 0) return;
    setImporting(true);
    try {
      const result = await importDeezer({
        playlistId: previewId,
        selectedDeezerIds: Array.from(selectedIds),
      });
      if (result.importDeezerPlaylist.success) {
        toast.success(
          `Import started! Job ID: ${result.importDeezerPlaylist.jobId}`
        );
      } else {
        toast.error(result.importDeezerPlaylist.message || 'Import failed');
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['AlbumsByGameStatus'] });
      queryClient.invalidateQueries({ queryKey: ['SuggestedGameAlbums'] });
      queryClient.invalidateQueries({ queryKey: ['GamePoolStats'] });
      handleReset();
      setOpen(false);
    } catch (error) {
      toast.error('Failed to start import');
      console.error('Import error:', error);
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setPlaylistInput('');
    setPreviewId(null);
    setSelectedIds(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant='outline' className='gap-2'>
          <Music className='h-4 w-4' />
          Import Playlist
        </Button>
      </DialogTrigger>
      <DialogContent className='max-w-4xl max-h-[90vh] overflow-hidden p-0 flex flex-col'>
        {/* Fixed Header */}
        <div className='p-6 pb-4 shrink-0'>
          <DialogHeader>
            <DialogTitle>Import Deezer Playlist</DialogTitle>
            <DialogDescription>
              Pick a preset decade playlist or paste any Deezer playlist URL to
              preview and import albums into the game pool.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Scrollable Middle */}
        <div className='flex-1 min-h-0 overflow-y-auto custom-scrollbar px-6'>
          {/* Preset Quick-Picks */}
          {!preview && (
            <div className='space-y-2'>
              <p className='text-xs font-medium text-zinc-500 uppercase tracking-wider'>
                Quick picks
              </p>
              <div className='flex flex-wrap gap-2'>
                {PRESET_PLAYLISTS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => handlePreview(preset.id)}
                    disabled={isPreviewing}
                    className='inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-700/50 hover:text-white hover:border-zinc-600 transition-colors disabled:opacity-50'
                  >
                    <Disc3 className='h-3.5 w-3.5' />
                    {preset.label}
                    <span className='text-zinc-500 text-xs'>
                      ({preset.tracks})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom URL Input */}
          {!preview && (
            <div className='space-y-2 mt-4'>
              <p className='text-xs font-medium text-zinc-500 uppercase tracking-wider'>
                Or paste a URL
              </p>
              <div className='flex gap-2'>
                <Input
                  placeholder='https://www.deezer.com/playlist/867825522'
                  value={playlistInput}
                  onChange={e => {
                    setPlaylistInput(e.target.value);
                    if (previewId) setPreviewId(null);
                  }}
                  onKeyDown={e => e.key === 'Enter' && handlePreview()}
                />
                <Button onClick={() => handlePreview()} disabled={isPreviewing}>
                  {isPreviewing ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    'Preview'
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Loading */}
          {isPreviewing && (
            <div className='flex items-center justify-center py-8 gap-3 text-zinc-400'>
              <Loader2 className='h-5 w-5 animate-spin' />
              <span className='text-sm'>Loading playlist preview...</span>
            </div>
          )}

          {/* Error */}
          {previewError ? (
            <div className='rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400'>
              Failed to load playlist. Check the URL/ID and try again.
            </div>
          ) : null}

          {/* Preview Results */}
          {preview && (
            <div className='flex flex-col gap-4 h-full min-h-0'>
              {/* Playlist Info */}
              <div className='flex gap-4 items-start shrink-0'>
                {preview.image && (
                  <img
                    src={preview.image}
                    alt={preview.name}
                    className='w-20 h-20 rounded object-cover'
                  />
                )}
                <div className='flex-1 min-w-0'>
                  <h3 className='text-lg font-semibold text-white truncate'>
                    {preview.name}
                  </h3>
                  <p className='text-sm text-zinc-400'>by {preview.creator}</p>
                  {preview.description && (
                    <p className='text-sm text-zinc-500 mt-1 line-clamp-2'>
                      {preview.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className='flex items-center gap-4 text-xs text-zinc-400 shrink-0'>
                <span className='inline-flex items-center gap-1'>
                  <ListMusic className='h-3 w-3' />
                  {preview.stats.totalTracks} tracks
                </span>
                <span className='inline-flex items-center gap-1'>
                  <Disc3 className='h-3 w-3' />
                  <span className='text-white font-medium'>
                    {selectedIds.size}
                  </span>
                  /{albums.length} selected
                </span>
                {preview.stats.singlesFiltered +
                  preview.stats.compilationsFiltered >
                  0 && (
                  <span className='inline-flex items-center gap-1'>
                    <Filter className='h-3 w-3' />
                    {preview.stats.singlesFiltered +
                      preview.stats.compilationsFiltered}{' '}
                    filtered
                  </span>
                )}
              </div>

              {/* Selection Controls */}
              <div className='flex items-center justify-between shrink-0'>
                <button
                  onClick={toggleAll}
                  className='text-xs text-zinc-400 hover:text-white transition-colors'
                >
                  {allSelected ? 'Deselect all' : 'Select all'}
                </button>
                {someSelected && (
                  <span className='text-xs text-zinc-500'>
                    {albums.length - selectedIds.size} deselected
                  </span>
                )}
              </div>

              {/* Album List — this is the only thing that scrolls */}
              <div className='rounded-md border border-zinc-800 flex-1 min-h-0 overflow-y-auto custom-scrollbar'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='w-10 px-3'>
                        <Checkbox
                          checked={allSelected}
                          ref={el => {
                            if (el) {
                              (
                                el as unknown as HTMLInputElement
                              ).indeterminate = someSelected;
                            }
                          }}
                          onCheckedChange={toggleAll}
                        />
                      </TableHead>
                      <TableHead className='w-12'>Cover</TableHead>
                      <TableHead>Album</TableHead>
                      <TableHead>Artist</TableHead>
                      <TableHead className='w-16'>Year</TableHead>
                      <TableHead className='w-16'>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {albums.map(album => {
                      const isSelected = selectedIds.has(album.deezerId);
                      return (
                        <TableRow
                          key={album.deezerId}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'hover:bg-zinc-800/50'
                              : 'opacity-50 hover:opacity-70'
                          }`}
                          onClick={() => toggleAlbum(album.deezerId)}
                        >
                          <TableCell className='px-3'>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() =>
                                toggleAlbum(album.deezerId)
                              }
                              onClick={e => e.stopPropagation()}
                            />
                          </TableCell>
                          <TableCell>
                            {album.coverUrl ? (
                              <img
                                src={album.coverUrl}
                                alt={album.title}
                                className='w-8 h-8 rounded object-cover'
                              />
                            ) : (
                              <div className='w-8 h-8 rounded bg-zinc-800' />
                            )}
                          </TableCell>
                          <TableCell className='font-medium text-white text-sm'>
                            {album.title}
                          </TableCell>
                          <TableCell className='text-zinc-400 text-sm'>
                            {album.artist}
                          </TableCell>
                          <TableCell className='text-zinc-500 text-sm'>
                            {album.year || '—'}
                          </TableCell>
                          <TableCell className='text-zinc-500 text-xs'>
                            {album.albumType}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        {preview ? (
          <div className='shrink-0 px-6 py-4 border-t border-zinc-800 bg-zinc-950 flex gap-2 w-full justify-between'>
            <Button variant='ghost' onClick={handleReset}>
              Reset
            </Button>
            <Button
              onClick={handleImport}
              disabled={importing || selectedIds.size === 0}
            >
              {importing ? (
                <>
                  <Loader2 className='h-4 w-4 animate-spin mr-2' />
                  Importing...
                </>
              ) : (
                `Import ${selectedIds.size} Album${selectedIds.size !== 1 ? 's' : ''}`
              )}
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
