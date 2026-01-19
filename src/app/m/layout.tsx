import type { Metadata, Viewport } from 'next';

import MobileHeader from '@/components/mobile/MobileHeader';
import MobileBottomNav from '@/components/mobile/MobileBottomNav';

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
    <div className='min-h-screen bg-black text-white'>
      {/* Sticky header with search */}
      <MobileHeader />

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
  );
}
