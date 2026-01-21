'use client';

import { Eye, EyeOff, Loader2, RotateCcw, Save } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { TabsContent } from '@/components/ui/tabs';

interface ProfileFormData {
  username: string;
  bio: string;
}

interface UserData {
  username?: string | null;
  email?: string | null;
  image?: string | null;
  followersCount: number;
  recommendationsCount: number;
}

interface ProfileTabProps {
  user: UserData;
  profileForm: ProfileFormData;
  setProfileForm: React.Dispatch<React.SetStateAction<ProfileFormData>>;
  showEmail: boolean;
  setShowEmail: (value: boolean) => void;
  isLoading: boolean;
  updateProfileMutation: {
    isPending: boolean;
  };
  hasChanges: boolean;
  onSave: () => Promise<void>;
  onDiscard: () => void;
}

export default function ProfileTab({
  user,
  profileForm,
  setProfileForm,
  showEmail,
  setShowEmail,
  isLoading,
  updateProfileMutation,
  hasChanges,
  onSave,
  onDiscard,
}: ProfileTabProps) {
  return (
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
              alt={user.username || 'User'}
            />
            <AvatarFallback className='bg-zinc-800 text-zinc-200 text-lg'>
              {user.username?.charAt(0) || 'A'}
            </AvatarFallback>
          </Avatar>
          <div className='space-y-2'>
            <h4 className='text-lg font-medium text-white'>{user.username}</h4>
            <p className='text-zinc-400 text-sm'>
              {user.recommendationsCount} recommendations •{' '}
              {user.followersCount} followers
            </p>
            <Button variant='outline' size='sm' className='mt-2'>
              Change Avatar
            </Button>
          </div>
        </div>

        {/* Username Field */}
        <div className='space-y-2'>
          <label className='text-sm font-medium text-zinc-200'>
            Display Name
          </label>
          <input
            type='text'
            value={profileForm.username}
            onChange={e =>
              setProfileForm(prev => ({ ...prev, username: e.target.value }))
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

        {/* Action Buttons */}
        <div className='flex items-center gap-3'>
          <Button
            onClick={onDiscard}
            disabled={
              !hasChanges || isLoading || updateProfileMutation.isPending
            }
            className='flex items-center gap-2 bg-dark-pastel-red text-white hover:bg-dark-pastel-red/90'
          >
            <RotateCcw className='w-4 h-4' />
            Discard Changes
          </Button>
          <Button
            onClick={onSave}
            disabled={
              !hasChanges || isLoading || updateProfileMutation.isPending
            }
            className='flex items-center gap-2'
          >
            {isLoading || updateProfileMutation.isPending ? (
              <Loader2 className='w-4 h-4 animate-spin' />
            ) : (
              <Save className='w-4 h-4' />
            )}
            {hasChanges ? 'Save Changes' : 'No Changes'}
          </Button>
        </div>

        {hasChanges && (
          <p className='text-sm text-yellow-400'>
            You have unsaved changes to your profile.
          </p>
        )}
      </div>
    </TabsContent>
  );
}
