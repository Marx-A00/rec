'use client';

import Link from 'next/link';
import { ExternalLink, Drama } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GamePoolStats } from '@/components/admin/game-pool/GamePoolStats';
import { EligibleAlbumsTable } from '@/components/admin/game-pool/EligibleAlbumsTable';
import { SuggestedAlbumsTable } from '@/components/admin/game-pool/SuggestedAlbumsTable';
import { PlaylistImportDialog } from '@/components/admin/game-pool/PlaylistImportDialog';
import { ChallengeHistoryTable } from '@/components/admin/game-pool/ChallengeHistoryTable';

export default function UncoverPage() {
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

      {/* Uncover Top-Level Tabs */}
      <Tabs defaultValue='album-cover-pool' className='space-y-6'>
        <TabsList className='bg-zinc-900 border border-zinc-800'>
          <TabsTrigger value='album-cover-pool'>Album Cover Pool</TabsTrigger>
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
            </div>
            <PlaylistImportDialog />
          </div>

          {/* Stats Overview */}
          <GamePoolStats />

          {/* Album Management Sub-Tabs */}
          <Tabs defaultValue='eligible' className='space-y-6'>
            <TabsList className='bg-zinc-800/50 border border-zinc-700/50'>
              <TabsTrigger value='eligible'>Eligible Albums</TabsTrigger>
              <TabsTrigger value='suggested'>Suggested Albums</TabsTrigger>
              <TabsTrigger value='history'>History</TabsTrigger>
            </TabsList>

            <TabsContent value='eligible' className='space-y-4'>
              <div className='flex items-center justify-between mb-4'>
                <div>
                  <h3 className='text-lg font-semibold text-white'>
                    Eligible Albums
                  </h3>
                  <p className='text-sm text-zinc-400 mt-1'>
                    Albums approved for the daily game rotation
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
