import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

import { auth } from '@/../auth';

import { AuthLayoutClient } from './AuthLayoutClient';

export const metadata: Metadata = {
  title: 'Authentication | Album Recommendations',
  description: 'Sign in or register for Album Recommendations',
};

// Auth pages that should be accessible even when logged in
const BYPASS_AUTH_REDIRECT = ['/forgot-password', '/reset-password'];

export default async function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Check current path — some auth pages should bypass the redirect
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '';
  const shouldBypass = BYPASS_AUTH_REDIRECT.some(path =>
    pathname.startsWith(path)
  );

  // Check if user is already authenticated
  const session = await auth();

  // Redirect authenticated users who completed onboarding to home mosaic
  // Users without profileUpdatedAt stay on auth pages to complete their profile
  // Skip redirect for password reset pages (user may be signed in on the device)
  if (session?.user && !shouldBypass) {
    const hasCompletedOnboarding = session.user.profileUpdatedAt !== null;

    if (hasCompletedOnboarding) {
      redirect('/home-mosaic');
    }
    // If onboarding not completed, allow access to auth pages (for /complete-profile)
  }

  return <AuthLayoutClient>{children}</AuthLayoutClient>;
}
