'use client';

import { useState } from 'react';
import Link from 'next/link';

import BackButton from '@/components/ui/BackButton';
import { validateEmail } from '@/lib/validations';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validation = validateEmail(email);
    if (!validation.isValid) {
      setError(validation.message || 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Something went wrong. Please try again.');
        return;
      }

      setIsSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
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
                d='M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
              />
            </svg>
          </div>

          <h1 className='text-2xl font-bold text-white tracking-tight'>
            Check your email
          </h1>
        </div>

        <div className='bg-black/40 backdrop-blur-sm border border-zinc-700/50 rounded-xl p-6 shadow-2xl space-y-4'>
          <p className='text-zinc-300 text-sm leading-relaxed text-center'>
            If an account exists with that email, we have sent a password reset
            link. Please check your inbox and spam folder.
          </p>
          <p className='text-zinc-500 text-xs text-center'>
            The link will expire in 1 hour.
          </p>

          <div className='pt-2'>
            <Link
              href='/signin'
              className='block w-full text-center rounded-lg border border-zinc-700/50 bg-black/40 backdrop-blur-sm py-2.5 px-4 text-sm font-medium text-zinc-300 hover:bg-zinc-800/50 hover:border-zinc-600 hover:text-white transition-all duration-200'
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
          Forgot your password?
        </h1>

        <p className='text-sm text-zinc-400 inline-block bg-black/40 backdrop-blur-sm px-3 py-1 rounded-lg'>
          Enter your email and we will send you a reset link
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
              htmlFor='email'
              className='block text-sm font-medium text-zinc-300 mb-2'
            >
              Email address
            </label>
            <input
              id='email'
              name='email'
              type='email'
              autoComplete='email'
              autoCapitalize='none'
              autoCorrect='off'
              spellCheck='false'
              required
              value={email}
              onChange={e => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
              className='block w-full rounded-lg border border-zinc-700/50 bg-black/40 backdrop-blur-sm px-3 min-h-12 text-base text-white placeholder-zinc-400 focus:border-cosmic-latte/50 focus:outline-none focus:ring-2 focus:ring-cosmic-latte/50 transition-all duration-200'
              placeholder='Enter your email address'
            />
          </div>

          <button
            type='submit'
            disabled={isLoading || !email}
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
                Sending reset link...
              </span>
            ) : (
              'Send reset link'
            )}
          </button>
        </form>

        <div className='text-center'>
          <Link
            href='/signin'
            className='text-sm text-zinc-400 hover:text-white transition-colors duration-200'
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
