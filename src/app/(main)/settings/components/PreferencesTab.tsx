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

interface PreferencesTabProps {
  preferences: PreferencesData;
  setPreferences: React.Dispatch<React.SetStateAction<PreferencesData>>;
  isLoading: boolean;
  onSave: () => Promise<void>;
}

export default function PreferencesTab({
  preferences,
  setPreferences,
  isLoading,
  onSave,
}: PreferencesTabProps) {
  return (
    <TabsContent value='preferences' className='p-6 space-y-6'>
      <div className='space-y-6'>
        <h3 className='text-xl font-semibold text-white'>Preferences</h3>

        {/* Profile Visibility */}
        <div className='space-y-3'>
          <h4 className='text-lg font-medium text-zinc-200'>
            Profile Visibility
          </h4>
          <div className='space-y-2'>
            <label className='flex items-center gap-3'>
              <input
                type='radio'
                name='profileVisibility'
                value='public'
                checked={preferences.profileVisibility === 'public'}
                onChange={e =>
                  setPreferences(prev => ({
                    ...prev,
                    profileVisibility: e.target.value,
                  }))
                }
                className='text-cosmic-latte focus:ring-cosmic-latte'
              />
              <span className='text-white'>
                Public - Anyone can view your profile
              </span>
            </label>
            <label className='flex items-center gap-3'>
              <input
                type='radio'
                name='profileVisibility'
                value='followers'
                checked={preferences.profileVisibility === 'followers'}
                onChange={e =>
                  setPreferences(prev => ({
                    ...prev,
                    profileVisibility: e.target.value,
                  }))
                }
                className='text-cosmic-latte focus:ring-cosmic-latte'
              />
              <span className='text-white'>Followers only</span>
            </label>
            <label className='flex items-center gap-3'>
              <input
                type='radio'
                name='profileVisibility'
                value='private'
                checked={preferences.profileVisibility === 'private'}
                onChange={e =>
                  setPreferences(prev => ({
                    ...prev,
                    profileVisibility: e.target.value,
                  }))
                }
                className='text-cosmic-latte focus:ring-cosmic-latte'
              />
              <span className='text-white'>Private - Only you can view</span>
            </label>
          </div>
        </div>

        {/* Notifications */}
        <div className='space-y-3'>
          <h4 className='text-lg font-medium text-zinc-200'>Notifications</h4>
          <div className='space-y-3'>
            <label className='flex items-center justify-between'>
              <span className='text-white'>Email notifications</span>
              <input
                type='checkbox'
                checked={preferences.emailNotifications}
                onChange={e =>
                  setPreferences(prev => ({
                    ...prev,
                    emailNotifications: e.target.checked,
                  }))
                }
                className='rounded border-zinc-600 text-cosmic-latte focus:ring-cosmic-latte'
              />
            </label>
            <label className='flex items-center justify-between'>
              <span className='text-white'>Push notifications</span>
              <input
                type='checkbox'
                checked={preferences.pushNotifications}
                onChange={e =>
                  setPreferences(prev => ({
                    ...prev,
                    pushNotifications: e.target.checked,
                  }))
                }
                className='rounded border-zinc-600 text-cosmic-latte focus:ring-cosmic-latte'
              />
            </label>
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
          Save Preferences
        </Button>
      </div>
    </TabsContent>
  );
}
