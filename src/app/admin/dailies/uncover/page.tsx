'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ExternalLink,
  Drama,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
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
import { SuggestedAlbumsTable } from '@/components/admin/game-pool/SuggestedAlbumsTable';

import { ChallengeHistoryTable } from '@/components/admin/game-pool/ChallengeHistoryTable';
import {
  useChallengeHistoryQuery,
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
                <div className='mt-1.5'>
                  {todaysChallenge.textRegionCount != null &&
                  todaysChallenge.textRegionCount > 0 ? (
                    <span className='inline-flex items-center gap-1.5 text-xs text-green-400'>
                      <CheckCircle2 className='h-3.5 w-3.5' />
                      {todaysChallenge.textRegionCount} text region
                      {todaysChallenge.textRegionCount !== 1 ? 's' : ''}{' '}
                      detected
                    </span>
                  ) : todaysChallenge.textRegionCount === 0 ? (
                    <span className='inline-flex items-center gap-1.5 text-xs text-amber-400'>
                      <AlertTriangle className='h-3.5 w-3.5' />
                      No text detected
                    </span>
                  ) : (
                    <span className='inline-flex items-center gap-1.5 text-xs text-blue-400'>
                      <Info className='h-3.5 w-3.5' />
                      Using fallback heuristic
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Album Management Tabs */}
      <Tabs defaultValue='pool' className='space-y-6'>
        <TabsList className='bg-transparent border-b border-zinc-800 rounded-none p-0 h-auto'>
          <TabsTrigger
            value='pool'
            className='rounded-none border-b-2 border-transparent px-4 pb-3 pt-2.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-300 data-[state=active]:border-zinc-50 data-[state=active]:text-zinc-50 data-[state=active]:bg-transparent data-[state=active]:shadow-none'
          >
            Pool
          </TabsTrigger>
          <TabsTrigger
            value='add-albums'
            className='rounded-none border-b-2 border-transparent px-4 pb-3 pt-2.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-300 data-[state=active]:border-zinc-50 data-[state=active]:text-zinc-50 data-[state=active]:bg-transparent data-[state=active]:shadow-none'
          >
            Add Albums
          </TabsTrigger>
          <TabsTrigger
            value='history'
            className='rounded-none border-b-2 border-transparent px-4 pb-3 pt-2.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-300 data-[state=active]:border-zinc-50 data-[state=active]:text-zinc-50 data-[state=active]:bg-transparent data-[state=active]:shadow-none'
          >
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value='pool' className='space-y-4'>
          <div className='mb-4'>
            <h3 className='text-lg font-semibold text-white'>Pool</h3>
            <p className='text-sm text-zinc-400 mt-1'>
              All curated albums and their usage status
            </p>
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

          <PoolTable />
        </TabsContent>

        <TabsContent value='add-albums' className='space-y-4'>
          <div className='flex items-center justify-between mb-4'>
            <div>
              <h3 className='text-lg font-semibold text-white'>Add Albums</h3>
              <p className='text-sm text-zinc-400 mt-1'>
                Browse and add albums to the pool
              </p>
            </div>
          </div>
          <GamePoolStats />
          <SuggestedAlbumsTable />
        </TabsContent>

        <TabsContent value='history' className='space-y-4'>
          <div className='mb-4'>
            <h3 className='text-lg font-semibold text-white'>
              Challenge History
            </h3>
            <p className='text-sm text-zinc-400 mt-1'>
              Past and current daily album covers in reverse chronological order
            </p>
          </div>
          <ChallengeHistoryTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
