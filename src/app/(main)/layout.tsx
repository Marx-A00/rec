import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { auth } from '@/../auth';
import Sidebar from '@/components/navigation/Sidebar';
import TopBar from '@/components/navigation/TopBar';
import MainContent from '@/components/navigation/MainContent';
import { HeaderProvider } from '@/contexts/HeaderContext';
import { SidebarProvider } from '@/contexts/SidebarContext';
import GlobalRecommendationDrawer from '@/components/GlobalRecommendationDrawer';
import { RecommendationDrawerProvider } from '@/contexts/RecommendationDrawerContext';
import ConditionalMosaicProvider from '@/components/dashboard/ConditionalMosaicProvider';

export const metadata: Metadata = {
  title: 'Album Recommendations',
  description: 'Share and discover music recommendations',
};

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Redirect authenticated users who haven't completed onboarding
  const session = await auth();
  if (session?.user && !session.user.profileUpdatedAt) {
    redirect('/complete-profile');
  }
  return (
    <RecommendationDrawerProvider>
      <ConditionalMosaicProvider>
        <HeaderProvider>
          <SidebarProvider>
            <div className='min-h-screen bg-black'>
              <Sidebar />
              <TopBar />

              {/* Main Content */}
              <MainContent>{children}</MainContent>

              {/* Global Recommendation Drawer */}
              <GlobalRecommendationDrawer />
            </div>
          </SidebarProvider>
        </HeaderProvider>
      </ConditionalMosaicProvider>
    </RecommendationDrawerProvider>
  );
}
