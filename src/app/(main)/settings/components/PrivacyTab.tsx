'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';
import {
  useGetMySettingsQuery,
  useUpdateUserSettingsMutation,
} from '@/generated/graphql';

interface PrivacySettings {
  profileVisibility: string;
  showRecentActivity: boolean;
  showCollections: boolean;
  showListenLaterInFeed: boolean;
  showCollectionAddsInFeed: boolean;
}

export default function PrivacyTab() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading: isLoadingSettings } = useGetMySettingsQuery();
  const updateMutation = useUpdateUserSettingsMutation();

  const [settings, setSettings] = useState<PrivacySettings>({
    profileVisibility: 'public',
    showRecentActivity: true,
    showCollections: true,
    showListenLaterInFeed: true,
    showCollectionAddsInFeed: true,
  });

  // Sync local state with fetched data
  useEffect(() => {
    if (data?.mySettings) {
      setSettings({
        profileVisibility: data.mySettings.profileVisibility || 'public',
        showRecentActivity: data.mySettings.showRecentActivity ?? true,
        showCollections: data.mySettings.showCollections ?? true,
        showListenLaterInFeed: data.mySettings.showListenLaterInFeed ?? true,
        showCollectionAddsInFeed:
          data.mySettings.showCollectionAddsInFeed ?? true,
      });
    }
  }, [data]);

  const handleToggle = async (
    field: keyof PrivacySettings,
    value: boolean | string
  ) => {
    const previousSettings = { ...settings };
    const newSettings = { ...settings, [field]: value };
    setSettings(newSettings);

    try {
      await updateMutation.mutateAsync({
        profileVisibility:
          field === 'profileVisibility'
            ? (value as string)
            : settings.profileVisibility,
        showRecentActivity:
          field === 'showRecentActivity'
            ? (value as boolean)
            : settings.showRecentActivity,
        showCollections:
          field === 'showCollections'
            ? (value as boolean)
            : settings.showCollections,
        showListenLaterInFeed:
          field === 'showListenLaterInFeed'
            ? (value as boolean)
            : settings.showListenLaterInFeed,
        showCollectionAddsInFeed:
          field === 'showCollectionAddsInFeed'
            ? (value as boolean)
            : settings.showCollectionAddsInFeed,
      });

      // Invalidate the settings query to refetch
      queryClient.invalidateQueries({ queryKey: ['GetMySettings'] });
      showToast('Privacy settings updated', 'success');
    } catch {
      // Rollback on error
      setSettings(previousSettings);
      showToast('Failed to update settings', 'error');
    }
  };

  if (isLoadingSettings) {
    return (
      <TabsContent value='privacy' className='p-6'>
        <div className='flex items-center justify-center py-12'>
          <Loader2 className='w-6 h-6 animate-spin text-cosmic-latte' />
        </div>
      </TabsContent>
    );
  }

  return (
    <TabsContent value='privacy' className='p-6 space-y-6'>
      <div className='space-y-6'>
        <div>
          <h3 className='text-xl font-semibold text-white'>Privacy Settings</h3>
          <p className='text-zinc-400 text-sm mt-1'>
            Control who can see your activity and profile content
          </p>
        </div>

        {/* Profile Visibility */}
        <div className='space-y-4'>
          <div className='flex items-center justify-between py-3 border-b border-zinc-800'>
            <div className='flex-1'>
              <h4 className='font-medium text-white'>Profile Visibility</h4>
              <p className='text-sm text-zinc-400'>
                Who can view your profile page
              </p>
            </div>
            <select
              className='bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-cosmic-latte transition-colors'
              value={settings.profileVisibility}
              onChange={e => handleToggle('profileVisibility', e.target.value)}
              disabled={updateMutation.isPending}
            >
              <option value='public'>Public</option>
              <option value='followers'>Followers Only</option>
              <option value='private'>Private</option>
            </select>
          </div>

          {/* Show Activity in Feed */}
          <ToggleRow
            title='Show Activity in Feed'
            description="Display your activity in your followers' feeds"
            checked={settings.showRecentActivity}
            onChange={value => handleToggle('showRecentActivity', value)}
            disabled={updateMutation.isPending}
          />

          {/* Show Collections on Profile */}
          <ToggleRow
            title='Show Collections on Profile'
            description='Display your album collections on your profile page'
            checked={settings.showCollections}
            onChange={value => handleToggle('showCollections', value)}
            disabled={updateMutation.isPending}
          />

          {/* Show Listen Later in Feed */}
          <ToggleRow
            title='Show Listen Later Additions'
            description='Show in feed when you save albums for later'
            checked={settings.showListenLaterInFeed}
            onChange={value => handleToggle('showListenLaterInFeed', value)}
            disabled={updateMutation.isPending || !settings.showRecentActivity}
          />

          {/* Show Collection Adds in Feed */}
          <ToggleRow
            title='Show Collection Additions'
            description='Show in feed when you add albums to collections'
            checked={settings.showCollectionAddsInFeed}
            onChange={value => handleToggle('showCollectionAddsInFeed', value)}
            disabled={updateMutation.isPending || !settings.showRecentActivity}
          />
        </div>

        {/* Info Note */}
        {!settings.showRecentActivity && (
          <div className='bg-zinc-800/50 border border-zinc-700 rounded-lg p-4'>
            <p className='text-sm text-zinc-400'>
              <span className='text-cosmic-latte font-medium'>Note:</span> Since
              &quot;Show Activity in Feed&quot; is disabled, your Listen Later
              and Collection additions won&apos;t appear in anyone&apos;s feed
              regardless of those individual settings.
            </p>
          </div>
        )}
      </div>
    </TabsContent>
  );
}

// Toggle Row Component
function ToggleRow({
  title,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className='flex items-center justify-between py-3 border-b border-zinc-800'>
      <div className='flex-1'>
        <h4
          className={`font-medium ${disabled ? 'text-zinc-500' : 'text-white'}`}
        >
          {title}
        </h4>
        <p className='text-sm text-zinc-400'>{description}</p>
      </div>
      <button
        type='button'
        role='switch'
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cosmic-latte focus:ring-offset-2 focus:ring-offset-zinc-900
          ${checked ? 'bg-emeraled-green' : 'bg-zinc-700'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
            transition duration-200 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  );
}
