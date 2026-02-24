// Desktop equivalent: src/app/(main)/settings/page.tsx
// Privacy logic from: src/app/(main)/settings/components/PrivacyTab.tsx
// Account logic from: src/app/(main)/settings/components/AccountTab.tsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Loader2,
  LogOut,
  Trash2,
  ChevronDown,
  User,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

import { MobileButton } from '@/components/mobile/MobileButton';
import { useToast } from '@/components/ui/toast';
import {
  useGetUserProfileQuery,
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

interface MobileSettingsClientProps {
  userId: string;
}

export default function MobileSettingsClient({
  userId,
}: MobileSettingsClientProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch user profile
  const {
    data: userData,
    isLoading: isLoadingUser,
    isError: isErrorUser,
    error: errorUser,
    refetch: refetchUser,
  } = useGetUserProfileQuery({ userId }, { enabled: !!userId });

  // Fetch settings
  const {
    data: settingsData,
    isLoading: isLoadingSettings,
    isError: isErrorSettings,
    error: errorSettings,
    refetch: refetchSettings,
  } = useGetMySettingsQuery();

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
    if (settingsData?.mySettings) {
      setSettings({
        profileVisibility:
          settingsData.mySettings.profileVisibility || 'public',
        showRecentActivity: settingsData.mySettings.showRecentActivity ?? true,
        showCollections: settingsData.mySettings.showCollections ?? true,
        showListenLaterInFeed:
          settingsData.mySettings.showListenLaterInFeed ?? true,
        showCollectionAddsInFeed:
          settingsData.mySettings.showCollectionAddsInFeed ?? true,
      });
    }
  }, [settingsData]);

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

      queryClient.invalidateQueries({ queryKey: ['GetMySettings'] });
      showToast('Settings updated', 'success');
    } catch {
      setSettings(previousSettings);
      showToast('Failed to update settings', 'error');
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut({ callbackUrl: '/m/auth/signin' });
    } catch {
      showToast('Failed to sign out', 'error');
      setIsSigningOut(false);
    }
  };

  const handleDeleteAccount = async () => {
    // TODO: Implement account deletion API
    showToast('Account deletion not yet implemented', 'error');
    setShowDeleteConfirm(false);
  };

  const isLoading = isLoadingUser || isLoadingSettings;

  if (isLoading) {
    return (
      <div className='min-h-screen bg-black'>
        {/* Header */}
        <div className='sticky top-0 z-10 bg-black/95 backdrop-blur-lg border-b border-zinc-800'>
          <div className='flex items-center gap-3 px-4 py-3'>
            <button
              onClick={() => router.back()}
              className='min-h-[44px] min-w-[44px] flex items-center justify-center -ml-2 text-white'
              aria-label='Go back'
            >
              <ArrowLeft className='h-5 w-5' />
            </button>
            <h1 className='text-lg font-semibold text-white'>Settings</h1>
          </div>
        </div>

        {/* Loading skeleton */}
        <div className='p-4 space-y-6'>
          <div className='flex items-center gap-4'>
            <div className='w-16 h-16 rounded-full bg-zinc-800 animate-pulse' />
            <div className='space-y-2'>
              <div className='h-5 w-32 bg-zinc-800 rounded animate-pulse' />
              <div className='h-4 w-48 bg-zinc-800 rounded animate-pulse' />
            </div>
          </div>
          <div className='space-y-3'>
            {[1, 2, 3, 4, 5].map(i => (
              <div
                key={i}
                className='h-16 bg-zinc-800 rounded-lg animate-pulse'
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isErrorUser || isErrorSettings) {
    const errorMessage =
      errorUser instanceof Error
        ? errorUser.message
        : errorSettings instanceof Error
          ? errorSettings.message
          : 'Could not load your settings';

    return (
      <div className='min-h-screen bg-black'>
        {/* Header */}
        <div className='sticky top-0 z-10 bg-black/95 backdrop-blur-lg border-b border-zinc-800'>
          <div className='flex items-center gap-3 px-4 py-3'>
            <button
              onClick={() => router.back()}
              className='min-h-[44px] min-w-[44px] flex items-center justify-center -ml-2 text-white'
              aria-label='Go back'
            >
              <ArrowLeft className='h-5 w-5' />
            </button>
            <h1 className='text-lg font-semibold text-white'>Settings</h1>
          </div>
        </div>
        <div className='flex flex-col items-center justify-center min-h-[60vh] px-6 text-center'>
          <div className='w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4'>
            <AlertCircle className='h-8 w-8 text-zinc-600' />
          </div>
          <h2 className='text-xl font-bold text-white mb-2'>
            Failed to Load Settings
          </h2>
          <p className='text-zinc-400 mb-6'>{errorMessage}</p>
          <MobileButton
            onClick={() => {
              refetchUser();
              refetchSettings();
            }}
            leftIcon={<RefreshCw className='h-4 w-4' />}
          >
            Try Again
          </MobileButton>
        </div>
      </div>
    );
  }

  const user = userData?.user;

  return (
    <div className='min-h-screen bg-black pb-24'>
      {/* Header */}
      <div className='sticky top-0 z-10 bg-black/95 backdrop-blur-lg border-b border-zinc-800'>
        <div className='flex items-center gap-3 px-4 py-3'>
          <button
            onClick={() => router.back()}
            className='min-h-[44px] min-w-[44px] flex items-center justify-center -ml-2 text-white'
            aria-label='Go back'
          >
            <ArrowLeft className='h-5 w-5' />
          </button>
          <h1 className='text-lg font-semibold text-white'>Settings</h1>
        </div>
      </div>

      <div className='p-4 space-y-6'>
        {/* Profile Section */}
        <div className='bg-zinc-900 rounded-xl p-4 border border-zinc-800'>
          <div className='flex items-center gap-4'>
            {user?.image ? (
              <img
                src={user.image}
                alt={user.username || 'Profile'}
                className='w-16 h-16 rounded-full object-cover'
              />
            ) : (
              <div className='w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center'>
                <User className='w-8 h-8 text-zinc-500' />
              </div>
            )}
            <div className='flex-1 min-w-0'>
              <h2 className='text-lg font-semibold text-white truncate'>
                {user?.username || 'Unknown User'}
              </h2>
              <p className='text-sm text-zinc-400 truncate'>{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Privacy Section */}
        <div className='bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden'>
          <div className='px-4 py-3 border-b border-zinc-800'>
            <h3 className='text-sm font-semibold text-zinc-400 uppercase tracking-wider'>
              Privacy
            </h3>
          </div>

          {/* Profile Visibility */}
          <div className='px-4 py-4 border-b border-zinc-800'>
            <div className='flex items-center justify-between'>
              <div className='flex-1 pr-4'>
                <h4 className='font-medium text-white'>Profile Visibility</h4>
                <p className='text-sm text-zinc-400 mt-0.5'>
                  Who can view your profile
                </p>
              </div>
              <div className='relative'>
                <select
                  className='appearance-none bg-zinc-800 border border-zinc-700 rounded-lg pl-3 pr-8 py-2 text-sm text-white focus:outline-none focus:border-cosmic-latte min-h-[44px]'
                  value={settings.profileVisibility}
                  onChange={e =>
                    handleToggle('profileVisibility', e.target.value)
                  }
                  disabled={updateMutation.isPending}
                >
                  <option value='public'>Public</option>
                  <option value='followers'>Followers Only</option>
                  <option value='private'>Private</option>
                </select>
                <ChevronDown className='absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none' />
              </div>
            </div>
          </div>

          {/* Toggle Settings */}
          <ToggleRow
            title='Show Activity in Feed'
            description="Display activity in followers' feeds"
            checked={settings.showRecentActivity}
            onChange={value => handleToggle('showRecentActivity', value)}
            disabled={updateMutation.isPending}
          />

          <ToggleRow
            title='Show Collections'
            description='Display collections on your profile'
            checked={settings.showCollections}
            onChange={value => handleToggle('showCollections', value)}
            disabled={updateMutation.isPending}
          />

          <ToggleRow
            title='Show Listen Later'
            description='Show when you save albums for later'
            checked={settings.showListenLaterInFeed}
            onChange={value => handleToggle('showListenLaterInFeed', value)}
            disabled={updateMutation.isPending || !settings.showRecentActivity}
          />

          <ToggleRow
            title='Show Collection Adds'
            description='Show when you add albums to collections'
            checked={settings.showCollectionAddsInFeed}
            onChange={value => handleToggle('showCollectionAddsInFeed', value)}
            disabled={updateMutation.isPending || !settings.showRecentActivity}
            isLast
          />

          {/* Info Note */}
          {!settings.showRecentActivity && (
            <div className='px-4 py-3 bg-zinc-800/50'>
              <p className='text-xs text-zinc-400'>
                <span className='text-cosmic-latte font-medium'>Note:</span>{' '}
                Activity feed is disabled, so individual feed settings won't
                apply.
              </p>
            </div>
          )}
        </div>

        {/* Account Section */}
        <div className='bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden'>
          <div className='px-4 py-3 border-b border-zinc-800'>
            <h3 className='text-sm font-semibold text-zinc-400 uppercase tracking-wider'>
              Account
            </h3>
          </div>

          {/* Stats */}
          <div className='px-4 py-4 border-b border-zinc-800'>
            <div className='grid grid-cols-3 gap-4 text-center'>
              <div>
                <div className='text-xl font-bold text-cosmic-latte'>
                  {user?.recommendationsCount ?? 0}
                </div>
                <div className='text-xs text-zinc-400'>Recs</div>
              </div>
              <div>
                <div className='text-xl font-bold text-cosmic-latte'>
                  {user?.followersCount ?? 0}
                </div>
                <div className='text-xs text-zinc-400'>Followers</div>
              </div>
              <div>
                <div className='text-xl font-bold text-cosmic-latte'>
                  {user?.followingCount ?? 0}
                </div>
                <div className='text-xs text-zinc-400'>Following</div>
              </div>
            </div>
          </div>

          {/* Sign Out */}
          <div className='p-4'>
            <MobileButton
              variant='secondary'
              size='lg'
              fullWidth
              onClick={handleSignOut}
              disabled={isSigningOut}
              leftIcon={
                isSigningOut ? (
                  <Loader2 className='w-5 h-5 animate-spin' />
                ) : (
                  <LogOut className='w-5 h-5' />
                )
              }
            >
              {isSigningOut ? 'Signing out...' : 'Sign Out'}
            </MobileButton>
          </div>
        </div>

        {/* Danger Zone */}
        <div className='bg-red-900/20 rounded-xl border border-red-900/50 overflow-hidden'>
          <div className='px-4 py-3 border-b border-red-900/50'>
            <h3 className='text-sm font-semibold text-red-400 uppercase tracking-wider'>
              Danger Zone
            </h3>
          </div>

          <div className='p-4 space-y-3'>
            <p className='text-sm text-zinc-400'>
              Once you delete your account, there is no going back. Please be
              certain.
            </p>

            {!showDeleteConfirm ? (
              <MobileButton
                variant='destructive'
                size='lg'
                fullWidth
                onClick={() => setShowDeleteConfirm(true)}
                leftIcon={<Trash2 className='w-5 h-5' />}
              >
                Delete Account
              </MobileButton>
            ) : (
              <div className='space-y-3'>
                <p className='text-sm text-red-400 font-medium'>
                  Are you sure? This action cannot be undone.
                </p>
                <div className='flex gap-3'>
                  <MobileButton
                    variant='secondary'
                    size='md'
                    className='flex-1'
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </MobileButton>
                  <MobileButton
                    variant='destructive'
                    size='md'
                    className='flex-1'
                    onClick={handleDeleteAccount}
                  >
                    Yes, Delete
                  </MobileButton>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Toggle Row Component
function ToggleRow({
  title,
  description,
  checked,
  onChange,
  disabled = false,
  isLast = false,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  isLast?: boolean;
}) {
  return (
    <div className={`px-4 py-4 ${!isLast ? 'border-b border-zinc-800' : ''}`}>
      <div className='flex items-center justify-between'>
        <div className='flex-1 pr-4'>
          <h4
            className={`font-medium ${disabled ? 'text-zinc-500' : 'text-white'}`}
          >
            {title}
          </h4>
          <p className='text-sm text-zinc-400 mt-0.5'>{description}</p>
        </div>
        <button
          type='button'
          role='switch'
          aria-checked={checked}
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className={`
            relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
            transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cosmic-latte focus:ring-offset-2 focus:ring-offset-zinc-900
            ${checked ? 'bg-emeraled-green' : 'bg-zinc-700'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <span
            className={`
              pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 
              transition duration-200 ease-in-out
              ${checked ? 'translate-x-5' : 'translate-x-0'}
            `}
          />
        </button>
      </div>
    </div>
  );
}
