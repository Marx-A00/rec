'use client';

import { useState, useEffect, useCallback } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Check,
  X,
  Loader2,
} from 'lucide-react';

import { MobileButton } from '@/components/mobile/MobileButton';
import {
  validateEmail,
  validateUsernameForRegistration,
  validatePassword,
  getPasswordStrength,
} from '@/lib/validations';

interface FieldErrors {
  username?: string;
  email?: string;
  password?: string;
}

interface UsernameCheckState {
  checking: boolean;
  available: boolean | null;
  checkedUsername: string;
}

export default function MobileRegisterPage() {
  const router = useRouter();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [usernameCheck, setUsernameCheck] = useState<UsernameCheckState>({
    checking: false,
    available: null,
    checkedUsername: '',
  });

  // Debounced username availability check
  const checkUsernameAvailability = useCallback(async (username: string) => {
    if (!username || username.length < 2) {
      setUsernameCheck({
        checking: false,
        available: null,
        checkedUsername: '',
      });
      return;
    }

    // Validate username format first
    const validation = validateUsernameForRegistration(username);
    if (!validation.isValid) {
      setUsernameCheck({
        checking: false,
        available: null,
        checkedUsername: '',
      });
      return;
    }

    setUsernameCheck(prev => ({ ...prev, checking: true }));

    try {
      const response = await fetch(
        `/api/auth/check-username?username=${encodeURIComponent(username)}`
      );
      const data = await response.json();

      setUsernameCheck({
        checking: false,
        available: data.available,
        checkedUsername: username,
      });
    } catch {
      setUsernameCheck({
        checking: false,
        available: null,
        checkedUsername: '',
      });
    }
  }, []);

  // Debounce username check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.username && formData.username.length >= 2) {
        checkUsernameAvailability(formData.username);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.username, checkUsernameAvailability]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear server error when user starts typing
    if (error) setError('');

    // Clear field error when user starts typing
    if (fieldErrors[name as keyof FieldErrors]) {
      setFieldErrors(prev => ({ ...prev, [name]: undefined }));
    }

    // Reset username check when username changes
    if (name === 'username') {
      setUsernameCheck({
        checking: false,
        available: null,
        checkedUsername: '',
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: FieldErrors = {};
    let isValid = true;

    // Validate username
    const usernameValidation = validateUsernameForRegistration(
      formData.username
    );
    if (!usernameValidation.isValid) {
      errors.username = usernameValidation.message;
      isValid = false;
    } else if (usernameCheck.available === false) {
      errors.username = 'Username is already taken';
      isValid = false;
    }

    // Validate email
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      errors.email = emailValidation.message;
      isValid = false;
    }

    // Validate password
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      errors.password = passwordValidation.message;
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    // Wait for username check if still in progress
    if (usernameCheck.checking) {
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
        setError(
          data.error || data.message || 'Registration failed. Please try again.'
        );
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
  const passwordStrength = getPasswordStrength(formData.password);

  // Get username field status
  const getUsernameStatus = () => {
    if (!formData.username) return null;
    if (fieldErrors.username) return 'error';
    if (usernameCheck.checking) return 'checking';
    if (
      usernameCheck.available === true &&
      usernameCheck.checkedUsername === formData.username
    )
      return 'available';
    if (
      usernameCheck.available === false &&
      usernameCheck.checkedUsername === formData.username
    )
      return 'taken';
    return null;
  };

  const usernameStatus = getUsernameStatus();

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
                onChange={handleInputChange}
                disabled={isLoading}
                className={`w-full h-[52px] pl-12 pr-12 bg-zinc-900 border rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 disabled:opacity-50 transition-colors ${
                  fieldErrors.username || usernameStatus === 'taken'
                    ? 'border-red-500'
                    : usernameStatus === 'available'
                      ? 'border-green-500'
                      : 'border-zinc-800'
                }`}
                placeholder='Choose a username'
                aria-invalid={
                  !!fieldErrors.username || usernameStatus === 'taken'
                }
                aria-describedby={
                  fieldErrors.username ? 'username-error' : undefined
                }
              />
              {/* Status indicator */}
              <div className='absolute right-4 top-1/2 -translate-y-1/2'>
                {usernameStatus === 'checking' && (
                  <Loader2 className='h-5 w-5 text-zinc-500 animate-spin' />
                )}
                {usernameStatus === 'available' && (
                  <Check className='h-5 w-5 text-green-500' />
                )}
                {usernameStatus === 'taken' && (
                  <X className='h-5 w-5 text-red-500' />
                )}
              </div>
            </div>
            {fieldErrors.username && (
              <p
                id='username-error'
                className='mt-2 text-sm text-red-400'
                role='alert'
              >
                {fieldErrors.username}
              </p>
            )}
            {usernameStatus === 'available' && (
              <p className='mt-2 text-sm text-green-400'>
                Username is available
              </p>
            )}
            {usernameStatus === 'taken' && !fieldErrors.username && (
              <p className='mt-2 text-sm text-red-400' role='alert'>
                Username is already taken
              </p>
            )}
          </div>

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
                onChange={handleInputChange}
                disabled={isLoading}
                className={`w-full h-[52px] pl-12 pr-4 bg-zinc-900 border rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 disabled:opacity-50 transition-colors ${
                  fieldErrors.email ? 'border-red-500' : 'border-zinc-800'
                }`}
                placeholder='you@example.com'
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              />
            </div>
            {fieldErrors.email && (
              <p
                id='email-error'
                className='mt-2 text-sm text-red-400'
                role='alert'
              >
                {fieldErrors.email}
              </p>
            )}
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
                onChange={handleInputChange}
                disabled={isLoading}
                className={`w-full h-[52px] pl-12 pr-12 bg-zinc-900 border rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 disabled:opacity-50 transition-colors ${
                  fieldErrors.password ? 'border-red-500' : 'border-zinc-800'
                }`}
                placeholder='At least 8 characters'
                aria-invalid={!!fieldErrors.password}
                aria-describedby={
                  fieldErrors.password
                    ? 'password-error password-strength'
                    : 'password-strength'
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

            {/* Password Strength Indicator */}
            {formData.password && (
              <div id='password-strength' className='mt-3'>
                <div className='flex justify-between items-center mb-1.5'>
                  <span className='text-xs text-zinc-500'>
                    Password strength
                  </span>
                  <span
                    className={`text-xs font-medium ${passwordStrength.color}`}
                  >
                    {passwordStrength.label}
                  </span>
                </div>
                <div className='w-full bg-zinc-800 rounded-full h-1.5'>
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      passwordStrength.score <= 2
                        ? 'bg-red-500'
                        : passwordStrength.score <= 4
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                    }`}
                    style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <MobileButton
            type='submit'
            disabled={isLoading || usernameCheck.checking}
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
