'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Palette,
  Shield,
  Trash2,
  Eye,
  EyeOff,
  Save,
  Loader2,
  Play,
} from 'lucide-react';
import { useNextStep } from 'nextstepjs';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/toast';
import { useUpdateUserProfileMutation } from '@/hooks/useUpdateUserProfileMutation';

interface SettingsUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  bio: string | null;
  followersCount: number;
  followingCount: number;
  recommendationsCount: number;
}

interface SettingsClientProps {
  user: SettingsUser;
}

export default function SettingsClient({ user }: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [isStartingTour, setIsStartingTour] = useState(false);
  const { showToast } = useToast();
  const updateProfileMutation = useUpdateUserProfileMutation(user.id);
  const router = useRouter();
  const { startNextStep } = useNextStep();

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: user.name || '',
    bio: user.bio || '',
  });

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

  const handleProfileSave = async () => {
    try {
      setIsLoading(true);
      await updateProfileMutation.mutateAsync({
        name: profileForm.name.trim(),
        bio: profileForm.bio.trim(),
      });
      showToast('Profile updated successfully', 'success');
    } catch (error) {
      showToast('Failed to update profile', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreferencesSave = async () => {
    try {
      setIsLoading(true);
      // TODO: Implement preferences API
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock delay
      showToast('Preferences saved successfully', 'success');
    } catch (error) {
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
      } catch (error) {
        showToast('Failed to delete account', 'error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleRestartTour = async () => {
    try {
      setIsStartingTour(true);
      showToast('Starting tour...', 'success');

      // Navigate to home page first
      router.push('/');

      // Wait for navigation to complete, then start the tour
      setTimeout(() => {
        try {
          // Clear any existing tour state to ensure a fresh start
          localStorage.removeItem('nextstep-welcome-onboarding');

          // Start the welcome onboarding tour
          startNextStep('welcome-onboarding');
          console.log('🚀 Tour restarted from settings');
        } catch (error) {
          console.error('❌ Error starting tour:', error);
          showToast('Failed to start tour', 'error');
        } finally {
          setIsStartingTour(false);
        }
      }, 1500); // Give enough time for navigation and page load
    } catch (error) {
      console.error('❌ Error restarting tour:', error);
      showToast('Failed to restart tour', 'error');
      setIsStartingTour(false);
    }
  };

  return (
    <div className='bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden'>
      <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
        <TabsList className='grid w-full grid-cols-4 bg-zinc-800 border-b border-zinc-700'>
          <TabsTrigger
            value='profile'
            className='data-[state=active]:bg-zinc-700 flex items-center gap-2'
          >
            <User className='w-4 h-4' />
            Profile
          </TabsTrigger>
          <TabsTrigger
            value='preferences'
            className='data-[state=active]:bg-zinc-700 flex items-center gap-2'
          >
            <Palette className='w-4 h-4' />
            Preferences
          </TabsTrigger>
          <TabsTrigger
            value='privacy'
            className='data-[state=active]:bg-zinc-700 flex items-center gap-2'
          >
            <Shield className='w-4 h-4' />
            Privacy
          </TabsTrigger>
          <TabsTrigger
            value='account'
            className='data-[state=active]:bg-zinc-700 flex items-center gap-2'
          >
            <Trash2 className='w-4 h-4' />
            Account
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value='profile' className='p-6 space-y-6'>
          <div className='space-y-6'>
            <h3 className='text-xl font-semibold text-white'>
              Profile Information
            </h3>

            {/* Avatar Section */}
            <div className='flex items-center gap-6'>
              <Avatar className='h-20 w-20'>
                <AvatarImage
                  src={user.image || '/placeholder.svg'}
                  alt={user.name || 'User'}
                />
                <AvatarFallback className='bg-zinc-800 text-zinc-200 text-lg'>
                  {user.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className='space-y-2'>
                <h4 className='text-lg font-medium text-white'>{user.name}</h4>
                <p className='text-zinc-400 text-sm'>
                  {user.recommendationsCount} recommendations •{' '}
                  {user.followersCount} followers
                </p>
                <Button variant='outline' size='sm' className='mt-2'>
                  Change Avatar
                </Button>
              </div>
            </div>

            {/* Name Field */}
            <div className='space-y-2'>
              <label className='text-sm font-medium text-zinc-200'>
                Display Name
              </label>
              <input
                type='text'
                value={profileForm.name}
                onChange={e =>
                  setProfileForm(prev => ({ ...prev, name: e.target.value }))
                }
                className='w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-md text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-cosmic-latte focus:border-transparent'
                placeholder='Your display name'
              />
            </div>

            {/* Bio Field */}
            <div className='space-y-2'>
              <label className='text-sm font-medium text-zinc-200'>Bio</label>
              <textarea
                value={profileForm.bio}
                onChange={e =>
                  setProfileForm(prev => ({ ...prev, bio: e.target.value }))
                }
                className='w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-md text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-cosmic-latte focus:border-transparent h-24 resize-none'
                placeholder='Tell us about yourself...'
              />
            </div>

            {/* Email Display */}
            <div className='space-y-2'>
              <label className='text-sm font-medium text-zinc-200'>Email</label>
              <div className='flex items-center gap-3'>
                <span className='text-zinc-400'>
                  {showEmail ? user.email : '••••••••@••••••.com'}
                </span>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => setShowEmail(!showEmail)}
                  className='p-1'
                >
                  {showEmail ? (
                    <EyeOff className='w-4 h-4' />
                  ) : (
                    <Eye className='w-4 h-4' />
                  )}
                </Button>
              </div>
            </div>

            <Button
              onClick={handleProfileSave}
              disabled={isLoading || updateProfileMutation.isPending}
              className='flex items-center gap-2'
            >
              {isLoading || updateProfileMutation.isPending ? (
                <Loader2 className='w-4 h-4 animate-spin' />
              ) : (
                <Save className='w-4 h-4' />
              )}
              Save Profile
            </Button>
          </div>
        </TabsContent>

        {/* Preferences Tab */}
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
                  <span className='text-white'>
                    Private - Only you can view
                  </span>
                </label>
              </div>
            </div>

            {/* Notifications */}
            <div className='space-y-3'>
              <h4 className='text-lg font-medium text-zinc-200'>
                Notifications
              </h4>
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
              onClick={handlePreferencesSave}
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

        {/* Privacy Tab */}
        <TabsContent value='privacy' className='p-6 space-y-6'>
          <div className='space-y-6'>
            <h3 className='text-xl font-semibold text-white'>
              Privacy Settings
            </h3>

            <div className='space-y-4'>
              <div className='flex items-center justify-between py-3 border-b border-zinc-700'>
                <div>
                  <h4 className='text-white font-medium'>
                    Show followers count
                  </h4>
                  <p className='text-zinc-400 text-sm'>
                    Display follower count on your profile
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
                  <h4 className='text-white font-medium'>
                    Show recommendations
                  </h4>
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
              onClick={handlePreferencesSave}
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

        {/* Account Tab */}
        <TabsContent value='account' className='p-6 space-y-6'>
          <div className='space-y-6'>
            <h3 className='text-xl font-semibold text-white'>
              Account Management
            </h3>

            <div className='space-y-4'>
              <div className='bg-zinc-800 rounded-lg p-4 border border-zinc-700'>
                <h4 className='text-white font-medium mb-2'>
                  Account Statistics
                </h4>
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
                  Restart the interactive tour to learn about all features and
                  how to use the app effectively.
                </p>
                <Button
                  onClick={handleRestartTour}
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
                  Once you delete your account, there is no going back. Please
                  be certain.
                </p>
                <Button
                  variant='destructive'
                  onClick={handleDeleteAccount}
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
      </Tabs>
    </div>
  );
}
