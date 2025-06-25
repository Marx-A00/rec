import type { Metadata } from 'next';

import NavigationSidebar from '@/components/NavigationSidebar';
import SidebarLayoutWrapper from '@/components/SidebarLayoutWrapper';

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
    <div className='min-h-screen bg-black'>
      <NavigationSidebar />
      <SidebarLayoutWrapper>{children}</SidebarLayoutWrapper>
    </div>
  );
}
