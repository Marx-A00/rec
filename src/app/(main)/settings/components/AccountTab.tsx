'use client';

import { Loader2, Trash2, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { TabsContent } from '@/components/ui/tabs';
import { useHintStore } from '@/stores/useHintStore';

interface UserData {
  recommendationsCount: number;
  followersCount: number;
  followingCount: number;
}

interface AccountTabProps {
  user: UserData;
  isLoading: boolean;
  onDeleteAccount: () => Promise<void>;
}

export default function AccountTab({
  user,
  isLoading,
  onDeleteAccount,
}: AccountTabProps) {
  const resetHints = useHintStore(state => state.resetHints);

  return (
    <TabsContent value='account' className='p-6 space-y-6'>
      <div className='space-y-6'>
        <h3 className='text-xl font-semibold text-white'>Account Management</h3>

        <div className='space-y-4'>
          <div className='bg-zinc-800 rounded-lg p-4 border border-zinc-700'>
            <h4 className='text-white font-medium mb-2'>Account Statistics</h4>
            <div className='grid grid-cols-3 gap-4 text-center'>
              <div>
                <div className='text-2xl font-bold text-cosmic-latte'>
                  {user.recommendationsCount}
                </div>
                <div className='text-zinc-400 text-sm'>Recommendations</div>
              </div>
              <div>
                <div className='text-2xl font-bold text-cosmic-latte'>
                  {user.followersCount}
                </div>
                <div className='text-zinc-400 text-sm'>Followers</div>
              </div>
              <div>
                <div className='text-2xl font-bold text-cosmic-latte'>
                  {user.followingCount}
                </div>
                <div className='text-zinc-400 text-sm'>Following</div>
              </div>
            </div>
          </div>

          <div className='bg-zinc-800 rounded-lg p-4 border border-zinc-700'>
            <h4 className='text-white font-medium mb-2'>Help Hints</h4>
            <p className='text-zinc-400 text-sm mb-4'>
              Reset the contextual hints that appear on your first visit to key
              pages. This will show them all again.
            </p>
            <Button
              onClick={resetHints}
              variant='outline'
              className='flex items-center gap-2'
            >
              <RotateCcw className='w-4 h-4' />
              Reset Help Hints
            </Button>
          </div>

          <div className='bg-red-900/20 border border-red-700 rounded-lg p-4'>
            <h4 className='text-red-400 font-medium mb-2'>Danger Zone</h4>
            <p className='text-zinc-400 text-sm mb-4'>
              Once you delete your account, there is no going back. Please be
              certain.
            </p>
            <Button
              variant='destructive'
              onClick={onDeleteAccount}
              disabled={isLoading}
              className='flex items-center gap-2'
            >
              {isLoading ? (
                <Loader2 className='w-4 h-4 animate-spin' />
              ) : (
                <Trash2 className='w-4 h-4' />
              )}
              Delete Account
            </Button>
          </div>
        </div>
      </div>
    </TabsContent>
  );
}
