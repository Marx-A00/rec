import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

import { auth } from '@/../auth';
import { Ripple } from '@/components/ui/ripple';

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
    <div className='relative h-screen bg-black flex items-center justify-center overflow-hidden'>
      {/* Ripple Background */}
      <Ripple
        className='absolute top-60 left-5'
        mainCircleSize={210}
        mainCircleOpacity={0.3}
        numCircles={14}
        color='#FFFBEB'
      />

      {/* Gradient overlay to ensure content readability */}
      <div className='absolute inset-0 z-10 bg-gradient-to-t from-black/60 via-black/20 to-black/40' />

      {/* Content - Compact and centered */}
      <div className='relative z-20 w-full max-w-sm px-4 py-4 h-full flex items-center justify-center'>
        <div className='w-full max-h-[90vh] overflow-y-auto scrollbar-hide'>
          {children}
        </div>
      </div>
    </div>
  );
}
