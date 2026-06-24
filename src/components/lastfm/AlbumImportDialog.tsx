'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Loader2, Check, Music, AlertCircle } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import AlbumImage from '@/components/ui/AlbumImage';
import {
  useAlbumImportMatchQuery,
  useGetMyCollectionsQuery,
  useAddAlbumToCollectionWithCreateMutation,
} from '@/generated/graphql';

interface AlbumImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export default function AlbumImportDialog({
  open,
  onOpenChange,
  onComplete,
}: AlbumImportDialogProps) {
  const { data: session } = useSession();

  // Collection selector
  const { data: collectionsData } = useGetMyCollectionsQuery(undefined, {
    enabled: open && !!session?.user?.id,
  });
  const collections = collectionsData?.myCollections ?? [];
  const [selectedCollectionId, setSelectedCollectionId] = useState<
    string | null
  >(null);

  // Use first collection as default
  const collectionId = selectedCollectionId ?? collections[0]?.id ?? '';

  // Fetch import matches
  const { data: matchData, isLoading: isMatching } = useAlbumImportMatchQuery(
    { collectionId },
    { enabled: open && !!collectionId }
  );

  const match = matchData?.albumImportMatch;

  // Import state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
  const [importComplete, setImportComplete] = useState(false);

  const addMutation = useAddAlbumToCollectionWithCreateMutation();

  // Auto-select all ready albums when data loads
  const readyAlbums = match?.readyNow ?? [];
  if (
    readyAlbums.length > 0 &&
    selectedIds.size === 0 &&
    !isImporting &&
    !importComplete
  ) {
    setSelectedIds(new Set(readyAlbums.map(a => a.id)));
  }

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selectedIds.size === readyAlbums.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(readyAlbums.map(a => a.id)));
    }
  }, [selectedIds.size, readyAlbums]);

  const handleImport = async () => {
    const toImport = readyAlbums.filter(a => selectedIds.has(a.id));
    if (toImport.length === 0) return;

    setIsImporting(true);
    setImportProgress({ done: 0, total: toImport.length });

    for (let i = 0; i < toImport.length; i++) {
      try {
        await addMutation.mutateAsync({
          input: {
            collectionId,
            albumId: toImport[i].id,
            position: 0,
          },
        });
      } catch {
        // Continue with remaining
      }
      setImportProgress({ done: i + 1, total: toImport.length });
    }

    setIsImporting(false);
    setImportComplete(true);
    onComplete?.();
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after close animation
    setTimeout(() => {
      setSelectedIds(new Set());
      setImportComplete(false);
      setImportProgress({ done: 0, total: 0 });
    }, 200);
  };

  const alreadyAdded = match?.alreadyAdded ?? [];
  const canBeFetched = match?.canBeFetched ?? [];
  const skipped = match?.skipped ?? [];
  const totalAlbums =
    readyAlbums.length +
    alreadyAdded.length +
    canBeFetched.length +
    skipped.length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='max-w-xl max-h-[85vh] overflow-hidden flex flex-col bg-zinc-900 border-zinc-700'>
        <DialogHeader>
          <DialogTitle className='text-white'>
            Import Last.fm Albums
          </DialogTitle>
          <DialogDescription className='text-zinc-400'>
            Add your most-played albums to your collection.
          </DialogDescription>
        </DialogHeader>

        {/* Collection selector */}
        {collections.length > 1 && (
          <div>
            <label className='text-xs font-medium text-zinc-400 mb-1.5 block'>
              Import to
            </label>
            <select
              value={collectionId}
              onChange={e => setSelectedCollectionId(e.target.value)}
              disabled={isImporting}
              className='w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cosmic-latte/50'
            >
              {collections.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Loading state */}
        {isMatching && (
          <div className='flex flex-col items-center gap-3 py-12'>
            <Loader2 className='w-6 h-6 animate-spin text-zinc-400' />
            <p className='text-sm text-zinc-500'>Matching your albums...</p>
          </div>
        )}

        {/* Results */}
        {match && !isMatching && (
          <div className='flex-1 overflow-y-auto space-y-5 pr-1 -mr-1'>
            {/* Import complete */}
            {importComplete && (
              <div className='bg-green-900/20 border border-green-700/30 rounded-lg p-4 flex items-center gap-3'>
                <Check className='w-5 h-5 text-green-400 shrink-0' />
                <p className='text-sm text-green-400'>
                  Added {importProgress.done} album
                  {importProgress.done !== 1 ? 's' : ''} to your collection.
                </p>
              </div>
            )}

            {/* Empty state */}
            {totalAlbums === 0 && (
              <div className='text-center py-12'>
                <Music className='w-8 h-8 text-zinc-600 mx-auto mb-3' />
                <p className='text-sm text-zinc-500'>
                  No albums found in your Last.fm data. Try syncing first.
                </p>
              </div>
            )}

            {/* Ready Now */}
            {readyAlbums.length > 0 && !importComplete && (
              <section>
                <div className='flex items-center justify-between mb-2'>
                  <h3 className='text-sm font-semibold text-white'>
                    Ready to import ({readyAlbums.length})
                  </h3>
                  <button
                    type='button'
                    onClick={toggleAll}
                    disabled={isImporting}
                    className='text-xs text-zinc-400 hover:text-white transition-colors'
                  >
                    {selectedIds.size === readyAlbums.length
                      ? 'Deselect all'
                      : 'Select all'}
                  </button>
                </div>
                <div className='space-y-1'>
                  {readyAlbums.map(album => (
                    <button
                      key={album.id}
                      type='button'
                      onClick={() => toggleSelect(album.id)}
                      disabled={isImporting}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                        selectedIds.has(album.id)
                          ? 'bg-cosmic-latte/10 border border-cosmic-latte/20'
                          : 'bg-zinc-800/50 border border-transparent hover:bg-zinc-800'
                      } ${isImporting ? 'opacity-60' : ''}`}
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          selectedIds.has(album.id)
                            ? 'bg-cosmic-latte border-cosmic-latte'
                            : 'border-zinc-600'
                        }`}
                      >
                        {selectedIds.has(album.id) && (
                          <Check className='w-3 h-3 text-black' />
                        )}
                      </div>
                      <div className='w-10 h-10 shrink-0 rounded overflow-hidden'>
                        <AlbumImage
                          src={album.coverArtUrl}
                          cloudflareImageId={album.cloudflareImageId}
                          alt={album.title}
                          width={40}
                          height={40}
                          className='w-full h-full object-cover'
                          sizes='40px'
                          showSkeleton={false}
                        />
                      </div>
                      <div className='flex-1 min-w-0'>
                        <p className='text-sm font-medium text-white truncate'>
                          {album.title}
                        </p>
                        {album.artistName && (
                          <p className='text-xs text-zinc-400 truncate'>
                            {album.artistName}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Already Added */}
            {alreadyAdded.length > 0 && (
              <section>
                <h3 className='text-sm font-semibold text-zinc-400 mb-2'>
                  Already in collection ({alreadyAdded.length})
                </h3>
                <div className='space-y-1'>
                  {alreadyAdded.map(album => (
                    <div
                      key={album.id}
                      className='flex items-center gap-3 px-3 py-2 rounded-lg bg-zinc-800/30 opacity-50'
                    >
                      <div className='w-5 h-5 rounded border-2 border-green-600 bg-green-600 flex items-center justify-center shrink-0'>
                        <Check className='w-3 h-3 text-white' />
                      </div>
                      <div className='w-10 h-10 shrink-0 rounded overflow-hidden'>
                        <AlbumImage
                          src={album.coverArtUrl}
                          cloudflareImageId={album.cloudflareImageId}
                          alt={album.title}
                          width={40}
                          height={40}
                          className='w-full h-full object-cover'
                          sizes='40px'
                          showSkeleton={false}
                        />
                      </div>
                      <div className='flex-1 min-w-0'>
                        <p className='text-sm font-medium text-zinc-400 truncate'>
                          {album.title}
                        </p>
                        {album.artistName && (
                          <p className='text-xs text-zinc-500 truncate'>
                            {album.artistName}
                          </p>
                        )}
                      </div>
                      <span className='text-[10px] font-medium text-green-500 bg-green-900/30 px-1.5 py-0.5 rounded-full shrink-0'>
                        Added
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Can Be Fetched */}
            {canBeFetched.length > 0 && (
              <section>
                <h3 className='text-sm font-semibold text-zinc-400 mb-1'>
                  Not in database yet ({canBeFetched.length})
                </h3>
                <p className='text-xs text-zinc-500 mb-2'>
                  These albums need to be fetched from MusicBrainz first.
                </p>
                <div className='space-y-1'>
                  {canBeFetched.map(album => (
                    <div
                      key={album.mbid}
                      className='flex items-center gap-3 px-3 py-2 rounded-lg bg-zinc-800/30'
                    >
                      <div className='w-10 h-10 shrink-0 rounded bg-zinc-700 flex items-center justify-center'>
                        <Music className='w-4 h-4 text-zinc-500' />
                      </div>
                      <div className='flex-1 min-w-0'>
                        <p className='text-sm font-medium text-zinc-300 truncate'>
                          {album.name}
                        </p>
                        <p className='text-xs text-zinc-500 truncate'>
                          {album.artistName}
                        </p>
                      </div>
                      <span className='text-[10px] text-zinc-500 shrink-0'>
                        {album.playcount.toLocaleString()} plays
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Skipped */}
            {skipped.length > 0 && (
              <section>
                <div className='flex items-center gap-1.5 mb-2'>
                  <AlertCircle className='w-3.5 h-3.5 text-zinc-500' />
                  <h3 className='text-sm font-semibold text-zinc-500'>
                    Can&apos;t match ({skipped.length})
                  </h3>
                </div>
                <div className='space-y-0.5'>
                  {skipped.map((album, i) => (
                    <p key={i} className='text-xs text-zinc-600 truncate px-3'>
                      {album.name} - {album.artistName}
                    </p>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Footer */}
        {match && !isMatching && (
          <div className='pt-3 border-t border-zinc-800 flex items-center justify-between'>
            {isImporting ? (
              <div className='flex items-center gap-3 flex-1'>
                <Loader2 className='w-4 h-4 animate-spin text-cosmic-latte' />
                <div className='flex-1'>
                  <div className='h-1.5 bg-zinc-800 rounded-full overflow-hidden'>
                    <div
                      className='h-full bg-cosmic-latte rounded-full transition-all duration-300'
                      style={{
                        width: `${(importProgress.done / importProgress.total) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <span className='text-xs text-zinc-400'>
                  {importProgress.done}/{importProgress.total}
                </span>
              </div>
            ) : importComplete ? (
              <Button
                onClick={handleClose}
                className='ml-auto bg-cosmic-latte text-black hover:bg-cosmic-latte/90'
              >
                Done
              </Button>
            ) : (
              <>
                <p className='text-xs text-zinc-500'>
                  {selectedIds.size} album{selectedIds.size !== 1 ? 's' : ''}{' '}
                  selected
                </p>
                <Button
                  onClick={handleImport}
                  disabled={selectedIds.size === 0}
                  className='bg-cosmic-latte text-black hover:bg-cosmic-latte/90 disabled:opacity-50'
                >
                  Add {selectedIds.size > 0 ? selectedIds.size : ''} Album
                  {selectedIds.size !== 1 ? 's' : ''}
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
