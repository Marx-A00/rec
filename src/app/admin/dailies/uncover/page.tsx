'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ExternalLink, Drama, Eye, EyeOff } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlbumImage } from '@/components/ui/AlbumImage';
import { GamePoolStats } from '@/components/admin/game-pool/GamePoolStats';
import { PoolTable } from '@/components/admin/game-pool/PoolTable';
import { EligibleAlbumsTable } from '@/components/admin/game-pool/EligibleAlbumsTable';
import { SuggestedAlbumsTable } from '@/components/admin/game-pool/SuggestedAlbumsTable';
import { PlaylistImportDialog } from '@/components/admin/game-pool/PlaylistImportDialog';
import { ChallengeHistoryTable } from '@/components/admin/game-pool/ChallengeHistoryTable';
import {
  useChallengeHistoryQuery,
  useUncoverPoolStatusQuery,
  useUncoverSettingsQuery,
  useUpdateUncoverSettingsMutation,
} from '@/generated/graphql';

/** Compute a human-readable countdown to the next 7 AM Central. */
function getTimeUntilNext7amCentral(): string {
  const now = new Date();

  // Build "today at 7 AM Central" using Intl to handle DST
  const centralNow = new Date(
    now.toLocaleString('en-US', { timeZone: 'America/Chicago' })
  );
  const centralHour = centralNow.getHours();
  const centralMinute = centralNow.getMinutes();

  // Minutes since midnight Central
  const minutesSinceMidnight = centralHour * 60 + centralMinute;
  const target = 7 * 60; // 7:00 AM = 420 minutes

  // Minutes until next 7 AM
  const minutesUntil =
    minutesSinceMidnight < target
      ? target - minutesSinceMidnight
      : 24 * 60 - minutesSinceMidnight + target;

  const hours = Math.floor(minutesUntil / 60);
  const mins = minutesUntil % 60;

  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

export default function UncoverPage() {
  const queryClient = useQueryClient();

  // Today's cover data
  const { data: historyData } = useChallengeHistoryQuery({ limit: 1 });
  const todaysChallenge = historyData?.challengeHistory?.[0] ?? null;

  // Spoiler protection — default hidden
  const [revealed, setRevealed] = useState(false);

  // Live countdown to next 7 AM Central
  const [countdown, setCountdown] = useState(getTimeUntilNext7amCentral());
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(getTimeUntilNext7amCentral());
    }, 60_000); // update every minute
    return () => clearInterval(interval);
  }, []);

  const { data: poolData } = useUncoverPoolStatusQuery();
  const pool = poolData?.uncoverPoolStatus;

  const { data: settingsData } = useUncoverSettingsQuery();
  const settings = settingsData?.uncoverSettings;

  const { mutateAsync: updateSettings } = useUpdateUncoverSettingsMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['UncoverSettings'] });
      queryClient.invalidateQueries({ queryKey: ['UncoverPoolStatus'] });
    },
  });

  const handleSelectionModeChange = async (value: string) => {
    try {
      await updateSettings({ selectionMode: value });
      toast.success(`Selection mode set to ${value}`);
    } catch {
      toast.error('Failed to update selection mode');
    }
  };

  const handlePoolExhaustedModeChange = async (value: string) => {
    try {
      await updateSettings({ poolExhaustedMode: value });
      toast.success(
        `Pool exhausted mode set to ${value === 'AUTO_RESET' ? 'Auto-reset' : 'Stop'}`
      );
    } catch {
      toast.error('Failed to update pool exhausted mode');
    }
  };

  const remaining = pool?.remaining ?? 0;

  return (
    <div className='p-8'>
      {/* Header */}
      <div className='mb-8'>
        <div className='flex items-center gap-3 mb-2'>
          <Drama className='h-8 w-8 text-blue-500' />
          <h1 className='text-3xl font-bold text-white'>Uncover</h1>
        </div>
        <p className='text-zinc-400 mt-1'>Manage the daily Uncover game</p>
        <div className='mt-3 flex items-center gap-4'>
          <Link
            href='/game'
            className='inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300'
          >
            Play the game <ExternalLink className='h-3.5 w-3.5' />
          </Link>
        </div>
      </div>

      {/* Today's Cover */}
      {todaysChallenge && (
        <div className='mb-8 rounded-lg border border-zinc-800 bg-zinc-900/50 p-5'>
          <div className='flex items-center justify-between mb-1'>
            <h2 className='text-lg font-semibold text-white'>
              Today&apos;s Cover
            </h2>
            <button
              onClick={() => setRevealed(r => !r)}
              className='flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors'
            >
              {revealed ? (
                <>
                  <EyeOff className='h-3.5 w-3.5' /> Hide
                </>
              ) : (
                <>
                  <Eye className='h-3.5 w-3.5' /> Reveal
                </>
              )}
            </button>
          </div>
          <p className='text-xs text-zinc-500 mb-3'>
            Generated{' '}
            {new Date(todaysChallenge.date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
            {' · '}
            Next in {countdown}
          </p>
          {revealed && (
            <div className='flex items-center gap-4'>
              <div className='h-14 w-14 flex-shrink-0 overflow-hidden rounded-md'>
                <AlbumImage
                  src={todaysChallenge.coverUrl}
                  cloudflareImageId={todaysChallenge.cloudflareImageId}
                  alt={todaysChallenge.albumTitle}
                  width={56}
                  height={56}
                  className='h-full w-full object-cover'
                />
              </div>
              <div className='min-w-0'>
                <p className='text-sm font-medium text-white truncate'>
                  {todaysChallenge.albumTitle}
                </p>
                <p className='text-sm text-zinc-400 truncate'>
                  {todaysChallenge.artistName}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Uncover Top-Level Tabs */}
      <Tabs defaultValue='album-cover-pool' className='space-y-6'>
        <TabsList className='bg-transparent border-b border-zinc-800 rounded-none p-0 h-auto'>
          <TabsTrigger
            value='album-cover-pool'
            className='rounded-none border-b-2 border-transparent px-4 pb-3 pt-2.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-300 data-[state=active]:border-zinc-50 data-[state=active]:text-zinc-50 data-[state=active]:bg-transparent data-[state=active]:shadow-none'
          >
            Album Cover Pool
          </TabsTrigger>
        </TabsList>

        <TabsContent value='album-cover-pool' className='space-y-8'>
          {/* Album Cover Pool Header + Import */}
          <div className='flex items-center justify-between'>
            <div>
              <h2 className='text-xl font-semibold text-white'>
                Album Cover Pool
              </h2>
              <p className='text-sm text-zinc-400 mt-1'>
                Manage album covers eligible for the daily Uncover game
              </p>
              <p className='text-sm mt-1'>
                <span
                  className={
                    remaining > 30
                      ? 'text-green-400'
                      : remaining > 7
                        ? 'text-amber-400'
                        : 'text-red-400'
                  }
                >
                  {remaining} remaining
                </span>
                <span className='text-zinc-500'>
                  {' '}
                  / {pool?.totalCurated ?? 0} total in pool
                </span>
              </p>
            </div>
            <PlaylistImportDialog />
          </div>

          {/* Settings */}
          <div className='grid grid-cols-2 gap-4 max-w-lg'>
            <div>
              <label className='text-sm text-zinc-400 mb-1.5 block'>
                Selection Mode
              </label>
              <Select
                value={settings?.selectionMode ?? 'RANDOM'}
                onValueChange={handleSelectionModeChange}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='RANDOM'>Random</SelectItem>
                  <SelectItem value='FIFO'>FIFO (oldest first)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className='text-sm text-zinc-400 mb-1.5 block'>
                When Pool Empty
              </label>
              <Select
                value={settings?.poolExhaustedMode ?? 'AUTO_RESET'}
                onValueChange={handlePoolExhaustedModeChange}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='AUTO_RESET'>Auto-reset</SelectItem>
                  <SelectItem value='STOP'>Stop</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stats Overview */}
          <GamePoolStats />

          {/* Album Management Sub-Tabs */}
          <Tabs defaultValue='pool' className='space-y-6'>
            <TabsList className='bg-zinc-800/50 border border-zinc-700/50'>
              <TabsTrigger value='pool'>Pool</TabsTrigger>
              <TabsTrigger value='add-albums'>Add Albums</TabsTrigger>
              <TabsTrigger value='suggested'>Suggested Albums</TabsTrigger>
              <TabsTrigger value='history'>History</TabsTrigger>
            </TabsList>

            <TabsContent value='pool' className='space-y-4'>
              <div className='mb-4'>
                <h3 className='text-lg font-semibold text-white'>Pool</h3>
                <p className='text-sm text-zinc-400 mt-1'>
                  All curated albums and their usage status
                </p>
              </div>
              <PoolTable />
            </TabsContent>

            <TabsContent value='add-albums' className='space-y-4'>
              <div className='flex items-center justify-between mb-4'>
                <div>
                  <h3 className='text-lg font-semibold text-white'>
                    Add Albums
                  </h3>
                  <p className='text-sm text-zinc-400 mt-1'>
                    Browse eligible albums and add them to the pool
                  </p>
                </div>
              </div>
              <EligibleAlbumsTable />
            </TabsContent>

            <TabsContent value='suggested' className='space-y-4'>
              <div className='flex items-center justify-between mb-4'>
                <div>
                  <h3 className='text-lg font-semibold text-white'>
                    Suggested Albums
                  </h3>
                  <p className='text-sm text-zinc-400 mt-1'>
                    Albums with cover art awaiting review
                  </p>
                </div>
              </div>
              <SuggestedAlbumsTable />
            </TabsContent>

            <TabsContent value='history' className='space-y-4'>
              <div className='mb-4'>
                <h3 className='text-lg font-semibold text-white'>
                  Challenge History
                </h3>
                <p className='text-sm text-zinc-400 mt-1'>
                  Past and current daily album covers in reverse chronological
                  order
                </p>
              </div>
              <ChallengeHistoryTable />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
