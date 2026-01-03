// src/app/(public)/layout.tsx
import { ReactNode } from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { auth } from '@/../auth';
import Sidebar from '@/components/navigation/Sidebar';
import TopBar from '@/components/navigation/TopBar';
import { HeaderProvider } from '@/contexts/HeaderContext';
import { RecommendationDrawerProvider } from '@/contexts/RecommendationDrawerContext';
import GlobalRecommendationDrawer from '@/components/GlobalRecommendationDrawer';

export const metadata: Metadata = {
  title: 'rec | Music Recommendations',
  description:
    'Discover music that moves you. Get personalized album recommendations from people with great taste. Build your collection. Share your discoveries.',
  keywords: ['music', 'recommendations', 'albums', 'discovery', 'community'],
  openGraph: {
    title: 'rec | Music Recommendations',
    description:
      'Discover music that moves you. Get personalized album recommendations from people with great taste.',
    type: 'website',
    siteName: 'rec',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'rec | Music Recommendations',
    description:
      'Discover music that moves you. Get personalized album recommendations from people with great taste.',
  },
};

interface PublicLayoutProps {
  children: ReactNode;
}

export default async function PublicLayout({ children }: PublicLayoutProps) {
  // Redirect authenticated users to home mosaic
  const session = await auth();
  if (session?.user) {
    redirect('/home-mosaic');
  }

  return (
    <RecommendationDrawerProvider>
      <HeaderProvider>
        <div className='min-h-screen bg-black'>
          {/* Same navigation as main app */}
          <Sidebar />
          <TopBar />

          {/* Main Content */}
          <div
            className='transition-all duration-300 md:ml-16'
            id='main-content'
            role='main'
          >
            {children}
          </div>

          {/* Global Recommendation Drawer */}
          <GlobalRecommendationDrawer />
        </div>
      </HeaderProvider>
    </RecommendationDrawerProvider>
  );
}
