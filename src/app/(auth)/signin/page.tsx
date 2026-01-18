'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import BackButton from '@/components/ui/BackButton';
import { getAuthErrorMessage } from '@/types/auth';

export default function SignIn() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  // const [isSpotifyLoading, setIsSpotifyLoading] = useState(false);
  const [isCredentialsLoading, setIsCredentialsLoading] = useState(false);
  const [credentials, setCredentials] = useState({
    identifier: '',
    password: '',
  });
  const [credentialsError, setCredentialsError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    // Redirect to a protected route so the middleware can check for username
    await signIn('google', { callbackUrl: '/browse' });
  };

  // const handleSpotifySignIn = async () => {
  //   setIsSpotifyLoading(true);
  //   await signIn('spotify');
  // };

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCredentialsLoading(true);
    setCredentialsError('');

    try {
      const result = await signIn('credentials', {
        identifier: credentials.identifier,
        password: credentials.password,
        redirect: false,
      });

      if (result?.error) {
        // Parse the error and show a user-friendly message
        const errorMessage = getAuthErrorMessage(result.error);
        setCredentialsError(errorMessage);
        console.error('[signin] Authentication failed:', result.error);
      } else if (result?.ok) {
        // Successful sign-in - redirect to a protected route
        // Middleware will redirect to /complete-profile if username is missing
        router.push('/browse');
        router.refresh();
      } else {
        // Unexpected state
        setCredentialsError('An unexpected error occurred. Please try again.');
      }
    } catch (error) {
      console.error('[signin] Unexpected error during sign-in:', error);
      setCredentialsError('An error occurred. Please try again.');
    } finally {
      setIsCredentialsLoading(false);
    }
  };

  return (
    <div className='space-y-6'>
      {/* Back Button */}
      <BackButton
        text='Back'
        fallbackHref='/'
        className='inline-flex items-center text-zinc-400 hover:text-white transition-colors text-sm -mt-2 mb-4'
      />
      {/* Header */}
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
              d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
            />
          </svg>
        </div>

        <h1 className='text-2xl font-bold text-white tracking-tight'>
          Welcome back
        </h1>

        <p className='text-sm text-zinc-800'>
          New around here?{' '}
          <Link
            href='/register'
            className='font-medium text-white hover:text-cosmic-latte/80 transition-colors duration-200 underline underline-offset-4'
            aria-label='Create a new account - Go to registration page'
          >
            Create a new account
          </Link>
        </p>
      </div>

      {/* Sign In Form */}
      <div className='bg-black/40 backdrop-blur-sm border border-zinc-700/50 rounded-xl p-6 shadow-2xl space-y-4'>
        {/* OAuth Buttons */}
        <div className='space-y-4'>
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className='group relative flex w-full justify-center items-center rounded-lg border border-zinc-700/50 bg-black/40 backdrop-blur-sm py-2.5 px-4 text-sm font-medium text-zinc-300 hover:bg-zinc-800/50 hover:border-zinc-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-cosmic-latte/50 focus:border-cosmic-latte/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200'
          >
            {isLoading ? (
              <span className='flex items-center'>
                <svg
                  className='animate-spin -ml-1 mr-3 h-5 w-5 text-white'
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
                Loading...
              </span>
            ) : (
              <span className='flex items-center'>
                <svg
                  className='mr-3 h-5 w-5'
                  viewBox='0 0 24 24'
                  xmlns='http://www.w3.org/2000/svg'
                >
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
                Sign in with Google
              </span>
            )}
          </button>

          {/* Commented out Spotify button 
          <button
            onClick={handleSpotifySignIn}
            disabled={isSpotifyLoading}
            className='group relative flex w-full justify-center items-center rounded-lg border border-zinc-700/50 bg-black/40 backdrop-blur-sm py-3 px-4 text-sm font-medium text-zinc-300 hover:bg-zinc-800/50 hover:border-zinc-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-cosmic-latte/50 focus:border-cosmic-latte/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200'
          >
            {isSpotifyLoading ? (
              <span className='flex items-center'>
                <svg className='animate-spin -ml-1 mr-3 h-5 w-5 text-white' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
                  <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
                  <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                </svg>
                Loading...
              </span>
            ) : (
              <span className='flex items-center'>
                <svg className='mr-3 h-5 w-5 text-green-500' fill='currentColor' viewBox='0 0 24 24'>
                  <path d='M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z' />
                </svg>
                Sign in with Spotify
              </span>
            )}
          </button>
          */}
        </div>

        {/* Divider */}
        <div className='relative my-6'>
          <div className='absolute inset-0 flex items-center'>
            <div className='w-full border-t border-zinc-700/60'></div>
          </div>
          <div className='relative flex justify-center'>
            <span className='bg-zinc-900/80 backdrop-blur-sm px-4 py-2 text-xs font-medium text-zinc-400 border border-zinc-700/50 rounded-lg'>
              Or continue with email
            </span>
          </div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleCredentialsSignIn} className='space-y-4'>
          {credentialsError && (
            <div className='rounded-lg bg-red-500/10 border border-red-500/20 p-4'>
              <p className='text-red-400 text-sm font-medium'>
                {credentialsError}
              </p>
            </div>
          )}

          <div className='space-y-4'>
            <div>
              <label
                htmlFor='identifier'
                className='block text-sm font-medium text-zinc-300 mb-2'
              >
                Email or Username
              </label>
              <input
                id='identifier'
                name='identifier'
                type='text'
                autoComplete='username'
                autoCapitalize='none'
                autoCorrect='off'
                spellCheck='false'
                required
                value={credentials.identifier}
                onChange={e =>
                  setCredentials({ ...credentials, identifier: e.target.value })
                }
                className='block w-full rounded-lg border border-zinc-700/50 bg-black/40 backdrop-blur-sm px-3 min-h-12 text-base text-white placeholder-zinc-400 focus:border-cosmic-latte/50 focus:outline-none focus:ring-2 focus:ring-cosmic-latte/50 transition-all duration-200'
                placeholder='Enter your email or username'
              />
            </div>

            <div>
              <label
                htmlFor='password'
                className='block text-sm font-medium text-zinc-300 mb-2'
              >
                Password
              </label>
              <div className='relative'>
                <input
                  id='password'
                  name='password'
                  type={showPassword ? 'text' : 'password'}
                  autoComplete='current-password'
                  autoCapitalize='none'
                  autoCorrect='off'
                  spellCheck='false'
                  required
                  value={credentials.password}
                  onChange={e =>
                    setCredentials({ ...credentials, password: e.target.value })
                  }
                  className='block w-full rounded-lg border border-zinc-700/50 bg-black/40 backdrop-blur-sm px-3 min-h-12 pr-12 text-base text-white placeholder-zinc-400 focus:border-cosmic-latte/50 focus:outline-none focus:ring-2 focus:ring-cosmic-latte/50 transition-all duration-200'
                  placeholder='Enter your password'
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(!showPassword)}
                  className='absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-200 focus:outline-none focus:text-zinc-200 transition-colors duration-200'
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg
                      className='h-5 w-5'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                      xmlns='http://www.w3.org/2000/svg'
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
                      xmlns='http://www.w3.org/2000/svg'
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
                  )}
                </button>
              </div>
            </div>
          </div>

          <button
            type='submit'
            disabled={isCredentialsLoading}
            className='group relative flex w-full justify-center rounded-lg border border-transparent bg-cosmic-latte py-2.5 px-4 text-sm font-medium text-black hover:bg-cosmic-latte/90 focus:outline-none focus:ring-2 focus:ring-cosmic-latte/50 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200'
          >
            {isCredentialsLoading ? (
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
                Signing in...
              </span>
            ) : (
              'Sign in'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
