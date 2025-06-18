import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

import { auth } from '@/../auth';

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

  // Redirect authenticated users to home page
  if (session?.user) {
    redirect('/');
  }

  return (
    <div className='min-h-screen bg-black flex items-center justify-center'>
      <div className='w-full max-w-md px-6 py-8'>{children}</div>
    </div>
  );
}
