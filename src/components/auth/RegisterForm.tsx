'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';

import {
  validateEmail,
  validateUsernameForRegistration,
  validatePassword,
} from '@/lib/validations';

import PasswordStrength from './PasswordStrength';

interface RegisterFormProps {
  onSuccess?: (userName?: string) => void;
}

export default function RegisterForm({ onSuccess }: RegisterFormProps) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const validateField = (fieldName: string, value: string) => {
    switch (fieldName) {
      case 'email':
        return validateEmail(value);
      case 'password':
        return validatePassword(value);
      case 'username':
        return validateUsernameForRegistration(value);
      default:
        return { isValid: true };
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear server error when user starts typing
    if (serverError) setServerError('');

    // Real-time validation
    const validation = validateField(name, value);
    setErrors(prev => ({
      ...prev,
      [name]: validation.isValid ? '' : validation.message || '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setServerError('');

    // Validate all fields
    const validations = {
      username: validateField('username', formData.username),
      email: validateField('email', formData.email),
      password: validateField('password', formData.password),
    };

    const newErrors: Record<string, string> = {};
    Object.entries(validations).forEach(([field, validation]) => {
      if (!validation.isValid) {
        newErrors[field] = validation.message || '';
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsLoading(false);
      return;
    }

    try {
      // Register user
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username || undefined,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setServerError(data.message || data.error || 'Registration failed');
        setIsLoading(false);
        return;
      }

      // Auto sign in after successful registration
      const signInResult = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (signInResult?.error) {
        setServerError(
          'Account created but sign in failed. Please try signing in manually.'
        );
        setIsLoading(false);
        return;
      }

      // Success - redirect will be handled by NextAuth
      if (onSuccess) {
        onSuccess(formData.username);
      } else {
        window.location.href = '/browse';
      }
    } catch {
      setServerError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-4' noValidate>
      {serverError && (
        <div
          className='rounded-lg bg-red-500/10 border border-red-500/20 p-4'
          role='alert'
          aria-live='polite'
        >
          <p className='text-red-400 text-sm font-medium'>{serverError}</p>
        </div>
      )}

      <div className='space-y-3'>
        <div>
          <label
            htmlFor='username'
            className='block text-sm font-medium text-zinc-300 mb-2'
          >
            Username
          </label>
          <input
            id='username'
            name='username'
            type='text'
            autoCapitalize='none'
            autoCorrect='off'
            spellCheck='false'
            required
            value={formData.username}
            onChange={handleInputChange}
            className='block w-full rounded-lg border border-zinc-700/50 bg-black/40 backdrop-blur-sm px-3 min-h-12 text-base text-white placeholder-zinc-400 focus:border-cosmic-latte/50 focus:outline-none focus:ring-2 focus:ring-cosmic-latte/50 transition-all duration-200'
            placeholder='Choose a username'
            aria-describedby={errors.username ? 'username-error' : undefined}
            aria-invalid={errors.username ? 'true' : 'false'}
          />
          {errors.username && (
            <p
              id='username-error'
              className='mt-1 text-sm text-red-400 font-medium'
              role='alert'
            >
              {errors.username}
            </p>
          )}
        </div>

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
            autoCapitalize='none'
            autoCorrect='off'
            spellCheck='false'
            required
            value={formData.email}
            onChange={handleInputChange}
            className='block w-full rounded-lg border border-zinc-700/50 bg-black/40 backdrop-blur-sm px-3 min-h-12 text-base text-white placeholder-zinc-400 focus:border-cosmic-latte/50 focus:outline-none focus:ring-2 focus:ring-cosmic-latte/50 transition-all duration-200'
            placeholder='Enter your email address'
            aria-describedby={errors.email ? 'email-error' : undefined}
            aria-invalid={errors.email ? 'true' : 'false'}
            autoComplete='email'
          />
          {errors.email && (
            <p
              id='email-error'
              className='mt-1 text-sm text-red-400 font-medium'
              role='alert'
            >
              {errors.email}
            </p>
          )}
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
              autoCapitalize='none'
              autoCorrect='off'
              spellCheck='false'
              required
              value={formData.password}
              onChange={handleInputChange}
              className='block w-full rounded-lg border border-zinc-700/50 bg-black/40 backdrop-blur-sm px-3 min-h-12 pr-12 text-base text-white placeholder-zinc-400 focus:border-cosmic-latte/50 focus:outline-none focus:ring-2 focus:ring-cosmic-latte/50 transition-all duration-200'
              placeholder='Create a strong password'
              aria-describedby={`password-strength ${errors.password ? 'password-error' : ''}`}
              aria-invalid={errors.password ? 'true' : 'false'}
              autoComplete='new-password'
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
          {errors.password && (
            <p
              id='password-error'
              className='mt-1 text-sm text-red-400 font-medium'
              role='alert'
            >
              {errors.password}
            </p>
          )}
          <div id='password-strength'>
            <PasswordStrength password={formData.password} />
          </div>
        </div>
      </div>

      <button
        type='submit'
        disabled={isLoading}
        className='group relative flex w-full justify-center rounded-lg border border-transparent bg-cosmic-latte py-2.5 px-4 text-sm font-medium text-black hover:bg-cosmic-latte/90 focus:outline-none focus:ring-2 focus:ring-cosmic-latte/50 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200'
        aria-describedby='submit-button-description'
      >
        <span id='submit-button-description' className='sr-only'>
          Create your account and automatically sign in
        </span>
        {isLoading ? (
          <span className='flex items-center' aria-live='polite'>
            <svg
              className='animate-spin -ml-1 mr-3 h-5 w-5 text-black'
              xmlns='http://www.w3.org/2000/svg'
              fill='none'
              viewBox='0 0 24 24'
              aria-hidden='true'
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
            Creating your account...
          </span>
        ) : (
          'Create your account'
        )}
      </button>
    </form>
  );
}
