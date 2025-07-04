import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

import { auth } from '@/../auth';
import { FlickeringGrid } from '@/components/ui/flickering-grid';

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
    <div className='relative min-h-screen bg-black flex items-center justify-center overflow-hidden'>
      {/* Flickering Grid Background */}
      <FlickeringGrid
        className="absolute inset-0 z-0"
        squareSize={4}
        gridGap={6}
        color="#60A5FA"
        maxOpacity={0.4}
        flickerChance={0.3}
      />
      
      {/* Lighter gradient overlay to let the grid show through */}
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/90 via-black/40 to-black/60" />
      
      {/* Content */}
      <div className='relative z-20 w-full max-w-md px-6 py-8'>{children}</div>
    </div>
  );
}
