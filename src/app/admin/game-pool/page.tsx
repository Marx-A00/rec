'use client';

import { Gamepad2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GamePoolStats } from '@/components/admin/game-pool/GamePoolStats';
import { EligibleAlbumsTable } from '@/components/admin/game-pool/EligibleAlbumsTable';
import { SuggestedAlbumsTable } from '@/components/admin/game-pool/SuggestedAlbumsTable';

export default function GamePoolPage() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Gamepad2 className="h-8 w-8 text-blue-500" />
          <h1 className="text-3xl font-bold text-white">Game Pool</h1>
        </div>
        <p className="text-zinc-400 mt-1">
          Manage albums eligible for the daily Uncover game
        </p>
      </div>

      {/* Stats Overview */}
      <div className="mb-8">
        <GamePoolStats />
      </div>

      {/* Album Management Tabs */}
      <Tabs defaultValue="eligible" className="space-y-6">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="eligible">Eligible Albums</TabsTrigger>
          <TabsTrigger value="suggested">Suggested Albums</TabsTrigger>
        </TabsList>

        <TabsContent value="eligible" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Eligible Albums
              </h2>
              <p className="text-sm text-zinc-400 mt-1">
                Albums approved for the daily game rotation
              </p>
            </div>
          </div>
          <EligibleAlbumsTable />
        </TabsContent>

        <TabsContent value="suggested" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Suggested Albums
              </h2>
              <p className="text-sm text-zinc-400 mt-1">
                Albums with cover art awaiting review
              </p>
            </div>
          </div>
          <SuggestedAlbumsTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
