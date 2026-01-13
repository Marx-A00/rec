// src/app/(auth)/complete-profile/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2, User, CheckCircle, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { validateUsernameForRegistration } from '@/lib/validations';

export default function CompleteProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  // If user already has a username, redirect to browse
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.name) {
      router.replace('/browse');
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
      const response = await fetch(`/api/users/${session?.user?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || data.error || 'Failed to set username');
      }

      // Update the session to reflect the new username
      await update();

      // Redirect to browse page
      router.replace('/browse');
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
    <div className='min-h-screen flex items-center justify-center bg-black px-4'>
      <div className='w-full max-w-md'>
        {/* Header */}
        <div className='text-center mb-8'>
          <div className='inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-800 mb-4'>
            <User className='w-8 h-8 text-cosmic-latte' />
          </div>
          <h1 className='text-2xl font-bold text-white mb-2'>
            Choose your username
          </h1>
          <p className='text-zinc-400'>
            Pick a unique username to complete your profile. This is how others
            will find and recognize you.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className='space-y-6'>
          <div className='space-y-2'>
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
                autoFocus
                className='w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cosmic-latte focus:border-transparent pr-10'
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
            {validationError && (
              <p className='text-sm text-red-400'>{validationError}</p>
            )}
            {!validationError && isAvailable === false && (
              <p className='text-sm text-red-400'>
                This username is already taken
              </p>
            )}
            {!validationError && isAvailable === true && (
              <p className='text-sm text-green-400'>Username is available!</p>
            )}

            <p className='text-xs text-zinc-500'>
              2-30 characters. Letters, numbers, hyphens, underscores, and
              periods only.
            </p>
          </div>

          {error && (
            <div className='p-3 rounded-lg bg-red-500/10 border border-red-500/20'>
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
              'Continue'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

