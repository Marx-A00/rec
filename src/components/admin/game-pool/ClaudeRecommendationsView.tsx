'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Disc3,
  Plus,
  Eye,
  ArrowLeft,
} from 'lucide-react';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
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
import {
  useAddAlbumToPoolMutation,
  useImportAlbumMutation,
} from '@/generated/graphql';
import recommendations from '@/data/claude-recommendations.json';

// ============================================================================
// Types
// ============================================================================

interface ClaudeRecommendation {
  index: number;
  artist: string;
  title: string;
  genre: string;
  musicbrainzId: string | null;
  mbTitle: string | null;
  mbArtist: string | null;
  mbArtistId: string | null;
  releaseDate: string | null;
  albumType: string | null;
  score: number | null;
  status: 'matched' | 'no_match' | 'error';
}

interface ExistingAlbumInfo {
  albumId: string;
  gameStatus: string;
}

interface ClaudeRecommendationsViewProps {
  onBack: () => void;
  onComplete: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function ClaudeRecommendationsView({
  onBack,
  onComplete,
}: ClaudeRecommendationsViewProps) {
  const queryClient = useQueryClient();
  const [existingMap, setExistingMap] = useState<
    Record<string, ExistingAlbumInfo>
  >({});
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [genreFilter, setGenreFilter] = useState<string>('all');
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  const { mutateAsync: addAlbumToPool } = useAddAlbumToPoolMutation();
  const { mutateAsync: importAlbum } = useImportAlbumMutation();

  const allRecs = recommendations as ClaudeRecommendation[];

  // Extract unique genres
  const genres = useMemo(() => {
    const genreSet = new Set(allRecs.map(r => r.genre));
    return Array.from(genreSet).sort();
  }, [allRecs]);

  // Filter by genre
  const filteredRecs = useMemo(() => {
    if (genreFilter === 'all') return allRecs;
    return allRecs.filter(r => r.genre === genreFilter);
  }, [allRecs, genreFilter]);

  // Check which albums already exist in DB
  useEffect(() => {
    const mbIds = allRecs
      .filter(r => r.musicbrainzId)
      .map(r => r.musicbrainzId as string);

    if (mbIds.length === 0) {
      setCheckingExisting(false);
      return;
    }

    fetch('/api/admin/claude-recs/check-existing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ musicbrainzIds: mbIds }),
    })
      .then(res => res.json())
      .then(data => {
        setExistingMap(data.existing || {});
      })
      .catch(err => {
        console.error('Failed to check existing albums:', err);
      })
      .finally(() => setCheckingExisting(false));
  }, [allRecs]);

  // Auto-select importable albums (matched + not in DB) when data loads
  useEffect(() => {
    if (checkingExisting) return;
    const importable = filteredRecs.filter(
      r =>
        r.status === 'matched' &&
        r.musicbrainzId &&
        !existingMap[r.musicbrainzId]
    );
    setSelectedIds(new Set(importable.map(r => r.index)));
  }, [checkingExisting, filteredRecs, existingMap]);

  // Helpers
  const isInDb = useCallback(
    (rec: ClaudeRecommendation) =>
      rec.musicbrainzId ? !!existingMap[rec.musicbrainzId] : false,
    [existingMap]
  );

  const getGameStatus = useCallback(
    (rec: ClaudeRecommendation) =>
      rec.musicbrainzId ? existingMap[rec.musicbrainzId]?.gameStatus : null,
    [existingMap]
  );

  const isSelectable = useCallback(
    (rec: ClaudeRecommendation) => rec.status === 'matched' && !isInDb(rec),
    [isInDb]
  );

  const selectableInView = useMemo(
    () => filteredRecs.filter(isSelectable),
    [filteredRecs, isSelectable]
  );

  const allSelected =
    selectableInView.length > 0 &&
    selectableInView.every(r => selectedIds.has(r.index));
  const someSelected =
    selectedIds.size > 0 &&
    !allSelected &&
    selectableInView.some(r => selectedIds.has(r.index));

  const toggleAlbum = useCallback((index: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (allSelected) {
      // Deselect all in current view
      setSelectedIds(prev => {
        const next = new Set(prev);
        for (const r of selectableInView) {
          next.delete(r.index);
        }
        return next;
      });
    } else {
      // Select all selectable in current view
      setSelectedIds(prev => {
        const next = new Set(prev);
        for (const r of selectableInView) {
          next.add(r.index);
        }
        return next;
      });
    }
  }, [allSelected, selectableInView]);

  // Stats
  const stats = useMemo(() => {
    const inDb = filteredRecs.filter(r => isInDb(r)).length;
    const noMatch = filteredRecs.filter(r => r.status !== 'matched').length;
    const inPool = filteredRecs.filter(
      r => getGameStatus(r) === 'APPROVED'
    ).length;
    const selected = filteredRecs.filter(r => selectedIds.has(r.index)).length;
    return {
      total: filteredRecs.length,
      inDb,
      inPool,
      noMatch,
      selected,
    };
  }, [filteredRecs, selectedIds, isInDb, getGameStatus]);

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['SuggestedGameAlbums'] });
    queryClient.invalidateQueries({ queryKey: ['AlbumsByGameStatus'] });
    queryClient.invalidateQueries({ queryKey: ['GamePoolStats'] });
    queryClient.invalidateQueries({ queryKey: ['CuratedChallenges'] });
    queryClient.invalidateQueries({ queryKey: ['UncoverPoolStatus'] });
  }, [queryClient]);

  // Import handler
  const handleImport = useCallback(
    async (addToPool: boolean) => {
      const selected = allRecs.filter(
        r =>
          selectedIds.has(r.index) && r.status === 'matched' && r.musicbrainzId
      );
      if (selected.length === 0) return;

      setImporting(true);
      setImportProgress({ current: 0, total: selected.length });

      let success = 0;
      let failed = 0;

      for (let i = 0; i < selected.length; i++) {
        const rec = selected[i];
        setImportProgress({ current: i + 1, total: selected.length });

        try {
          const coverImageUrl = rec.musicbrainzId
            ? `https://coverartarchive.org/release-group/${rec.musicbrainzId}/front-250`
            : undefined;

          const albumData = {
            title: rec.mbTitle || rec.title,
            musicbrainzId: rec.musicbrainzId!,
            releaseDate: rec.releaseDate || undefined,
            coverImageUrl,
            artists: [
              {
                artistName: rec.mbArtist || rec.artist,
                role: 'PRIMARY',
              },
            ],
            albumType: rec.albumType || undefined,
          };

          if (addToPool) {
            const result = await addAlbumToPool({ albumData });
            if (result.addAlbumToPool.success) {
              success++;
            } else {
              failed++;
              console.warn(
                `Failed to add "${rec.title}" to pool:`,
                result.addAlbumToPool.error
              );
            }
          } else {
            const result = await importAlbum({ albumData });
            if (result.importAlbum.success) {
              success++;
            } else {
              failed++;
              console.warn(
                `Failed to import "${rec.title}":`,
                result.importAlbum.error
              );
            }
          }
        } catch (error) {
          failed++;
          console.error(`Error importing "${rec.title}":`, error);
        }
      }

      setImporting(false);
      setImportProgress(null);

      if (failed === 0) {
        toast.success(
          `${success} album${success !== 1 ? 's' : ''} ${addToPool ? 'added to pool' : 'imported for review'}`
        );
      } else {
        toast.warning(`${success} imported, ${failed} failed`);
      }

      invalidateAll();
      onComplete();
    },
    [
      allRecs,
      selectedIds,
      addAlbumToPool,
      importAlbum,
      invalidateAll,
      onComplete,
    ]
  );

  // Cover Art Archive URL
  const getCoverUrl = (rec: ClaudeRecommendation) => {
    if (!rec.musicbrainzId) return null;
    return `https://coverartarchive.org/release-group/${rec.musicbrainzId}/front-250`;
  };

  if (checkingExisting) {
    return (
      <div className='flex items-center justify-center py-12 gap-3 text-zinc-400'>
        <Loader2 className='h-5 w-5 animate-spin' />
        <span className='text-sm'>Checking existing albums...</span>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-4 h-full min-h-0'>
      {/* Header */}
      <div className='flex items-center gap-2 shrink-0'>
        <Button
          variant='ghost'
          size='sm'
          className='h-8 w-8 p-0'
          onClick={onBack}
        >
          <ArrowLeft className='h-4 w-4' />
        </Button>
        <div>
          <h3 className='text-sm font-semibold text-white'>Claude Picks</h3>
          <p className='text-xs text-zinc-500'>
            Curated iconic album covers for the game pool
          </p>
        </div>
      </div>

      {/* Genre Filter + Stats */}
      <div className='flex items-center gap-3 shrink-0'>
        <Select value={genreFilter} onValueChange={setGenreFilter}>
          <SelectTrigger className='w-52 h-8 text-xs'>
            <SelectValue placeholder='Filter by genre' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Genres</SelectItem>
            {genres.map(genre => (
              <SelectItem key={genre} value={genre}>
                {genre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className='flex items-center gap-3 text-xs text-zinc-400 ml-auto'>
          <span>
            <Disc3 className='h-3 w-3 inline mr-1' />
            {stats.total} albums
          </span>
          <span className='text-white font-medium'>
            {stats.selected} selected
          </span>
          {stats.inDb > 0 && (
            <span className='text-emerald-400'>
              <CheckCircle2 className='h-3 w-3 inline mr-0.5' />
              {stats.inDb} in DB
            </span>
          )}
          {stats.inPool > 0 && (
            <span className='text-blue-400'>{stats.inPool} in pool</span>
          )}
          {stats.noMatch > 0 && (
            <span className='text-red-400'>
              <AlertTriangle className='h-3 w-3 inline mr-0.5' />
              {stats.noMatch} unmatched
            </span>
          )}
        </div>
      </div>

      {/* Selection Controls */}
      <div className='flex items-center justify-between shrink-0'>
        <button
          onClick={toggleAll}
          className='text-xs text-zinc-400 hover:text-white transition-colors'
        >
          {allSelected ? 'Deselect all' : 'Select all'}
        </button>
      </div>

      {/* Album Table */}
      <div className='rounded-md border border-zinc-800 flex-1 min-h-0 overflow-y-auto custom-scrollbar'>
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
                />
              </TableHead>
              <TableHead className='w-12'>Cover</TableHead>
              <TableHead>Album</TableHead>
              <TableHead>Artist</TableHead>
              <TableHead className='w-16'>Year</TableHead>
              <TableHead className='w-32'>Genre</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecs.map(rec => {
              const inDb = isInDb(rec);
              const gameStatus = getGameStatus(rec);
              const selectable = isSelectable(rec);
              const isSelected = selectedIds.has(rec.index);
              const coverUrl = getCoverUrl(rec);
              const year = rec.releaseDate
                ? new Date(rec.releaseDate).getFullYear()
                : null;

              return (
                <TableRow
                  key={rec.index}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-zinc-800/40 hover:bg-zinc-800/60'
                      : selectable
                        ? 'hover:bg-zinc-800/30'
                        : 'opacity-50'
                  }`}
                  onClick={() => selectable && toggleAlbum(rec.index)}
                >
                  <TableCell className='px-3'>
                    <Checkbox
                      checked={isSelected}
                      disabled={!selectable}
                      onCheckedChange={() =>
                        selectable && toggleAlbum(rec.index)
                      }
                      onClick={e => e.stopPropagation()}
                    />
                  </TableCell>
                  <TableCell>
                    {coverUrl ? (
                      <Image
                        src={coverUrl}
                        alt={rec.mbTitle || rec.title}
                        width={32}
                        height={32}
                        className='w-8 h-8 rounded object-cover bg-zinc-800'
                        unoptimized
                      />
                    ) : (
                      <div className='w-8 h-8 rounded bg-zinc-800' />
                    )}
                  </TableCell>
                  <TableCell className='font-medium text-white text-sm'>
                    <span className='inline-flex items-center gap-1.5'>
                      {rec.mbTitle || rec.title}
                      {inDb && gameStatus === 'APPROVED' && (
                        <span className='inline-flex items-center gap-0.5 rounded bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-medium text-blue-400 leading-none'>
                          <CheckCircle2 className='h-2.5 w-2.5' />
                          In Pool
                        </span>
                      )}
                      {inDb && gameStatus !== 'APPROVED' && (
                        <span className='inline-flex items-center gap-0.5 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 leading-none'>
                          <CheckCircle2 className='h-2.5 w-2.5' />
                          In DB
                        </span>
                      )}
                      {rec.status !== 'matched' && (
                        <span className='inline-flex items-center gap-0.5 rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-medium text-red-400 leading-none'>
                          <AlertTriangle className='h-2.5 w-2.5' />
                          No Match
                        </span>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className='text-zinc-400 text-sm'>
                    {rec.mbArtist || rec.artist}
                  </TableCell>
                  <TableCell className='text-zinc-500 text-sm'>
                    {year || '—'}
                  </TableCell>
                  <TableCell className='text-zinc-500 text-xs'>
                    {rec.genre}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Import Progress */}
      {importing && importProgress && (
        <div className='shrink-0 py-2'>
          <div className='flex items-center gap-3 text-sm text-zinc-400'>
            <Loader2 className='h-4 w-4 animate-spin' />
            <span>
              Importing {importProgress.current}/{importProgress.total}...
            </span>
          </div>
          <div className='w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-2'>
            <div
              className='h-full bg-emerald-500 rounded-full transition-all duration-200 ease-out'
              style={{
                width: `${(importProgress.current / importProgress.total) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className='shrink-0 flex items-center gap-2 pt-1'>
        <Button
          size='sm'
          className='text-green-500 border-green-500/20 hover:bg-green-500/10'
          variant='outline'
          disabled={importing || stats.selected === 0}
          onClick={() => handleImport(true)}
        >
          <Plus className='h-4 w-4 mr-1' />
          Add {stats.selected} to Pool
        </Button>
        <Button
          size='sm'
          variant='outline'
          disabled={importing || stats.selected === 0}
          onClick={() => handleImport(false)}
        >
          <Eye className='h-4 w-4 mr-1' />
          Import for Review
        </Button>
      </div>
    </div>
  );
}
