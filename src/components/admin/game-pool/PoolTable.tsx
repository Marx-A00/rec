'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { formatDateOnly } from '@/lib/date-utils';
import { Trash2, Pin } from 'lucide-react';

import AlbumImage from '@/components/ui/AlbumImage';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { TablePagination } from '@/components/ui/table-pagination';
import {
  useCuratedChallengesQuery,
  useRemoveCuratedChallengeMutation,
  useUncoverPoolStatusQuery,
} from '@/generated/graphql';

const PAGE_SIZE = 50;

export function PoolTable() {
  const queryClient = useQueryClient();
  const [offset, setOffset] = useState(0);

  const { data, isLoading } = useCuratedChallengesQuery({
    limit: PAGE_SIZE,
    offset,
  });

  const { data: poolStatus } = useUncoverPoolStatusQuery();

  const { mutateAsync: removeCurated, isPending: isRemoving } =
    useRemoveCuratedChallengeMutation({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['CuratedChallenges'] });
        queryClient.invalidateQueries({ queryKey: ['UncoverPoolStatus'] });
      },
    });

  const handleRemove = async (id: string, albumTitle: string) => {
    try {
      await removeCurated({ id });
      toast.success(`Removed "${albumTitle}" from pool`);
    } catch {
      toast.error('Failed to remove from pool');
    }
  };

  const raw = data?.curatedChallenges ?? [];

  // Sort: remaining first (by createdAt asc), then used (by usedDate desc)
  const remaining = raw
    .filter(e => !e.usedDate)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  const used = raw
    .filter(e => e.usedDate)
    .sort(
      (a, b) =>
        new Date(b.usedDate!).getTime() - new Date(a.usedDate!).getTime()
    );
  const entries = [...remaining, ...used];

  const totalRemaining = poolStatus?.uncoverPoolStatus?.remaining;
  const totalUsed = poolStatus?.uncoverPoolStatus?.totalUsed;
  const totalCurated = poolStatus?.uncoverPoolStatus?.totalCurated ?? 0;

  const totalPages = Math.max(1, Math.ceil(totalCurated / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const goToPage = (page: number) => setOffset((page - 1) * PAGE_SIZE);

  if (isLoading) {
    return (
      <div className='text-zinc-400 text-sm py-8 text-center'>
        Loading pool...
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className='text-zinc-400 text-sm py-8 text-center'>
        No albums in the pool. Add albums from the &quot;Add Albums&quot; tab.
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {/* Summary */}
      <div className='flex items-center gap-4 text-sm'>
        <span className='text-zinc-400'>
          Showing {offset + 1}–{offset + entries.length}
          {totalCurated > 0 && ` of ${totalCurated}`}
        </span>
        <span className='text-zinc-600'>|</span>
        <span className='text-emerald-400'>
          {totalRemaining != null ? totalRemaining : '...'} remaining
        </span>
        <span className='text-zinc-600'>|</span>
        <span className='text-zinc-400'>
          {totalUsed != null ? totalUsed : '...'} used
        </span>
      </div>

      <div className='rounded-lg border border-zinc-800 overflow-hidden'>
        <Table>
          <TableHeader>
            <TableRow className='border-zinc-800 hover:bg-transparent'>
              <TableHead className='text-zinc-400 w-[60px]'>Cover</TableHead>
              <TableHead className='text-zinc-400'>Album</TableHead>
              <TableHead className='text-zinc-400'>Artist</TableHead>
              <TableHead className='text-zinc-400 w-28'>Status</TableHead>
              <TableHead className='text-zinc-400 w-36'>Used On</TableHead>
              <TableHead className='text-zinc-400 w-36'>Added</TableHead>
              <TableHead className='text-zinc-400 w-16'></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map(entry => {
              const artistNames = entry.album.artists
                .map(a => a.artist.name)
                .join(', ');
              const isUsed = !!entry.usedDate;
              const isPinned = !!entry.pinnedDate;

              return (
                <TableRow
                  key={entry.id}
                  className='border-zinc-800 hover:bg-zinc-800/50'
                >
                  <TableCell>
                    <div className='w-10 h-10 rounded overflow-hidden'>
                      <AlbumImage
                        src={entry.album.coverArtUrl}
                        cloudflareImageId={entry.album.cloudflareImageId}
                        alt={entry.album.title}
                        width={40}
                        height={40}
                        className='object-cover'
                      />
                    </div>
                  </TableCell>
                  <TableCell className='font-medium text-white'>
                    <div className='flex items-center gap-2'>
                      {entry.album.title}
                      {isPinned && (
                        <span
                          className='text-amber-400'
                          title={`Pinned for ${formatDateOnly(entry.pinnedDate!)}`}
                        >
                          <Pin className='h-3.5 w-3.5' />
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className='text-zinc-300'>{artistNames}</TableCell>
                  <TableCell>
                    {isUsed ? (
                      <span className='text-xs bg-zinc-700/50 text-zinc-400 px-2 py-0.5 rounded'>
                        Used
                      </span>
                    ) : (
                      <span className='text-xs bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded'>
                        Remaining
                      </span>
                    )}
                  </TableCell>
                  <TableCell className='text-zinc-400 text-sm'>
                    {isUsed ? formatDateOnly(entry.usedDate!) : '—'}
                  </TableCell>
                  <TableCell className='text-zinc-500 text-sm'>
                    {format(new Date(entry.createdAt), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant='ghost'
                      size='sm'
                      disabled={isRemoving}
                      onClick={() => handleRemove(entry.id, entry.album.title)}
                      className='h-8 w-8 p-0 text-zinc-500 hover:text-red-400'
                      title='Remove from pool'
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

      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={goToPage}
        currentPageItemCount={entries.length}
      />
    </div>
  );
}
