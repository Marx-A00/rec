'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';

import AvatarUpload from '@/components/profile/AvatarUpload';
import { MobileButton } from '@/components/mobile/MobileButton';
import { MobileInput } from '@/components/mobile/MobileInput';
import Toast, { useToast } from '@/components/ui/toast';
import { useUpdateProfileMutation } from '@/generated/graphql';
import { uploadAvatar } from '@/lib/upload-avatar';
import { validateNameForProfile } from '@/lib/validations';

interface MobileEditProfileClientProps {
  user: {
    id: string;
    username: string | null;
    bio: string | null;
    image: string | null;
  };
}

export default function MobileEditProfileClient({
  user,
}: MobileEditProfileClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast, showToast, hideToast } = useToast();

  const [username, setUsername] = useState(user.username || '');
  const [bio, setBio] = useState(user.bio || '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Deferred avatar state
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [avatarCleared, setAvatarCleared] = useState(false);

  const handleImageSelect = useCallback((blob: Blob) => {
    setAvatarBlob(blob);
    setAvatarCleared(false);
  }, []);

  const handleImageClear = useCallback(() => {
    setAvatarBlob(null);
    setAvatarCleared(true);
  }, []);

  const textDirty = useMemo(() => {
    return (
      username.trim() !== (user.username || '') ||
      bio.trim() !== (user.bio || '')
    );
  }, [username, bio, user.username, user.bio]);

  const avatarDirty = avatarBlob !== null || avatarCleared;
  const isDirty = textDirty || avatarDirty;

  const { mutate: updateProfile, isPending } = useUpdateProfileMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['GetUserProfile'] });
      showToast('Profile updated', 'success');
      router.push(`/m/profile/${user.id}`);
    },
    onError: (error: Error) => {
      showToast(error.message || 'Failed to update profile', 'error');
    },
  });

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);

    const validation = validateNameForProfile(value);
    setNameError(validation.isValid ? null : validation.message || null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateNameForProfile(username);
    if (!validation.isValid) {
      setNameError(validation.message || 'Invalid username');
      return;
    }

    try {
      // Upload avatar if user selected one
      let imageUrl: string | undefined;
      if (avatarBlob) {
        setIsUploading(true);
        imageUrl = await uploadAvatar(avatarBlob);
        setIsUploading(false);
      } else if (avatarCleared) {
        imageUrl = '';
      }

      const variables: {
        username: string;
        bio: string;
        image?: string | null;
      } = {
        username: username.trim(),
        bio: bio.trim(),
      };

      if (imageUrl !== undefined) {
        variables.image = imageUrl || null;
      }

      updateProfile(variables);
    } catch (err) {
      setIsUploading(false);
      showToast(
        err instanceof Error ? err.message : 'Failed to upload avatar',
        'error'
      );
    }
  };

  const isBusy = isPending || isUploading;
  const canSave =
    isDirty && !nameError && username.trim().length > 0 && !isBusy;

  return (
    <div className='min-h-screen bg-black'>
      {/* Sticky Header */}
      <div className='sticky top-0 z-10 bg-black/90 backdrop-blur-sm border-b border-zinc-800 px-4 py-3'>
        <div className='flex items-center justify-between'>
          <button
            onClick={() => router.back()}
            className='flex items-center text-white min-h-[44px] min-w-[44px]'
            aria-label='Go back'
          >
            <ArrowLeft className='h-5 w-5' />
          </button>
          <h1 className='text-lg font-semibold text-white'>Edit Profile</h1>
          <div className='min-w-[44px]' />
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className='px-4 py-6 space-y-6'>
        {/* Avatar Section */}
        <div className='flex flex-col items-center gap-2'>
          <AvatarUpload
            currentImage={user.image}
            onImageSelect={handleImageSelect}
            onImageClear={handleImageClear}
          />
          <p className='text-sm text-zinc-400'>Tap to change photo</p>
        </div>

        {/* Username */}
        <div>
          <MobileInput
            label='Display Name'
            value={username}
            onChange={handleUsernameChange}
            maxLength={30}
            placeholder='Enter your display name'
            error={nameError || undefined}
            autoCapitalize='none'
            autoCorrect='off'
          />
          {!nameError && (
            <p className='mt-1.5 text-xs text-zinc-500'>
              {username.length}/30 characters
            </p>
          )}
        </div>

        {/* Bio */}
        <div>
          <label className='mb-1.5 block text-sm font-medium text-zinc-300'>
            Bio
          </label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            maxLength={500}
            rows={4}
            placeholder='Tell others about yourself and your music taste...'
            className='flex w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-3 text-base text-white shadow-sm transition-colors placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emeraled-green focus-visible:border-emeraled-green resize-none'
          />
          <p className='mt-1.5 text-xs text-zinc-500'>
            {bio.length}/500 characters
          </p>
        </div>

        {/* Save Button */}
        <MobileButton
          type='submit'
          variant='primary'
          size='lg'
          fullWidth
          loading={isBusy}
          disabled={!canSave}
        >
          {isUploading ? 'Uploading...' : 'Save Changes'}
        </MobileButton>
      </form>

      {/* Toast */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </div>
  );
}
