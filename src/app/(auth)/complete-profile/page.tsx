// src/app/(auth)/complete-profile/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import AvatarUpload from '@/components/profile/AvatarUpload';
import { uploadAvatar } from '@/lib/upload-avatar';
import { validateUsernameForRegistration } from '@/lib/validations';

export default function CompleteProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

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

  // If user already completed onboarding, redirect to home
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.profileUpdatedAt) {
      router.replace('/home-mosaic');
    }
  }, [status, session, router]);

  // Debounced username availability check
  useEffect(() => {
    if (!username || username.length < 2) {
      setIsAvailable(null);
      return;
    }

    const validation = validateUsernameForRegistration(username);
    if (!validation.isValid) {
      setValidationError(validation.message || 'Invalid username');
      setIsAvailable(null);
      return;
    }
    setValidationError('');

    const timeoutId = setTimeout(async () => {
      setIsCheckingAvailability(true);
      try {
        const response = await fetch(
          `/api/auth/check-username?username=${encodeURIComponent(username)}`
        );
        const data = await response.json();
        setIsAvailable(data.available);
      } catch {
        setIsAvailable(null);
      } finally {
        setIsCheckingAvailability(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validate
    const validation = validateUsernameForRegistration(username);
    if (!validation.isValid) {
      setError(validation.message || 'Invalid username');
      setIsLoading(false);
      return;
    }

    if (!isAvailable) {
      setError('This username is not available');
      setIsLoading(false);
      return;
    }

    try {
      // Upload avatar if user selected one
      let imageUrl: string | undefined;
      if (avatarBlob) {
        imageUrl = await uploadAvatar(avatarBlob);
      } else if (avatarCleared) {
        imageUrl = '';
      }

      const body: Record<string, string | null | undefined> = {
        username: username.trim(),
        bio: bio.trim() || undefined,
      };
      if (imageUrl !== undefined) {
        body.image = imageUrl || null;
      }

      const response = await fetch(`/api/users/${session?.user?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || data.error || 'Failed to set username');
      }

      // Update the session to reflect the new username
      await update();

      // Redirect to home mosaic so the onboarding tour can auto-start
      router.replace('/home-mosaic');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className='min-h-screen flex items-center justify-center bg-black'>
        <Loader2 className='w-8 h-8 animate-spin text-cosmic-latte' />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.replace('/signin');
    return null;
  }

  return (
    <div className='bg-black/80 backdrop-blur-sm rounded-2xl p-8 border border-zinc-800/50'>
      <div className='w-full'>
        {/* Header — avatar + text side by side */}
        <div className='flex items-center gap-5 mb-6'>
          <div className='shrink-0'>
            <AvatarUpload
              currentImage={session?.user?.image}
              onImageSelect={handleImageSelect}
              onImageClear={handleImageClear}
              size='default'
            />
          </div>
          <div>
            <h1 className='text-2xl font-bold text-white mb-1'>
              Set up your profile
            </h1>
            <p className='text-base text-zinc-400'>
              Choose a username and tell us about yourself.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='space-y-1.5'>
            <label
              htmlFor='username'
              className='text-sm font-medium text-zinc-200'
            >
              Username
            </label>
            <div className='relative'>
              <input
                id='username'
                type='text'
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase())}
                placeholder='yourname'
                autoComplete='username'
                autoCapitalize='none'
                autoCorrect='off'
                spellCheck='false'
                autoFocus
                className='w-full px-4 h-12 bg-zinc-900 border border-zinc-700 rounded-lg text-base text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cosmic-latte focus:border-transparent pr-12'
              />
              {/* Status indicator */}
              <div className='absolute right-3 top-1/2 -translate-y-1/2'>
                {isCheckingAvailability && (
                  <Loader2 className='w-5 h-5 animate-spin text-zinc-400' />
                )}
                {!isCheckingAvailability && isAvailable === true && (
                  <CheckCircle className='w-5 h-5 text-green-500' />
                )}
                {!isCheckingAvailability && isAvailable === false && (
                  <XCircle className='w-5 h-5 text-red-500' />
                )}
              </div>
            </div>

            {/* Validation/availability feedback */}
            {validationError ? (
              <p className='text-xs text-red-400'>{validationError}</p>
            ) : isAvailable === false ? (
              <p className='text-xs text-red-400'>
                This username is already taken
              </p>
            ) : isAvailable === true ? (
              <p className='text-xs text-green-400'>Username is available!</p>
            ) : (
              <p className='text-xs text-zinc-500'>
                2-30 characters. Letters, numbers, hyphens, underscores, and
                periods only.
              </p>
            )}
          </div>

          <div className='space-y-1.5'>
            <label htmlFor='bio' className='text-sm font-medium text-zinc-200'>
              Bio <span className='text-zinc-500 font-normal'>(optional)</span>
            </label>
            <textarea
              id='bio'
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder='Tell us a little about yourself...'
              maxLength={160}
              rows={3}
              className='w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-base text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cosmic-latte focus:border-transparent resize-none'
            />
            <p className='text-xs text-zinc-500 text-right'>{bio.length}/160</p>
          </div>

          {error && (
            <div className='p-2.5 rounded-lg bg-red-500/10 border border-red-500/20'>
              <p className='text-sm text-red-400'>{error}</p>
            </div>
          )}
          <Button
            type='submit'
            disabled={isLoading || !isAvailable || !!validationError}
            className='w-full py-3 bg-cosmic-latte text-black font-semibold rounded-lg hover:bg-cosmic-latte/90 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {isLoading ? (
              <Loader2 className='w-5 h-5 animate-spin' />
            ) : (
              'Save & Continue'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
