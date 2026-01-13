import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { auth } from '@/../auth';

import { AuthLayoutClient } from './AuthLayoutClient';

export const metadata: Metadata = {
  title: 'Authentication | Album Recommendations',
  description: 'Sign in or register for Album Recommendations',
};

export default async function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Check if user is already authenticated
  const session = await auth();

  // Redirect authenticated users with username to home mosaic
  // Users without username stay on auth pages to complete their profile
  if (session?.user) {
    const hasUsername = session.user.name && session.user.name.trim() !== '';

    if (hasUsername) {
      redirect('/home-mosaic');
    }
    // If no username, allow access to auth pages (for /complete-profile)
  }

  return <AuthLayoutClient>{children}</AuthLayoutClient>;
}
