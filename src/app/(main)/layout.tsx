import type { Metadata } from 'next';

import Sidebar from '@/components/navigation/Sidebar';
import TopBar from '@/components/navigation/TopBar';
import { HeaderProvider } from '@/contexts/HeaderContext';
import SidebarLayoutWrapper from '@/components/SidebarLayoutWrapper';
import GlobalRecommendationDrawer from '@/components/GlobalRecommendationDrawer';
import { MusicPlatformTourProvider } from '@/components/MusicPlatformTourProvider';
import { RecommendationDrawerProvider } from '@/contexts/RecommendationDrawerContext';
import ConditionalMosaicProvider from '@/components/dashboard/ConditionalMosaicProvider';

export const metadata: Metadata = {
  title: 'Album Recommendations',
  description: 'Share and discover music recommendations',
};

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <MusicPlatformTourProvider>
      <RecommendationDrawerProvider>
        <ConditionalMosaicProvider>
          <HeaderProvider>
            <div className='min-h-screen bg-black'>
              {/* New modular navigation */}
              <Sidebar />
              <TopBar />

              {/* Main Content */}
              <SidebarLayoutWrapper>
                <div className='pt-4' id='main-content'>
                  {children}
                </div>
              </SidebarLayoutWrapper>

              {/* Global Recommendation Drawer */}
              <GlobalRecommendationDrawer />
            </div>
          </HeaderProvider>
        </ConditionalMosaicProvider>
      </RecommendationDrawerProvider>
    </MusicPlatformTourProvider>
  );
}
