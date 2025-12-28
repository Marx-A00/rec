import {
  LucideIcon,
  Home,
  TreePalm,
  Disc,
  Plus,
  Save,
  Settings,
  User,
  ChartBar,
  MessageCircle,
  TrendingUp,
} from 'lucide-react';

export interface NavItem {
  id: string;
  href?: string;
  icon: LucideIcon;
  label: string;
  tooltip: string;
  action?: (context?: any) => void;
  showWhen?: (context: NavigationContext) => boolean;
  badge?: {
    count?: number;
    variant?: 'default' | 'danger' | 'warning';
  };
  children?: NavItem[];
}

export interface NavigationContext {
  isAuthenticated: boolean;
  isEditMode?: boolean;
  userRole?: string;
  currentPath?: string;
  openRecommendationDrawer?: () => void;
  openTileLibrary?: () => void;
  saveMosaicLayout?: () => void;
}

export const getDefaultNavItems = (): NavItem[] => [
  {
    id: 'home',
    href: '/',
    icon: Home,
    label: 'Home',
    tooltip: 'Navigate to Home',
  },
  {
    id: 'browse',
    href: '/browse',
    icon: TreePalm,
    label: 'Browse',
    tooltip: 'Browse & Discover',
  },
  {
    id: 'recommend',
    icon: Disc,
    label: 'Recommend',
    tooltip: 'Create Recommendation',
    action: context => context?.openRecommendationDrawer?.(),
    showWhen: ctx => ctx.isAuthenticated,
  },
];

export const getDashboardEditModeItems = (): NavItem[] => [
  {
    id: 'add-tile',
    icon: Plus,
    label: 'Add Tile',
    tooltip: 'Add a new tile',
    showWhen: ctx => ctx.isEditMode === true,
    action: context => context?.openTileLibrary?.(),
  },
  {
    id: 'save-layout',
    icon: Save,
    label: 'Save Layout',
    tooltip: 'Save current layout',
    showWhen: ctx => ctx.isEditMode === true,
    action: context => context?.saveMosaicLayout?.(),
  },
];

export const getUserNavigationItems = (): NavItem[] => [
  {
    id: 'profile',
    href: '/profile',
    icon: User,
    label: 'Profile',
    tooltip: 'View your profile',
    showWhen: ctx => ctx.isAuthenticated,
  },
  {
    id: 'settings',
    href: '/settings',
    icon: Settings,
    label: 'Settings',
    tooltip: 'Application settings',
    showWhen: ctx => ctx.isAuthenticated,
  },
];

export const getAnalyticsNavigationItems = (): NavItem[] => [
  {
    id: 'analytics',
    icon: ChartBar,
    label: 'Analytics',
    tooltip: 'View analytics',
    children: [
      {
        id: 'analytics-overview',
        href: '/analytics',
        icon: ChartBar,
        label: 'Overview',
        tooltip: 'Analytics overview',
      },
      {
        id: 'analytics-trends',
        href: '/analytics/trends',
        icon: TrendingUp,
        label: 'Trends',
        tooltip: 'View trends',
      },
    ],
    showWhen: ctx =>
      ctx.isAuthenticated &&
      (ctx.userRole === 'admin' || ctx.userRole === 'analyst'),
  },
];

export const getSocialNavigationItems = (): NavItem[] => [
  {
    id: 'social',
    href: '/social',
    icon: MessageCircle,
    label: 'Social',
    tooltip: 'Social features',
    badge: {
      count: 3,
      variant: 'default',
    },
    showWhen: ctx => ctx.isAuthenticated,
  },
];

/**
 * Combines all navigation items based on context
 * @param context - The navigation context
 * @returns Array of navigation items filtered by context
 */
export const getAllNavigationItems = (
  context: NavigationContext
): NavItem[] => {
  const allItems = [
    ...getDefaultNavItems(),
    ...getUserNavigationItems(),
    ...getAnalyticsNavigationItems(),
    ...getSocialNavigationItems(),
    ...(context.isEditMode ? getDashboardEditModeItems() : []),
  ];

  // Filter items based on showWhen conditions
  return filterNavigationItems(allItems, context);
};

/**
 * Recursively filters navigation items based on showWhen conditions
 * @param items - The navigation items to filter
 * @param context - The navigation context
 * @returns Filtered array of navigation items
 */
export const filterNavigationItems = (
  items: NavItem[],
  context: NavigationContext
): NavItem[] => {
  return items.filter(item => {
    // Check if item should be shown
    if (item.showWhen && !item.showWhen(context)) {
      return false;
    }

    // Filter children if they exist
    if (item.children) {
      const filteredChildren = filterNavigationItems(item.children, context);
      // Only include parent if it has visible children
      if (filteredChildren.length === 0 && !item.href && !item.action) {
        return false;
      }
      // Update item with filtered children
      item = { ...item, children: filteredChildren };
    }

    return true;
  });
};

/**
 * Finds a navigation item by ID
 * @param items - The navigation items to search
 * @param id - The ID to search for
 * @returns The found navigation item or undefined
 */
export const findNavigationItem = (
  items: NavItem[],
  id: string
): NavItem | undefined => {
  for (const item of items) {
    if (item.id === id) {
      return item;
    }
    if (item.children) {
      const found = findNavigationItem(item.children, id);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
};

/**
 * Gets the active navigation item based on the current path
 * @param items - The navigation items to search
 * @param currentPath - The current path
 * @returns The active navigation item ID or null
 */
export const getActiveNavigationItem = (
  items: NavItem[],
  currentPath: string
): string | null => {
  for (const item of items) {
    if (item.href === currentPath) {
      return item.id;
    }
    if (item.children) {
      const activeChild = getActiveNavigationItem(item.children, currentPath);
      if (activeChild) {
        return activeChild;
      }
    }
  }
  return null;
};
