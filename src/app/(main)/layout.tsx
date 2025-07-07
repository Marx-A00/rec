import type { Metadata } from 'next';

import NavigationSidebar from '@/components/NavigationSidebar';
import SidebarLayoutWrapper from '@/components/SidebarLayoutWrapper';
import UniversalSearchBar from '@/components/ui/UniversalSearchBar';
import GlobalRecommendationDrawer from '@/components/GlobalRecommendationDrawer';
import { MusicPlatformTourProvider } from '@/components/MusicPlatformTourProvider';
import { RecommendationDrawerProvider } from '@/contexts/RecommendationDrawerContext';

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
        <div className='min-h-screen bg-black'>
          <NavigationSidebar />

          {/* Sticky Header with Global Search */}
          <div className='sticky top-0 z-50 backdrop-blur-sm bg-black/80 border-b border-zinc-800/50'>
            <SidebarLayoutWrapper>
              <div className='px-4 py-3'>
                <div className='max-w-2xl mx-auto'>
                  <UniversalSearchBar
                    preset="global"
                    placeholder='Search albums, artists, or genres...'
                    className='max-w-2xl mx-auto'
                  />
                </div>
              </div>
            </SidebarLayoutWrapper>
          </div>

          {/* Main Content */}
          <SidebarLayoutWrapper>
            <div className='pt-4' id="main-content">{children}</div>
          </SidebarLayoutWrapper>

          {/* Global Recommendation Drawer */}
          <GlobalRecommendationDrawer />
        </div>
      </RecommendationDrawerProvider>
    </MusicPlatformTourProvider>
  );
}
