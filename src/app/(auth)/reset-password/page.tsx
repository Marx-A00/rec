'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

import BackButton from '@/components/ui/BackButton';
import PasswordStrength from '@/components/auth/PasswordStrength';
import { validatePassword } from '@/lib/validations';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');

  // Invalid link state
  if (!token || !email) {
    return (
      <div className='space-y-6'>
        <BackButton
          text='Back'
          fallbackHref='/signin'
          className='inline-flex items-center text-zinc-400 hover:text-white transition-colors text-sm -mt-2 mb-4'
        />

        <div className='text-center space-y-3'>
          <div className='inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/20 backdrop-blur-sm border border-red-500/30 mb-4'>
            <svg
              className='w-6 h-6 text-red-400'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={1.5}
                d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
              />
            </svg>
          </div>
          <h1 className='text-2xl font-bold text-white tracking-tight'>
            Invalid reset link
          </h1>
        </div>

        <div className='bg-black/40 backdrop-blur-sm border border-zinc-700/50 rounded-xl p-6 shadow-2xl space-y-4'>
          <p className='text-zinc-400 text-sm text-center'>
            This password reset link is invalid or incomplete. Please request a
            new one.
          </p>
          <Link
            href='/forgot-password'
            className='block w-full text-center rounded-lg border border-transparent bg-cosmic-latte py-2.5 px-4 text-sm font-medium text-black hover:bg-cosmic-latte/90 transition-all duration-200'
          >
            Request new reset link
          </Link>
        </div>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className='space-y-6'>
        <div className='text-center space-y-3'>
          <div className='inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/20 backdrop-blur-sm border border-green-500/30 mb-4'>
            <svg
              className='w-6 h-6 text-green-400'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={1.5}
                d='M5 13l4 4L19 7'
              />
            </svg>
          </div>
          <h1 className='text-2xl font-bold text-white tracking-tight'>
            Password reset
          </h1>
        </div>

        <div className='bg-black/40 backdrop-blur-sm border border-zinc-700/50 rounded-xl p-6 shadow-2xl space-y-4'>
          <p className='text-zinc-300 text-sm text-center'>
            Your password has been reset successfully. You can now sign in with
            your new password.
          </p>
          <Link
            href='/signin'
            className='block w-full text-center rounded-lg border border-transparent bg-cosmic-latte py-2.5 px-4 text-sm font-medium text-black hover:bg-cosmic-latte/90 transition-all duration-200'
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldError('');

    // Validate password
    const validation = validatePassword(password);
    if (!validation.isValid) {
      setFieldError(validation.message || 'Invalid password');
      return;
    }

    // Check passwords match
    if (password !== confirmPassword) {
      setFieldError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        return;
      }

      setIsSuccess(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const passwordToggleIcon = showPassword ? (
    <svg
      className='h-5 w-5'
      fill='none'
      stroke='currentColor'
      viewBox='0 0 24 24'
    >
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={2}
        d='M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21'
      />
    </svg>
  ) : (
    <svg
      className='h-5 w-5'
      fill='none'
      stroke='currentColor'
      viewBox='0 0 24 24'
    >
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={2}
        d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
      />
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={2}
        d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'
      />
    </svg>
  );

  return (
    <div className='space-y-6'>
      <BackButton
        text='Back'
        fallbackHref='/signin'
        className='inline-flex items-center text-zinc-400 hover:text-white transition-colors text-sm -mt-2 mb-4'
      />

      <div className='text-center space-y-3'>
        <div className='inline-flex items-center justify-center w-12 h-12 rounded-full bg-cosmic-latte/20 backdrop-blur-sm border border-cosmic-latte/30 mb-4'>
          <svg
            className='w-6 h-6 text-cosmic-latte'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={1.5}
              d='M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z'
            />
          </svg>
        </div>

        <h1 className='text-2xl font-bold text-white tracking-tight'>
          Set new password
        </h1>

        <p className='text-sm text-zinc-400 inline-block bg-black/40 backdrop-blur-sm px-3 py-1 rounded-lg'>
          Choose a strong password for your account
        </p>
      </div>

      <div className='bg-black/40 backdrop-blur-sm border border-zinc-700/50 rounded-xl p-6 shadow-2xl space-y-4'>
        <form onSubmit={handleSubmit} className='space-y-4' noValidate>
          {error && (
            <div
              className='rounded-lg bg-red-500/10 border border-red-500/20 p-4'
              role='alert'
            >
              <p className='text-red-400 text-sm font-medium'>{error}</p>
            </div>
          )}

          <div>
            <label
              htmlFor='password'
              className='block text-sm font-medium text-zinc-300 mb-2'
            >
              New password
            </label>
            <div className='relative'>
              <input
                id='password'
                name='password'
                type={showPassword ? 'text' : 'password'}
                autoComplete='new-password'
                autoCapitalize='none'
                autoCorrect='off'
                spellCheck='false'
                required
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  if (fieldError) setFieldError('');
                  if (error) setError('');
                }}
                className='block w-full rounded-lg border border-zinc-700/50 bg-black/40 backdrop-blur-sm px-3 min-h-12 pr-12 text-base text-white placeholder-zinc-400 focus:border-cosmic-latte/50 focus:outline-none focus:ring-2 focus:ring-cosmic-latte/50 transition-all duration-200'
                placeholder='Enter new password'
              />
              <button
                type='button'
                onClick={() => setShowPassword(!showPassword)}
                className='absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-200 focus:outline-none focus:text-zinc-200 transition-colors duration-200'
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {passwordToggleIcon}
              </button>
            </div>
            <PasswordStrength password={password} />
          </div>

          <div>
            <label
              htmlFor='confirmPassword'
              className='block text-sm font-medium text-zinc-300 mb-2'
            >
              Confirm new password
            </label>
            <div className='relative'>
              <input
                id='confirmPassword'
                name='confirmPassword'
                type={showPassword ? 'text' : 'password'}
                autoComplete='new-password'
                autoCapitalize='none'
                autoCorrect='off'
                spellCheck='false'
                required
                value={confirmPassword}
                onChange={e => {
                  setConfirmPassword(e.target.value);
                  if (fieldError) setFieldError('');
                }}
                className='block w-full rounded-lg border border-zinc-700/50 bg-black/40 backdrop-blur-sm px-3 min-h-12 pr-12 text-base text-white placeholder-zinc-400 focus:border-cosmic-latte/50 focus:outline-none focus:ring-2 focus:ring-cosmic-latte/50 transition-all duration-200'
                placeholder='Confirm new password'
              />
            </div>
          </div>

          {fieldError && (
            <p className='text-sm text-red-400 font-medium' role='alert'>
              {fieldError}
            </p>
          )}

          <button
            type='submit'
            disabled={isLoading || !password || !confirmPassword}
            className='group relative flex w-full justify-center rounded-lg border border-transparent bg-cosmic-latte py-2.5 px-4 text-sm font-medium text-black hover:bg-cosmic-latte/90 focus:outline-none focus:ring-2 focus:ring-cosmic-latte/50 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200'
          >
            {isLoading ? (
              <span className='flex items-center'>
                <svg
                  className='animate-spin -ml-1 mr-3 h-5 w-5 text-black'
                  xmlns='http://www.w3.org/2000/svg'
                  fill='none'
                  viewBox='0 0 24 24'
                >
                  <circle
                    className='opacity-25'
                    cx='12'
                    cy='12'
                    r='10'
                    stroke='currentColor'
                    strokeWidth='4'
                  ></circle>
                  <path
                    className='opacity-75'
                    fill='currentColor'
                    d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                  ></path>
                </svg>
                Resetting password...
              </span>
            ) : (
              'Reset password'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className='flex items-center justify-center min-h-[50vh]'>
          <svg
            className='animate-spin h-8 w-8 text-cosmic-latte'
            xmlns='http://www.w3.org/2000/svg'
            fill='none'
            viewBox='0 0 24 24'
          >
            <circle
              className='opacity-25'
              cx='12'
              cy='12'
              r='10'
              stroke='currentColor'
              strokeWidth='4'
            ></circle>
            <path
              className='opacity-75'
              fill='currentColor'
              d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
            ></path>
          </svg>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
