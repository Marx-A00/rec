'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Music, Loader2, ListMusic, Disc3, Filter } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    if (!previewId) return;
    setImporting(true);
    try {
      const result = await importDeezer({ playlistId: previewId });
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
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant='outline' className='gap-2'>
          <Music className='h-4 w-4' />
          Import Playlist
        </Button>
      </DialogTrigger>
      <DialogContent className='max-w-2xl max-h-[80vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Import Deezer Playlist</DialogTitle>
          <DialogDescription>
            Pick a preset decade playlist or paste any Deezer playlist URL to
            preview and import albums into the game pool.
          </DialogDescription>
        </DialogHeader>

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
          <div className='space-y-2'>
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
          <div className='space-y-4'>
            {/* Playlist Info */}
            <div className='flex gap-4 items-start'>
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
            <div className='grid grid-cols-3 gap-3'>
              <div className='rounded-md bg-zinc-800/50 p-3 text-center'>
                <ListMusic className='h-4 w-4 mx-auto mb-1 text-zinc-400' />
                <div className='text-lg font-bold text-white'>
                  {preview.stats.totalTracks}
                </div>
                <div className='text-xs text-zinc-500'>Total Tracks</div>
              </div>
              <div className='rounded-md bg-zinc-800/50 p-3 text-center'>
                <Disc3 className='h-4 w-4 mx-auto mb-1 text-zinc-400' />
                <div className='text-lg font-bold text-white'>
                  {preview.stats.albumsAfterFilter}
                </div>
                <div className='text-xs text-zinc-500'>Albums to Import</div>
              </div>
              <div className='rounded-md bg-zinc-800/50 p-3 text-center'>
                <Filter className='h-4 w-4 mx-auto mb-1 text-zinc-400' />
                <div className='text-lg font-bold text-white'>
                  {preview.stats.singlesFiltered +
                    preview.stats.compilationsFiltered}
                </div>
                <div className='text-xs text-zinc-500'>Filtered Out</div>
              </div>
            </div>

            {/* Album List */}
            <div className='rounded-md border border-zinc-800 max-h-[300px] overflow-y-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-12'>Cover</TableHead>
                    <TableHead>Album</TableHead>
                    <TableHead>Artist</TableHead>
                    <TableHead className='w-16'>Year</TableHead>
                    <TableHead className='w-16'>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.albums.map(album => (
                    <TableRow key={album.deezerId}>
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
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <DialogFooter>
          {preview ? (
            <div className='flex gap-2 w-full justify-between'>
              <Button variant='ghost' onClick={handleReset}>
                Reset
              </Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? (
                  <>
                    <Loader2 className='h-4 w-4 animate-spin mr-2' />
                    Importing...
                  </>
                ) : (
                  `Import ${preview.stats.albumsAfterFilter} Albums`
                )}
              </Button>
            </div>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
