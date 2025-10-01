// src/lib/dashboard/panelDefinitions.ts

import { Folder, Heart, Users, BarChart3, Play, UserPlus } from 'lucide-react';

import { PanelDefinition } from '@/types/mosaic';
import CollectionAlbumsPanel from '@/components/dashboard/panels/CollectionAlbumsPanel';
import RecommendationsPanel from '@/components/dashboard/panels/RecommendationsPanel';
import ActivityFeedPanel from '@/components/dashboard/panels/ActivityFeedPanel';
import QuickStatsPanel from '@/components/dashboard/panels/QuickStatsPanel';
import RecentlyPlayedPanel from '@/components/dashboard/panels/RecentlyPlayedPanel';
import FriendActivityPanel from '@/components/dashboard/panels/FriendActivityPanel';
import FriendDiscoveryPanel from '@/components/dashboard/panels/FriendDiscoveryPanel';

export const panelDefinitions: PanelDefinition[] = [
  {
    type: 'collection-albums',
    displayName: 'Album Collection',
    description:
      'Your personal album collection with quick access to favorites',
    category: 'music',
    icon: Folder,
    component: CollectionAlbumsPanel,
    defaultConfig: {
      showHeader: true,
      headerTitle: 'Your Collection',
      refreshInterval: 30000,
    },
    defaultSize: 35,
    minSize: 25,
    maxSize: 75,
    requiresAuth: true,
  },
  {
    type: 'recommendations',
    displayName: 'Recommendations',
    description: 'Latest music recommendations from the community',
    category: 'music',
    icon: Heart,
    component: RecommendationsPanel,
    defaultConfig: {
      showHeader: true,
      headerTitle: 'Recent Recommendations',
      refreshInterval: 60000,
    },
    defaultSize: 50,
    minSize: 30,
    maxSize: 80,
    requiresAuth: false,
  },
  {
    type: 'activity-feed',
    displayName: 'Activity Feed',
    description: 'Recent activity from friends and community members',
    category: 'social',
    icon: Users,
    component: ActivityFeedPanel,
    defaultConfig: {
      showHeader: true,
      headerTitle: 'Recent Activity',
      refreshInterval: 30000,
    },
    defaultSize: 30,
    minSize: 25,
    maxSize: 50,
    requiresAuth: false,
  },
  {
    type: 'quick-stats',
    displayName: 'Quick Stats',
    description: 'Overview of your music collection statistics and activity',
    category: 'analytics',
    icon: BarChart3,
    component: QuickStatsPanel,
    defaultConfig: {
      showHeader: true,
      headerTitle: 'Quick Stats',
      refreshInterval: 300000, // 5 minutes
    },
    defaultSize: 25,
    minSize: 20,
    maxSize: 40,
    requiresAuth: true,
  },
  {
    type: 'recently-played',
    displayName: 'Recently Played',
    description: "Albums you've listened to recently with timestamps",
    category: 'music',
    icon: Play,
    component: RecentlyPlayedPanel,
    defaultConfig: {
      showHeader: true,
      headerTitle: 'Recently Played',
      refreshInterval: 60000, // 1 minute
    },
    defaultSize: 30,
    minSize: 25,
    maxSize: 50,
    requiresAuth: true,
  },
  {
    type: 'friends-activity',
    displayName: 'Friend Activity',
    description:
      'See what your friends are listening to and recommending with friend filtering',
    category: 'social',
    icon: Users,
    component: FriendActivityPanel,
    defaultConfig: {
      showHeader: true,
      headerTitle: 'Friend Activity',
      refreshInterval: 30000,
    },
    defaultSize: 35,
    minSize: 30,
    maxSize: 60,
    requiresAuth: true,
  },
  {
    type: 'friend-discovery',
    displayName: 'Friend Discovery',
    description:
      'Discover new people to follow based on similar music taste and mutual connections',
    category: 'social',
    icon: UserPlus,
    component: FriendDiscoveryPanel,
    defaultConfig: {
      showHeader: true,
      headerTitle: 'Discover People',
      refreshInterval: 300000, // 5 minutes
    },
    defaultSize: 30,
    minSize: 25,
    maxSize: 50,
    requiresAuth: true,
  },
];
