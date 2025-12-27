// src/app/(public)/layout.tsx
import { ReactNode } from 'react';

import Sidebar from '@/components/navigation/Sidebar';
import TopBar from '@/components/navigation/TopBar';
import { HeaderProvider } from '@/contexts/HeaderContext';
import { RecommendationDrawerProvider } from '@/contexts/RecommendationDrawerContext';
import GlobalRecommendationDrawer from '@/components/GlobalRecommendationDrawer';

interface PublicLayoutProps {
  children: ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
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
