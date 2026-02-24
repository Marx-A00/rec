'use client';

import { useState, useCallback } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Eye, EyeOff, Mail, Lock } from 'lucide-react';

import { MobileButton } from '@/components/mobile/MobileButton';
import { getAuthErrorMessage } from '@/types/auth';
import { useDevLogin } from '@/hooks/useDevLogin';

interface FieldErrors {
  identifier?: string;
  password?: string;
}

export default function MobileSignInPage() {
  const router = useRouter();

  // Dev only: Ctrl+C Ctrl+C to auto-login
  useDevLogin('/m');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isCredentialsLoading, setIsCredentialsLoading] = useState(false);
  const [credentials, setCredentials] = useState({
    identifier: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError('');
    try {
      await signIn('google', { callbackUrl: '/m' });
    } catch {
      setError('Failed to sign in with Google');
      setIsGoogleLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: FieldErrors = {};
    let isValid = true;

    if (!credentials.identifier.trim()) {
      errors.identifier = 'Email or username is required';
      isValid = false;
    }

    if (!credentials.password) {
      errors.password = 'Password is required';
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (!validateForm()) {
      return;
    }

    setIsCredentialsLoading(true);

    try {
      const result = await signIn('credentials', {
        identifier: credentials.identifier,
        password: credentials.password,
        redirect: false,
      });

      if (result?.error) {
        const errorMessage = getAuthErrorMessage(result.error);
        setError(errorMessage);
      } else if (result?.ok) {
        router.push('/m');
        router.refresh();
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsCredentialsLoading(false);
    }
  };

  const isLoading = isGoogleLoading || isCredentialsLoading;

  // Scroll input into view when mobile keyboard appears
  const handleInputFocus = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      setTimeout(() => {
        e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    },
    []
  );

  return (
    <div className='min-h-screen bg-black flex flex-col'>
      {/* Header */}
      <div className='px-4 py-3 flex items-center'>
        <button
          onClick={() => router.back()}
          className='min-h-[44px] min-w-[44px] flex items-center justify-center -ml-2 text-white'
          aria-label='Go back'
        >
          <ArrowLeft className='h-5 w-5' />
        </button>
      </div>

      {/* Content */}
      <div className='flex-1 px-6 py-4'>
        {/* Logo/Title */}
        <div className='text-center mb-8'>
          <div className='w-16 h-16 rounded-full bg-cosmic-latte/20 flex items-center justify-center mx-auto mb-4'>
            <span className='text-3xl font-bold text-cosmic-latte'>R</span>
          </div>
          <h1 className='text-2xl font-bold text-white mb-2'>Welcome back</h1>
          <p className='text-zinc-400'>Sign in to continue to Rec</p>
        </div>

        {/* Google Sign In */}
        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className='w-full flex items-center justify-center gap-3 bg-white text-black font-medium py-3.5 px-4 rounded-xl disabled:opacity-50 transition-opacity min-h-[52px]'
        >
          {isGoogleLoading ? (
            <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-black' />
          ) : (
            <>
              <svg className='h-5 w-5' viewBox='0 0 24 24'>
                <path
                  fill='#4285F4'
                  d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
                />
                <path
                  fill='#34A853'
                  d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
                />
                <path
                  fill='#FBBC05'
                  d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
                />
                <path
                  fill='#EA4335'
                  d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
                />
              </svg>
              Continue with Google
            </>
          )}
        </button>

        {/* Divider */}
        <div className='flex items-center gap-4 my-6'>
          <div className='flex-1 h-px bg-zinc-800' />
          <span className='text-sm text-zinc-500'>or</span>
          <div className='flex-1 h-px bg-zinc-800' />
        </div>

        {/* Error Message */}
        {error && (
          <div className='bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4'>
            <p className='text-red-400 text-sm'>{error}</p>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleCredentialsSignIn} className='space-y-4'>
          <div>
            <label
              htmlFor='identifier'
              className='block text-sm font-medium text-zinc-400 mb-2'
            >
              Email or Username
            </label>
            <div className='relative'>
              <Mail className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500' />
              <input
                id='identifier'
                name='identifier'
                type='text'
                autoComplete='username'
                autoCapitalize='none'
                autoCorrect='off'
                required
                value={credentials.identifier}
                onChange={e => {
                  setCredentials({
                    ...credentials,
                    identifier: e.target.value,
                  });
                  if (fieldErrors.identifier) {
                    setFieldErrors({ ...fieldErrors, identifier: undefined });
                  }
                }}
                onFocus={handleInputFocus}
                disabled={isLoading}
                className={`w-full h-[52px] pl-12 pr-4 bg-zinc-900 border rounded-xl text-base text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 disabled:opacity-50 transition-colors ${
                  fieldErrors.identifier ? 'border-red-500' : 'border-zinc-800'
                }`}
                placeholder='you@example.com'
                aria-invalid={!!fieldErrors.identifier}
                aria-describedby={
                  fieldErrors.identifier ? 'identifier-error' : undefined
                }
              />
            </div>
            {fieldErrors.identifier && (
              <p
                id='identifier-error'
                className='mt-2 text-sm text-red-400'
                role='alert'
              >
                {fieldErrors.identifier}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor='password'
              className='block text-sm font-medium text-zinc-400 mb-2'
            >
              Password
            </label>
            <div className='relative'>
              <Lock className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500' />
              <input
                id='password'
                name='password'
                type={showPassword ? 'text' : 'password'}
                autoComplete='current-password'
                autoCapitalize='none'
                autoCorrect='off'
                required
                value={credentials.password}
                onChange={e => {
                  setCredentials({ ...credentials, password: e.target.value });
                  if (fieldErrors.password) {
                    setFieldErrors({ ...fieldErrors, password: undefined });
                  }
                }}
                onFocus={handleInputFocus}
                disabled={isLoading}
                className={`w-full h-[52px] pl-12 pr-12 bg-zinc-900 border rounded-xl text-base text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 disabled:opacity-50 transition-colors ${
                  fieldErrors.password ? 'border-red-500' : 'border-zinc-800'
                }`}
                placeholder='Enter your password'
                aria-invalid={!!fieldErrors.password}
                aria-describedby={
                  fieldErrors.password ? 'password-error' : undefined
                }
              />
              <button
                type='button'
                onClick={() => setShowPassword(!showPassword)}
                className='absolute right-4 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2 text-zinc-500'
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className='h-5 w-5' />
                ) : (
                  <Eye className='h-5 w-5' />
                )}
              </button>
            </div>
            {fieldErrors.password && (
              <p
                id='password-error'
                className='mt-2 text-sm text-red-400'
                role='alert'
              >
                {fieldErrors.password}
              </p>
            )}
          </div>

          <MobileButton
            type='submit'
            disabled={isLoading}
            className='w-full mt-6'
            size='lg'
          >
            {isCredentialsLoading ? (
              <div className='flex items-center gap-2'>
                <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-black' />
                Signing in...
              </div>
            ) : (
              'Sign in'
            )}
          </MobileButton>
        </form>

        {/* Forgot Password Link */}
        <div className='text-center mt-4'>
          <Link
            href='/m/auth/forgot-password'
            className='text-sm text-zinc-400 hover:text-white transition-colors'
          >
            Forgot your password?
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className='px-6 py-6 text-center border-t border-zinc-800'>
        <p className='text-zinc-400'>
          Don&apos;t have an account?{' '}
          <Link
            href='/m/auth/register'
            className='text-white font-medium hover:text-cosmic-latte transition-colors'
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
