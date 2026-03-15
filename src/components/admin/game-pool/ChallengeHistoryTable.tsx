'use client';

import { useState } from 'react';
import { isToday } from 'date-fns';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';

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
import { useChallengeHistoryQuery } from '@/generated/graphql';

const PAGE_SIZE = 50;

export function ChallengeHistoryTable() {
  const [offset, setOffset] = useState(0);

  const { data, isLoading } = useChallengeHistoryQuery({
    limit: PAGE_SIZE,
    offset,
  });

  const challenges = data?.challengeHistory ?? [];

  if (isLoading) {
    return (
      <div className='text-zinc-400 text-sm py-8 text-center'>
        Loading challenge history...
      </div>
    );
  }

  if (challenges.length === 0) {
    return (
      <div className='text-zinc-400 text-sm py-8 text-center'>
        No challenges have been played yet.
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      <div className='rounded-lg border border-zinc-800 overflow-hidden'>
        <Table>
          <TableHeader>
            <TableRow className='border-zinc-800 hover:bg-transparent'>
              <TableHead className='text-zinc-400 w-[60px]'>Cover</TableHead>
              <TableHead className='text-zinc-400'>Album</TableHead>
              <TableHead className='text-zinc-400'>Artist</TableHead>
              <TableHead className='text-zinc-400'>Date</TableHead>
              <TableHead className='text-zinc-400 text-right'>Plays</TableHead>
              <TableHead className='text-zinc-400 text-right'>Wins</TableHead>
              <TableHead className='text-zinc-400 text-right'>
                Win Rate
              </TableHead>
              <TableHead className='text-zinc-400 text-right'>
                Avg Attempts
              </TableHead>
              <TableHead className='text-zinc-400'>Text Detection</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {challenges.map(challenge => {
              const winRate =
                challenge.totalPlays > 0
                  ? Math.round(
                      (challenge.totalWins / challenge.totalPlays) * 100
                    )
                  : 0;
              // DB stores date-only values serialised as UTC midnight ISO strings.
              // Parse the YYYY-MM-DD portion and build a local Date to avoid
              // timezone shift (e.g. UTC midnight → previous day in Central).
              const raw = String(challenge.date);
              const datePart = raw.includes('T') ? raw.split('T')[0] : raw;
              const [y, m, d] = datePart.split('-').map(Number);
              const challengeDate = new Date(y, m - 1, d);
              const isTodayChallenge = isToday(challengeDate);

              return (
                <TableRow
                  key={challenge.id}
                  className='border-zinc-800 hover:bg-zinc-800/50'
                >
                  <TableCell>
                    <div className='w-10 h-10 rounded overflow-hidden'>
                      <AlbumImage
                        src={challenge.coverUrl}
                        cloudflareImageId={challenge.cloudflareImageId}
                        alt={challenge.albumTitle}
                        width={40}
                        height={40}
                        className='object-cover'
                      />
                    </div>
                  </TableCell>
                  <TableCell className='text-white font-medium'>
                    {challenge.albumTitle}
                  </TableCell>
                  <TableCell className='text-zinc-300'>
                    {challenge.artistName}
                  </TableCell>
                  <TableCell>
                    <div className='flex items-center gap-2'>
                      <span className='text-zinc-300'>
                        {challengeDate.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      {isTodayChallenge && (
                        <span className='text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded'>
                          Today
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className='text-zinc-300 text-right'>
                    {challenge.totalPlays}
                  </TableCell>
                  <TableCell className='text-zinc-300 text-right'>
                    {challenge.totalWins}
                  </TableCell>
                  <TableCell className='text-right'>
                    <span
                      className={
                        winRate >= 50
                          ? 'text-green-400'
                          : winRate > 0
                            ? 'text-amber-400'
                            : 'text-zinc-500'
                      }
                    >
                      {challenge.totalPlays > 0 ? `${winRate}%` : '—'}
                    </span>
                  </TableCell>
                  <TableCell className='text-zinc-300 text-right'>
                    {challenge.avgAttempts
                      ? challenge.avgAttempts.toFixed(1)
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {challenge.textRegionCount != null &&
                    challenge.textRegionCount > 0 ? (
                      <span className='inline-flex items-center gap-1.5 text-xs text-green-400'>
                        <CheckCircle2 className='h-3.5 w-3.5' />
                        {challenge.textRegionCount} region
                        {challenge.textRegionCount !== 1 ? 's' : ''}
                      </span>
                    ) : challenge.textRegionCount === 0 ? (
                      <span className='inline-flex items-center gap-1.5 text-xs text-amber-400'>
                        <AlertTriangle className='h-3.5 w-3.5' />
                        No text
                      </span>
                    ) : (
                      <span className='inline-flex items-center gap-1.5 text-xs text-blue-400'>
                        <Info className='h-3.5 w-3.5' />
                        Fallback
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className='flex items-center justify-between'>
        <span className='text-sm text-zinc-400'>
          Showing {offset + 1}–{offset + challenges.length}
        </span>
        <div className='flex gap-2'>
          <Button
            variant='outline'
            size='sm'
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            className='border-zinc-700 text-zinc-300 hover:bg-zinc-800'
          >
            Previous
          </Button>
          <Button
            variant='outline'
            size='sm'
            disabled={challenges.length < PAGE_SIZE}
            onClick={() => setOffset(offset + PAGE_SIZE)}
            className='border-zinc-700 text-zinc-300 hover:bg-zinc-800'
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
