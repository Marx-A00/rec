'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Eye, EyeOff, Mail, Lock, User } from 'lucide-react';

import { MobileButton } from '@/components/mobile/MobileButton';

export default function MobileRegisterPage() {
  const router = useRouter();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  const validateForm = (): string | null => {
    if (!formData.email || !formData.username || !formData.password) {
      return 'All fields are required';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return 'Please enter a valid email address';
    }
    if (formData.username.length < 3) {
      return 'Username must be at least 3 characters';
    }
    if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      return 'Username can only contain letters, numbers, and underscores';
    }
    if (formData.password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          username: formData.username,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Registration failed. Please try again.');
        return;
      }

      // Auto sign in after successful registration
      const signInResult = await signIn('credentials', {
        identifier: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (signInResult?.ok) {
        router.push('/m');
        router.refresh();
      } else {
        // Registration succeeded but sign-in failed, redirect to signin
        router.push('/m/auth/signin');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isGoogleLoading || isSubmitting;

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
      <div className='flex-1 px-6 py-4 overflow-y-auto'>
        {/* Logo/Title */}
        <div className='text-center mb-6'>
          <div className='w-16 h-16 rounded-full bg-cosmic-latte/20 flex items-center justify-center mx-auto mb-4'>
            <span className='text-3xl font-bold text-cosmic-latte'>R</span>
          </div>
          <h1 className='text-2xl font-bold text-white mb-2'>Create account</h1>
          <p className='text-zinc-400'>Join the Rec community</p>
        </div>

        {/* Google Sign Up */}
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

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className='space-y-4'>
          {/* Email */}
          <div>
            <label
              htmlFor='email'
              className='block text-sm font-medium text-zinc-400 mb-2'
            >
              Email
            </label>
            <div className='relative'>
              <Mail className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500' />
              <input
                id='email'
                name='email'
                type='email'
                autoComplete='email'
                required
                value={formData.email}
                onChange={e =>
                  setFormData({ ...formData, email: e.target.value })
                }
                disabled={isLoading}
                className='w-full h-[52px] pl-12 pr-4 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 disabled:opacity-50 transition-colors'
                placeholder='you@example.com'
              />
            </div>
          </div>

          {/* Username */}
          <div>
            <label
              htmlFor='username'
              className='block text-sm font-medium text-zinc-400 mb-2'
            >
              Username
            </label>
            <div className='relative'>
              <User className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500' />
              <input
                id='username'
                name='username'
                type='text'
                autoComplete='username'
                required
                value={formData.username}
                onChange={e =>
                  setFormData({ ...formData, username: e.target.value })
                }
                disabled={isLoading}
                className='w-full h-[52px] pl-12 pr-4 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 disabled:opacity-50 transition-colors'
                placeholder='Choose a username'
              />
            </div>
          </div>

          {/* Password */}
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
                autoComplete='new-password'
                required
                value={formData.password}
                onChange={e =>
                  setFormData({ ...formData, password: e.target.value })
                }
                disabled={isLoading}
                className='w-full h-[52px] pl-12 pr-12 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 disabled:opacity-50 transition-colors'
                placeholder='At least 8 characters'
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
          </div>

          {/* Confirm Password */}
          <div>
            <label
              htmlFor='confirmPassword'
              className='block text-sm font-medium text-zinc-400 mb-2'
            >
              Confirm Password
            </label>
            <div className='relative'>
              <Lock className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500' />
              <input
                id='confirmPassword'
                name='confirmPassword'
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete='new-password'
                required
                value={formData.confirmPassword}
                onChange={e =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                disabled={isLoading}
                className='w-full h-[52px] pl-12 pr-12 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 disabled:opacity-50 transition-colors'
                placeholder='Confirm your password'
              />
              <button
                type='button'
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className='absolute right-4 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2 text-zinc-500'
                aria-label={
                  showConfirmPassword ? 'Hide password' : 'Show password'
                }
              >
                {showConfirmPassword ? (
                  <EyeOff className='h-5 w-5' />
                ) : (
                  <Eye className='h-5 w-5' />
                )}
              </button>
            </div>
          </div>

          <MobileButton
            type='submit'
            disabled={isLoading}
            className='w-full mt-6'
            size='lg'
          >
            {isSubmitting ? (
              <div className='flex items-center gap-2'>
                <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-black' />
                Creating account...
              </div>
            ) : (
              'Create account'
            )}
          </MobileButton>
        </form>

        {/* Terms */}
        <p className='text-xs text-zinc-500 text-center mt-4'>
          By signing up, you agree to our{' '}
          <Link href='/terms' className='text-zinc-400 hover:text-white'>
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href='/privacy' className='text-zinc-400 hover:text-white'>
            Privacy Policy
          </Link>
        </p>
      </div>

      {/* Footer */}
      <div className='px-6 py-6 text-center border-t border-zinc-800'>
        <p className='text-zinc-400'>
          Already have an account?{' '}
          <Link
            href='/m/auth/signin'
            className='text-white font-medium hover:text-cosmic-latte transition-colors'
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
