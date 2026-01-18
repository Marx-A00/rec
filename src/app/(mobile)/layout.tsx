import type { Metadata, Viewport } from 'next';
import { SessionProvider } from 'next-auth/react';

import MobileBottomNav from '@/components/mobile/MobileBottomNav';
import { QueryProvider } from '@/components/providers/QueryProvider';

export const metadata: Metadata = {
  title: 'Rec - Music Recommendations',
  description: "Discover music through your friends' recommendations",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function MobileLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SessionProvider>
      <QueryProvider>
        <div className='min-h-screen bg-black text-white'>
          {/* Main scrollable content */}
          <main
            className='pb-[calc(56px+env(safe-area-inset-bottom))]'
            id='mobile-main-content'
          >
            {children}
          </main>

          {/* Fixed bottom navigation */}
          <MobileBottomNav />
        </div>
      </QueryProvider>
    </SessionProvider>
  );
}
