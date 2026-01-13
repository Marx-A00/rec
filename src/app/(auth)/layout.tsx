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

  // Redirect authenticated users to home mosaic
  if (session?.user) {
    redirect('/home-mosaic');
  }

  return <AuthLayoutClient>{children}</AuthLayoutClient>;
}
