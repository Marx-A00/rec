'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { User, Palette, Shield, Trash2, Loader2 } from 'lucide-react';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';
import { useUpdateUserProfileMutation } from '@/hooks/useUpdateUserProfileMutation';
import {
  useGetUserProfileQuery,
  useUpdateUserSettingsMutation,
} from '@/generated/graphql';
import { uploadAvatar } from '@/lib/upload-avatar';
import BackButton from '@/components/ui/BackButton';

import ProfileTab from './components/ProfileTab';
import PreferencesTab from './components/PreferencesTab';
import PrivacyTab from './components/PrivacyTab';
import AccountTab from './components/AccountTab';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const { showToast } = useToast();

  const userId = session?.user?.id || '';

  // Fetch user profile data via GraphQL
  const {
    data: userData,
    isLoading: isLoadingUser,
    error,
  } = useGetUserProfileQuery({ userId }, { enabled: !!userId });

  const updateProfileMutation = useUpdateUserProfileMutation(userId);
  const updateSettingsMutation = useUpdateUserSettingsMutation();

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    username: '',
    bio: '',
  });

  // Deferred avatar state — captured on select, uploaded on save
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [avatarCleared, setAvatarCleared] = useState(false);
  const [avatarResetKey, setAvatarResetKey] = useState(0);

  // Arcade button toggle (admin only) — instant-save
  const [showArcadeButton, setShowArcadeButton] = useState(true);

  // Preferences state
  const [preferences, setPreferences] = useState({
    profileVisibility: 'public',
    followersVisible: true,
    collectionsVisible: true,
    recommendationsVisible: true,
    allowFollows: true,
    emailNotifications: true,
    pushNotifications: false,
  });

  // Update form when data loads
  useEffect(() => {
    if (userData?.user) {
      setProfileForm({
        username: userData.user.username || '',
        bio: userData.user.bio || '',
      });
      setShowArcadeButton(userData.user.settings?.showArcadeButton ?? true);
    }
  }, [userData]);

  // Dirty state detection for profile
  const hasProfileChanges =
    profileForm.username !== (userData?.user?.username || '') ||
    profileForm.bio !== (userData?.user?.bio || '') ||
    avatarBlob !== null ||
    avatarCleared;

  const handleAvatarSelect = (blob: Blob) => {
    setAvatarBlob(blob);
    setAvatarCleared(false);
  };

  const handleAvatarClear = () => {
    setAvatarBlob(null);
    setAvatarCleared(true);
  };

  // Dirty state detection for preferences/privacy
  const _hasPreferencesChanges = false; // TODO: implement when we load actual settings

  // Reset profile form to original values
  const handleDiscardProfileChanges = () => {
    setProfileForm({
      username: userData?.user?.username || '',
      bio: userData?.user?.bio || '',
    });
    setAvatarBlob(null);
    setAvatarCleared(false);
    setAvatarResetKey(k => k + 1);
  };

  // Redirect if not authenticated
  if (status === 'loading') {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <Loader2 className='w-8 h-8 animate-spin text-cosmic-latte' />
      </div>
    );
  }

  if (status === 'unauthenticated' || !session?.user?.id) {
    redirect('/signin');
  }

  const handleProfileSave = async () => {
    try {
      setIsLoading(true);

      let image: string | null | undefined;
      if (avatarBlob) {
        image = await uploadAvatar(avatarBlob);
      } else if (avatarCleared) {
        image = '';
      }

      await updateProfileMutation.mutateAsync({
        username: profileForm.username.trim(),
        bio: profileForm.bio.trim(),
        ...(image !== undefined ? { image } : {}),
      });

      setAvatarBlob(null);
      setAvatarCleared(false);
      setAvatarResetKey(k => k + 1);
      showToast('Profile updated successfully', 'success');
    } catch {
      showToast('Failed to update profile', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleArcadeButton = async (value: boolean) => {
    setShowArcadeButton(value);
    try {
      await updateSettingsMutation.mutateAsync({ showArcadeButton: value });
      showToast(
        value ? 'Arcade button enabled' : 'Arcade button hidden',
        'success'
      );
    } catch {
      setShowArcadeButton(!value);
      showToast('Failed to update arcade button', 'error');
    }
  };

  const handlePreferencesSave = async () => {
    try {
      setIsLoading(true);

      // Use GraphQL mutation for user settings
      await updateSettingsMutation.mutateAsync({
        profileVisibility: preferences.profileVisibility,
        showRecentActivity: true,
        showCollections: preferences.collectionsVisible,
      });

      showToast('Preferences saved successfully', 'success');
    } catch {
      showToast('Failed to save preferences', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    // Confirm account deletion with user
    if (
      // eslint-disable-next-line no-alert
      window.confirm(
        'Are you sure you want to delete your account? This action cannot be undone.'
      )
    ) {
      try {
        setIsLoading(true);
        // TODO: Implement account deletion API
        await new Promise(resolve => setTimeout(resolve, 1000)); // Mock delay
        showToast('Account deletion initiated', 'success');
      } catch {
        showToast('Failed to delete account', 'error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (isLoadingUser) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <Loader2 className='w-8 h-8 animate-spin text-cosmic-latte' />
      </div>
    );
  }

  if (error || !userData?.user) {
    return (
      <div className='max-w-4xl mx-auto space-y-6'>
        <div className='flex items-center gap-4'>
          <BackButton />
          <div>
            <h1 className='text-3xl font-bold text-white'>Settings</h1>
            <p className='text-red-400 mt-2'>Failed to load user data</p>
          </div>
        </div>
      </div>
    );
  }

  const user = userData.user;

  return (
    <div className='max-w-4xl mx-auto space-y-6'>
      {/* Header */}
      <div className='flex items-center gap-4'>
        <BackButton />
        <div>
          <h1 className='text-3xl font-bold text-white'>Settings</h1>
          <p className='text-zinc-400 mt-2'>
            Manage your account settings and preferences
          </p>
        </div>
      </div>

      {/* Settings Content */}
      <div className='bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden'>
        <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
          <TabsList className='grid w-full grid-cols-4 bg-zinc-800 border-b border-zinc-700'>
            <TabsTrigger
              value='profile'
              className='data-[state=active]:bg-cosmic-latte data-[state=active]:text-black flex items-center gap-2'
            >
              <User className='w-4 h-4' />
              Profile
            </TabsTrigger>
            <TabsTrigger
              value='preferences'
              className='data-[state=active]:bg-cosmic-latte data-[state=active]:text-black flex items-center gap-2'
            >
              <Palette className='w-4 h-4' />
              Preferences
            </TabsTrigger>
            <TabsTrigger
              value='privacy'
              className='data-[state=active]:bg-cosmic-latte data-[state=active]:text-black flex items-center gap-2'
            >
              <Shield className='w-4 h-4' />
              Privacy
            </TabsTrigger>
            <TabsTrigger
              value='account'
              className='data-[state=active]:bg-cosmic-latte data-[state=active]:text-black flex items-center gap-2'
            >
              <Trash2 className='w-4 h-4' />
              Account
            </TabsTrigger>
          </TabsList>

          <ProfileTab
            user={user}
            profileForm={profileForm}
            setProfileForm={setProfileForm}
            showEmail={showEmail}
            setShowEmail={setShowEmail}
            isLoading={isLoading}
            updateProfileMutation={updateProfileMutation}
            hasChanges={hasProfileChanges}
            onSave={handleProfileSave}
            onDiscard={handleDiscardProfileChanges}
            isAdmin={user.role === 'ADMIN' || user.role === 'OWNER'}
            showArcadeButton={showArcadeButton}
            onToggleArcadeButton={handleToggleArcadeButton}
            isArcadePending={updateSettingsMutation.isPending}
            avatarResetKey={avatarResetKey}
            onAvatarSelect={handleAvatarSelect}
            onAvatarClear={handleAvatarClear}
          />

          <PreferencesTab
            preferences={preferences}
            setPreferences={setPreferences}
            isLoading={isLoading}
            onSave={handlePreferencesSave}
          />

          <PrivacyTab />

          <AccountTab
            user={user}
            isLoading={isLoading}
            onDeleteAccount={handleDeleteAccount}
          />
        </Tabs>
      </div>
    </div>
  );
}
