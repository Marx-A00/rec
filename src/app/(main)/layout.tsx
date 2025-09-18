import type { Metadata } from 'next';

import Sidebar from '@/components/navigation/Sidebar';
import TopBar from '@/components/navigation/TopBar';
import { HeaderProvider } from '@/contexts/HeaderContext';
import GlobalRecommendationDrawer from '@/components/GlobalRecommendationDrawer';
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
    <RecommendationDrawerProvider>
      <ConditionalMosaicProvider>
        <HeaderProvider>
          <div className='min-h-screen bg-black'>
            {/* New modular navigation */}
            <Sidebar />
            <TopBar />

            {/* Main Content */}
            <div className='transition-all duration-300 md:ml-16' id='main-content' role='main'>
              <div className='pt-4'>
                {children}
              </div>
            </div>

            {/* Global Recommendation Drawer */}
            <GlobalRecommendationDrawer />
          </div>
        </HeaderProvider>
      </ConditionalMosaicProvider>
    </RecommendationDrawerProvider>
  );
}
