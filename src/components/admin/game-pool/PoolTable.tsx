'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { formatDateOnly } from '@/lib/date-utils';
import { Trash2, Pin } from 'lucide-react';

import AlbumImage from '@/components/ui/AlbumImage';
import { Skeleton } from '@/components/ui/skeletons/Skeleton';
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  CuratedPoolFilter,
  useCuratedChallengesQuery,
  useRemoveCuratedChallengeMutation,
  useUncoverPoolStatusQuery,
} from '@/generated/graphql';

const PAGE_SIZE = 50;
const SKELETON_ROWS = 8;

function PoolTableSkeleton() {
  return (
    <div className='rounded-lg border border-zinc-800 overflow-hidden'>
      <Table>
        <TableHeader>
          <TableRow className='border-zinc-800 hover:bg-transparent'>
            <TableHead className='text-zinc-400 w-[96px]'>Cover</TableHead>
            <TableHead className='text-zinc-400'>Album</TableHead>
            <TableHead className='text-zinc-400'>Artist</TableHead>
            <TableHead className='text-zinc-400 w-28'>Status</TableHead>
            <TableHead className='text-zinc-400 w-36'>Used On</TableHead>
            <TableHead className='text-zinc-400 w-36'>Added</TableHead>
            <TableHead className='text-zinc-400 w-16'></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
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
                <Skeleton className='h-5 w-20 rounded' />
              </TableCell>
              <TableCell>
                <Skeleton className='h-4 w-24' />
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
  );
}

export function PoolTable() {
  const queryClient = useQueryClient();
  const [offset, setOffset] = useState(0);
  const [filter, setFilter] = useState<CuratedPoolFilter>(
    CuratedPoolFilter.All
  );

  const { data, isLoading } = useCuratedChallengesQuery({
    limit: PAGE_SIZE,
    offset,
    status: filter,
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

  const handleFilterChange = (value: string) => {
    if (value) {
      setFilter(value as CuratedPoolFilter);
      setOffset(0);
    }
  };

  const entries = data?.curatedChallenges ?? [];

  const totalRemaining = poolStatus?.uncoverPoolStatus?.remaining;
  const totalUsed = poolStatus?.uncoverPoolStatus?.totalUsed;
  const totalCurated = poolStatus?.uncoverPoolStatus?.totalCurated ?? 0;

  const totalForFilter =
    filter === CuratedPoolFilter.Remaining
      ? (totalRemaining ?? 0)
      : filter === CuratedPoolFilter.Used
        ? (totalUsed ?? 0)
        : totalCurated;

  const totalPages = Math.max(1, Math.ceil(totalForFilter / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const goToPage = (page: number) => setOffset((page - 1) * PAGE_SIZE);

  const showingText =
    entries.length > 0
      ? `Showing ${offset + 1}\u2013${offset + entries.length}${totalForFilter > 0 ? ` of ${totalForFilter}` : ''}`
      : '';

  return (
    <div className='space-y-4'>
      {/* Filter + Summary */}
      <div className='flex items-center justify-between'>
        <ToggleGroup
          type='single'
          value={filter}
          onValueChange={handleFilterChange}
          className='bg-zinc-800 border border-zinc-700'
          size='sm'
        >
          <ToggleGroupItem
            value={CuratedPoolFilter.All}
            className='px-3 py-1.5 text-sm text-zinc-400 data-[state=on]:bg-zinc-600 data-[state=on]:text-white'
          >
            All{totalCurated > 0 ? ` (${totalCurated})` : ''}
          </ToggleGroupItem>
          <ToggleGroupItem
            value={CuratedPoolFilter.Remaining}
            className='px-3 py-1.5 text-sm text-zinc-400 data-[state=on]:bg-emerald-600 data-[state=on]:text-white'
          >
            Remaining
            {totalRemaining != null ? ` (${totalRemaining})` : ''}
          </ToggleGroupItem>
          <ToggleGroupItem
            value={CuratedPoolFilter.Used}
            className='px-3 py-1.5 text-sm text-zinc-400 data-[state=on]:bg-zinc-600 data-[state=on]:text-white'
          >
            Used{totalUsed != null ? ` (${totalUsed})` : ''}
          </ToggleGroupItem>
        </ToggleGroup>

        {!isLoading && showingText && (
          <span className='text-zinc-400 text-sm'>{showingText}</span>
        )}
      </div>

      {isLoading ? (
        <PoolTableSkeleton />
      ) : entries.length === 0 ? (
        <div className='text-zinc-400 text-sm py-8 text-center'>
          {filter === CuratedPoolFilter.All
            ? 'No albums in the pool. Add albums from the "Add Albums" tab.'
            : filter === CuratedPoolFilter.Remaining
              ? 'No remaining albums in the pool.'
              : 'No used albums yet.'}
        </div>
      ) : (
        <>
          <div className='rounded-lg border border-zinc-800 overflow-hidden'>
            <Table>
              <TableHeader>
                <TableRow className='border-zinc-800 hover:bg-transparent'>
                  <TableHead className='text-zinc-400 w-[96px]'>
                    Cover
                  </TableHead>
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
                      <TableCell className='text-zinc-300'>
                        {artistNames}
                      </TableCell>
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
                        {isUsed ? formatDateOnly(entry.usedDate!) : '\u2014'}
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
        </>
      )}
    </div>
  );
}
