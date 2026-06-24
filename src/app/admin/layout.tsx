// src/app/admin/layout.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  ListTodo,
  Database,
  Megaphone,
  Gamepad2,
  Users,
  Star,
  Clock,
  BarChart3,
  FlaskConical,
  HelpCircle,
  Code2,
  Palette,
  BadgeCheck,
  Rss,
  Drama,
} from 'lucide-react';

import { isAdmin } from '@/lib/permissions';
import Sidebar from '@/components/navigation/Sidebar';
import TopBar from '@/components/navigation/TopBar';
import MainContent from '@/components/navigation/MainContent';
import { HeaderProvider } from '@/contexts/HeaderContext';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { RecommendationDrawerProvider } from '@/contexts/RecommendationDrawerContext';
import GlobalRecommendationDrawer from '@/components/GlobalRecommendationDrawer';
import ConditionalMosaicProvider from '@/components/dashboard/ConditionalMosaicProvider';
import type { NavItem } from '@/config/navigation';
import { getDefaultNavItems } from '@/config/navigation';

const adminNavItems: NavItem[] = [
  ...getDefaultNavItems(),
  {
    id: 'admin-section',
    icon: LayoutDashboard,
    label: 'Admin',
    tooltip: 'Admin Dashboard',
    children: [
      {
        id: 'admin-overview',
        href: '/admin',
        icon: LayoutDashboard,
        label: 'Overview',
        tooltip: 'Admin Overview',
      },
      {
        id: 'admin-queue',
        href: '/admin/queue',
        icon: ListTodo,
        label: 'Queue',
        tooltip: 'Queue Dashboard',
      },
      {
        id: 'admin-music-db',
        href: '/admin/music-database',
        icon: Database,
        label: 'Music Database',
        tooltip: 'Music Database',
      },
      {
        id: 'admin-marquee',
        href: '/admin/marquee',
        icon: Megaphone,
        label: 'Marquee',
        tooltip: 'Marquee',
      },
      {
        id: 'admin-dailies',
        icon: Gamepad2,
        label: 'Dailies',
        tooltip: 'Dailies',
        children: [
          {
            id: 'admin-dailies-uncover',
            href: '/admin/dailies/uncover',
            icon: Drama,
            label: 'Uncover',
            tooltip: 'Uncover Admin',
          },
        ],
      },
      {
        id: 'admin-users',
        href: '/admin/users',
        icon: Users,
        label: 'Users',
        tooltip: 'Users Management',
      },
      {
        id: 'admin-recommendations',
        href: '/admin/recommendations',
        icon: Star,
        label: 'Recommendations',
        tooltip: 'Recommendations Management',
      },
      {
        id: 'admin-scheduler',
        href: '/admin/scheduler-controls',
        icon: Clock,
        label: 'Scheduler Controls',
        tooltip: 'Scheduler Controls',
      },
      {
        id: 'admin-analytics',
        href: '/admin/analytics',
        icon: BarChart3,
        label: 'Analytics',
        tooltip: 'Analytics',
      },
      {
        id: 'admin-testing',
        href: '/admin/testing',
        icon: FlaskConical,
        label: 'Testing',
        tooltip: 'Testing',
      },
      {
        id: 'admin-help',
        href: '/admin/help',
        icon: HelpCircle,
        label: 'Help',
        tooltip: 'Help',
      },
      {
        id: 'admin-dev',
        icon: Code2,
        label: 'Dev Pages',
        tooltip: 'Dev Pages',
        children: [
          {
            id: 'admin-dev-score-colors',
            href: '/admin/dev/score-colors',
            icon: Palette,
            label: 'Score Colors (Live)',
            tooltip: 'Score Colors',
          },
          {
            id: 'admin-dev-score-badges',
            href: '/admin/dev/score-badges',
            icon: BadgeCheck,
            label: 'Score Badges',
            tooltip: 'Score Badges',
          },
          {
            id: 'admin-dev-feed-playground',
            href: '/admin/dev/feed-playground',
            icon: Rss,
            label: 'Feed Playground',
            tooltip: 'Feed Playground',
          },
          {
            id: 'admin-dev-game-test',
            href: '/admin/dev/game-test',
            icon: Gamepad2,
            label: 'Uncover Game Test',
            tooltip: 'Uncover Game Test',
          },
        ],
      },
    ],
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    if (!session?.user) {
      router.push('/signin');
      return;
    }

    if (!isAdmin(session.user.role)) {
      router.push('/home-mosaic');
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className='min-h-screen bg-black flex items-center justify-center'>
        <div className='text-white'>Loading...</div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <RecommendationDrawerProvider>
      <ConditionalMosaicProvider>
        <HeaderProvider>
          <SidebarProvider>
            <div className='min-h-screen bg-black'>
              <Sidebar items={adminNavItems} />
              <TopBar />

              <MainContent>
                <div className='bg-zinc-950 min-h-screen'>{children}</div>
              </MainContent>

              <GlobalRecommendationDrawer />
            </div>
          </SidebarProvider>
        </HeaderProvider>
      </ConditionalMosaicProvider>
    </RecommendationDrawerProvider>
  );
}
