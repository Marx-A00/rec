'use client';

import Link from 'next/link';
import { useState } from 'react';

import RegisterForm from '@/components/auth/RegisterForm';
import AccountCreatedSuccess from '@/components/auth/AccountCreatedSuccess';

export default function Register() {
  const [showSuccess, setShowSuccess] = useState(false);
  const [userName, setUserName] = useState<string>();

  const handleRegistrationSuccess = (name?: string) => {
    setUserName(name);
    setShowSuccess(true);
  };

  if (showSuccess) {
    return <AccountCreatedSuccess userName={userName} />;
  }

  return (
    <div className='space-y-8'>
      {/* Header */}
      <div className='text-center space-y-4'>
        <div className='inline-flex items-center justify-center w-16 h-16 rounded-full bg-cosmic-latte/20 backdrop-blur-sm border border-cosmic-latte/30 mb-6'>
          <svg
            className='w-8 h-8 text-cosmic-latte'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={1.5}
              d='M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z'
            />
          </svg>
        </div>

        <h1 className='text-3xl font-bold text-white tracking-tight'>
          Create your account
        </h1>
        <p className='text-zinc-400 text-lg'>
          Join the community and start discovering music
        </p>

        <p className='text-sm text-zinc-500'>
          Already have an account?{' '}
          <Link
            href='/signin'
            className='font-medium text-cosmic-latte hover:text-cosmic-latte/80 transition-colors duration-200 underline underline-offset-4'
            aria-label='Sign in to existing account - Go to sign in page'
          >
            Sign in to your account
          </Link>
        </p>
      </div>

      {/* Registration Form */}
      <div className='bg-black/40 backdrop-blur-sm border border-zinc-700/50 rounded-xl p-8 shadow-2xl'>
        <RegisterForm onSuccess={handleRegistrationSuccess} />
      </div>

      {/* OAuth Options */}
      <div className='space-y-6'>
        <div className='relative'>
          <div className='absolute inset-0 flex items-center'>
            <div className='w-full border-t border-zinc-700/50' />
          </div>
          <div className='relative flex justify-center text-sm'>
            <span className='bg-black px-4 text-zinc-400 font-medium'>
              Or continue with
            </span>
          </div>
        </div>

        <div className='flex justify-center'>
          <Link
            href='/signin'
            className='group flex items-center justify-center gap-3 px-4 py-3 rounded-lg border border-zinc-700/50 bg-black/40 backdrop-blur-sm text-zinc-300 hover:bg-zinc-800/50 hover:border-zinc-600 hover:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cosmic-latte/50 focus:border-cosmic-latte/50 w-48'
          >
            <svg className='w-5 h-5' viewBox='0 0 24 24'>
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
            <span className='font-medium'>Google</span>
          </Link>

          {/* <Link
            href='/signin'
            className='group flex items-center justify-center gap-3 px-4 py-3 rounded-lg border border-zinc-700/50 bg-black/40 backdrop-blur-sm text-zinc-300 hover:bg-zinc-800/50 hover:border-zinc-600 hover:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cosmic-latte/50 focus:border-cosmic-latte/50'
          >
            <svg
              className='w-5 h-5 text-green-500'
              fill='currentColor'
              viewBox='0 0 24 24'
            >
              <path d='M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z' />
            </svg>
            <span className='font-medium'>Spotify</span>
          </Link> */}
        </div>
      </div>
    </div>
  );
}
