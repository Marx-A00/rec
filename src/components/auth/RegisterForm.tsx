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
  onSuccess?: () => void;
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
        onSuccess();
      } else {
        window.location.href = '/';
      }
    } catch {
      setServerError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className='mt-8 space-y-6'>
      {serverError && (
        <div className='bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative'>
          {serverError}
        </div>
      )}

      <div className='space-y-4'>
        <div>
          <label
            htmlFor='name'
            className='block text-sm font-medium text-gray-700'
          >
            Name (optional)
          </label>
          <input
            id='name'
            name='name'
            type='text'
            value={formData.name}
            onChange={handleInputChange}
            className='mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm'
            placeholder='Your name'
          />
          {errors.name && (
            <p className='mt-1 text-sm text-red-600'>{errors.name}</p>
          )}
        </div>

        <div>
          <label
            htmlFor='email'
            className='block text-sm font-medium text-gray-700'
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
            className='mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm'
            placeholder='Email address'
          />
          {errors.email && (
            <p className='mt-1 text-sm text-red-600'>{errors.email}</p>
          )}
        </div>

        <div>
          <label
            htmlFor='password'
            className='block text-sm font-medium text-gray-700'
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
            className='mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm'
            placeholder='Password'
          />
          {errors.password && (
            <p className='mt-1 text-sm text-red-600'>{errors.password}</p>
          )}
          <PasswordStrength password={formData.password} />
        </div>

        <div>
          <label
            htmlFor='confirmPassword'
            className='block text-sm font-medium text-gray-700'
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
            className='mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm'
            placeholder='Confirm password'
          />
          {errors.confirmPassword && (
            <p className='mt-1 text-sm text-red-600'>
              {errors.confirmPassword}
            </p>
          )}
        </div>
      </div>

      <div>
        <button
          type='submit'
          disabled={isLoading}
          className='group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed'
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
              Creating account...
            </span>
          ) : (
            'Create account'
          )}
        </button>
      </div>
    </form>
  );
}
