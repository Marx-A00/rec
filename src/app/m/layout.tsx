import type { Metadata, Viewport } from 'next';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

import { auth } from '@/../auth';
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

// Routes that should not enforce onboarding completion (to avoid redirect loops)
const ONBOARDING_EXEMPT_ROUTES = ['/m/auth', '/m/complete-profile'];

export default async function MobileLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Check if authenticated user needs to complete their profile
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '';
  const isExempt = ONBOARDING_EXEMPT_ROUTES.some(route =>
    pathname.startsWith(route)
  );

  if (!isExempt) {
    const session = await auth();
    if (session?.user) {
      const hasCompletedOnboarding = session.user.profileUpdatedAt !== null;
      if (!hasCompletedOnboarding) {
        redirect('/m/complete-profile');
      }
    }
  }

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
