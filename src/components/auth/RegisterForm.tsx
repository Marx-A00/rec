'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';

import {
  validateEmail,
  validateName,
  validatePassword,
} from '@/lib/validations';

import PasswordStrength from './PasswordStrength';

interface RegisterFormProps {
  onSuccess?: (userName?: string) => void;
}

export default function RegisterForm({ onSuccess }: RegisterFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const validateField = (name: string, value: string) => {
    switch (name) {
      case 'email':
        return validateEmail(value);
      case 'password':
        return validatePassword(value);
      case 'name':
        return validateName(value);
      case 'confirmPassword':
        if (value !== formData.password) {
          return { isValid: false, message: 'Passwords do not match' };
        }
        return { isValid: true };
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

    // Also validate confirm password if password changes
    if (name === 'password' && formData.confirmPassword) {
      const confirmValidation = validateField(
        'confirmPassword',
        formData.confirmPassword
      );
      setErrors(prev => ({
        ...prev,
        confirmPassword: confirmValidation.isValid
          ? ''
          : confirmValidation.message || '',
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setServerError('');

    // Validate all fields
    const validations = {
      name: validateField('name', formData.name),
      email: validateField('email', formData.email),
      password: validateField('password', formData.password),
      confirmPassword: validateField(
        'confirmPassword',
        formData.confirmPassword
      ),
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
          name: formData.name || undefined,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setServerError(data.message);
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
        onSuccess(formData.name);
      } else {
        window.location.href = '/';
      }
    } catch {
      setServerError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-6' noValidate>
      {serverError && (
        <div
          className='rounded-lg bg-red-500/10 border border-red-500/20 p-4'
          role='alert'
          aria-live='polite'
        >
          <p className='text-red-400 text-sm font-medium'>{serverError}</p>
        </div>
      )}

      <div className='space-y-4'>
        <div>
          <label
            htmlFor='name'
            className='block text-sm font-medium text-zinc-300 mb-2'
          >
            Name (optional)
          </label>
          <input
            id='name'
            name='name'
            type='text'
            value={formData.name}
            onChange={handleInputChange}
            className='block w-full rounded-lg border border-zinc-700/50 bg-black/40 backdrop-blur-sm px-4 py-3 text-white placeholder-zinc-400 focus:border-cosmic-latte/50 focus:outline-none focus:ring-2 focus:ring-cosmic-latte/50 transition-all duration-200'
            placeholder='Enter your name'
            aria-describedby={errors.name ? 'name-error' : undefined}
            aria-invalid={errors.name ? 'true' : 'false'}
          />
          {errors.name && (
            <p
              id='name-error'
              className='mt-2 text-sm text-red-400 font-medium'
              role='alert'
            >
              {errors.name}
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
            required
            value={formData.email}
            onChange={handleInputChange}
            className='block w-full rounded-lg border border-zinc-700/50 bg-black/40 backdrop-blur-sm px-4 py-3 text-white placeholder-zinc-400 focus:border-cosmic-latte/50 focus:outline-none focus:ring-2 focus:ring-cosmic-latte/50 transition-all duration-200'
            placeholder='Enter your email address'
            aria-describedby={errors.email ? 'email-error' : undefined}
            aria-invalid={errors.email ? 'true' : 'false'}
            autoComplete='email'
          />
          {errors.email && (
            <p
              id='email-error'
              className='mt-2 text-sm text-red-400 font-medium'
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
          <input
            id='password'
            name='password'
            type='password'
            required
            value={formData.password}
            onChange={handleInputChange}
            className='block w-full rounded-lg border border-zinc-700/50 bg-black/40 backdrop-blur-sm px-4 py-3 text-white placeholder-zinc-400 focus:border-cosmic-latte/50 focus:outline-none focus:ring-2 focus:ring-cosmic-latte/50 transition-all duration-200'
            placeholder='Create a strong password'
            aria-describedby={`password-strength ${errors.password ? 'password-error' : ''}`}
            aria-invalid={errors.password ? 'true' : 'false'}
            autoComplete='new-password'
          />
          {errors.password && (
            <p
              id='password-error'
              className='mt-2 text-sm text-red-400 font-medium'
              role='alert'
            >
              {errors.password}
            </p>
          )}
          <div id='password-strength'>
            <PasswordStrength password={formData.password} />
          </div>
        </div>

        <div>
          <label
            htmlFor='confirmPassword'
            className='block text-sm font-medium text-zinc-300 mb-2'
          >
            Confirm Password
          </label>
          <input
            id='confirmPassword'
            name='confirmPassword'
            type='password'
            required
            value={formData.confirmPassword}
            onChange={handleInputChange}
            className='block w-full rounded-lg border border-zinc-700/50 bg-black/40 backdrop-blur-sm px-4 py-3 text-white placeholder-zinc-400 focus:border-cosmic-latte/50 focus:outline-none focus:ring-2 focus:ring-cosmic-latte/50 transition-all duration-200'
            placeholder='Confirm your password'
            aria-describedby={
              errors.confirmPassword ? 'confirm-password-error' : undefined
            }
            aria-invalid={errors.confirmPassword ? 'true' : 'false'}
            autoComplete='new-password'
          />
          {errors.confirmPassword && (
            <p
              id='confirm-password-error'
              className='mt-2 text-sm text-red-400 font-medium'
              role='alert'
            >
              {errors.confirmPassword}
            </p>
          )}
        </div>
      </div>

      <button
        type='submit'
        disabled={isLoading}
        className='group relative flex w-full justify-center rounded-lg border border-transparent bg-cosmic-latte py-3 px-4 text-sm font-medium text-black hover:bg-cosmic-latte/90 focus:outline-none focus:ring-2 focus:ring-cosmic-latte/50 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200'
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
