import type { Metadata } from 'next';

import NavigationSidebar from '@/components/NavigationSidebar';
import SidebarLayoutWrapper from '@/components/SidebarLayoutWrapper';
import AlbumSearch from '@/components/ui/AlbumSearch';
import GlobalRecommendationDrawer from '@/components/GlobalRecommendationDrawer';
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
    <RecommendationDrawerProvider>
      <div className='min-h-screen bg-black'>
        <NavigationSidebar />

        {/* Sticky Header with Global Search */}
        <div className='sticky top-0 z-50 backdrop-blur-sm bg-black/80 border-b border-zinc-800/50'>
          <SidebarLayoutWrapper>
            <div className='px-4 py-3'>
              <AlbumSearch
                className='max-w-2xl mx-auto'
                placeholder='Search albums, artists, or genres...'
              />
            </div>
          </SidebarLayoutWrapper>
        </div>

        {/* Main Content */}
        <SidebarLayoutWrapper>
          <div className='pt-4'>{children}</div>
        </SidebarLayoutWrapper>

        {/* Global Recommendation Drawer */}
        <GlobalRecommendationDrawer />
      </div>
    </RecommendationDrawerProvider>
  );
}
