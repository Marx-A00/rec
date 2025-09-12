// src/lib/dashboard/panelDefinitions.ts

import { Folder, Heart, Users } from 'lucide-react';
import { PanelDefinition } from '@/types/dashboard';
import CollectionAlbumsPanel from '@/components/dashboard/panels/CollectionAlbumsPanel';
import RecommendationsPanel from '@/components/dashboard/panels/RecommendationsPanel';
import ActivityFeedPanel from '@/components/dashboard/panels/ActivityFeedPanel';

export const panelDefinitions: PanelDefinition[] = [
  {
    type: 'collection-albums',
    displayName: 'Album Collection',
    description: 'Your personal album collection with quick access to favorites',
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
];
