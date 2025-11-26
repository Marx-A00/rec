'use client';

import { Loader2, Play, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { TabsContent } from '@/components/ui/tabs';

interface UserData {
  recommendationsCount: number;
  followersCount: number;
  followingCount: number;
}

interface AccountTabProps {
  user: UserData;
  isLoading: boolean;
  isStartingTour: boolean;
  onRestartTour: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
}

export default function AccountTab({
  user,
  isLoading,
  isStartingTour,
  onRestartTour,
  onDeleteAccount,
}: AccountTabProps) {
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

          <div className='bg-blue-900/20 border border-blue-700 rounded-lg p-4'>
            <h4 className='text-blue-400 font-medium mb-2'>App Tutorial</h4>
            <p className='text-zinc-400 text-sm mb-4'>
              Restart the interactive tour to learn about all features and how
              to use the app effectively.
            </p>
            <Button
              onClick={onRestartTour}
              disabled={isStartingTour}
              className='flex items-center gap-2 bg-blue-600 hover:bg-blue-700'
            >
              {isStartingTour ? (
                <Loader2 className='w-4 h-4 animate-spin' />
              ) : (
                <Play className='w-4 h-4' />
              )}
              {isStartingTour ? 'Starting Tour...' : 'Restart App Tour'}
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
