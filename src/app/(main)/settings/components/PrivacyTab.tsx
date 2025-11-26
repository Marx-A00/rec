'use client';

import { Loader2, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { TabsContent } from '@/components/ui/tabs';

interface PreferencesData {
  profileVisibility: string;
  followersVisible: boolean;
  collectionsVisible: boolean;
  recommendationsVisible: boolean;
  allowFollows: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

interface PrivacyTabProps {
  preferences: PreferencesData;
  setPreferences: React.Dispatch<React.SetStateAction<PreferencesData>>;
  isLoading: boolean;
  onSave: () => Promise<void>;
}

export default function PrivacyTab({
  preferences,
  setPreferences,
  isLoading,
  onSave,
}: PrivacyTabProps) {
  return (
    <TabsContent value='privacy' className='p-6 space-y-6'>
      <div className='space-y-6'>
        <h3 className='text-xl font-semibold text-white'>Privacy Settings</h3>

        <div className='space-y-4'>
          <div className='flex items-center justify-between py-3 border-b border-zinc-700'>
            <div>
              <h4 className='text-white font-medium'>Show followers</h4>
              <p className='text-zinc-400 text-sm'>
                Display your followers list publicly
              </p>
            </div>
            <input
              type='checkbox'
              checked={preferences.followersVisible}
              onChange={e =>
                setPreferences(prev => ({
                  ...prev,
                  followersVisible: e.target.checked,
                }))
              }
              className='rounded border-zinc-600 text-cosmic-latte focus:ring-cosmic-latte'
            />
          </div>

          <div className='flex items-center justify-between py-3 border-b border-zinc-700'>
            <div>
              <h4 className='text-white font-medium'>Show collections</h4>
              <p className='text-zinc-400 text-sm'>
                Allow others to view your album collections
              </p>
            </div>
            <input
              type='checkbox'
              checked={preferences.collectionsVisible}
              onChange={e =>
                setPreferences(prev => ({
                  ...prev,
                  collectionsVisible: e.target.checked,
                }))
              }
              className='rounded border-zinc-600 text-cosmic-latte focus:ring-cosmic-latte'
            />
          </div>

          <div className='flex items-center justify-between py-3 border-b border-zinc-700'>
            <div>
              <h4 className='text-white font-medium'>Show recommendations</h4>
              <p className='text-zinc-400 text-sm'>
                Display your music recommendations publicly
              </p>
            </div>
            <input
              type='checkbox'
              checked={preferences.recommendationsVisible}
              onChange={e =>
                setPreferences(prev => ({
                  ...prev,
                  recommendationsVisible: e.target.checked,
                }))
              }
              className='rounded border-zinc-600 text-cosmic-latte focus:ring-cosmic-latte'
            />
          </div>

          <div className='flex items-center justify-between py-3'>
            <div>
              <h4 className='text-white font-medium'>Allow follows</h4>
              <p className='text-zinc-400 text-sm'>
                Let other users follow your profile
              </p>
            </div>
            <input
              type='checkbox'
              checked={preferences.allowFollows}
              onChange={e =>
                setPreferences(prev => ({
                  ...prev,
                  allowFollows: e.target.checked,
                }))
              }
              className='rounded border-zinc-600 text-cosmic-latte focus:ring-cosmic-latte'
            />
          </div>
        </div>

        <Button
          onClick={onSave}
          disabled={isLoading}
          className='flex items-center gap-2'
        >
          {isLoading ? (
            <Loader2 className='w-4 h-4 animate-spin' />
          ) : (
            <Save className='w-4 h-4' />
          )}
          Save Privacy Settings
        </Button>
      </div>
    </TabsContent>
  );
}
