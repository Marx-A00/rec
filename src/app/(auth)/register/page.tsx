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
    <div className='space-y-6'>
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
              d='M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z'
            />
          </svg>
        </div>

        <h1 className='text-2xl font-bold text-white tracking-tight'>
          Create your account
        </h1>
        <p className='text-zinc-400 text-base'>
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
      <div className='bg-black/40 backdrop-blur-sm border border-zinc-700/50 rounded-xl p-6 shadow-2xl'>
        <RegisterForm onSuccess={handleRegistrationSuccess} />
      </div>
    </div>
  );
}
