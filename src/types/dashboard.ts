// src/types/dashboard.ts

export type PanelType = 
  | 'collection-albums'
  | 'recommendations' 
  | 'activity-feed'
  | 'recently-played'
  | 'favorite-artists'
  | 'trending-albums'
  | 'quick-stats'
  | 'genre-discovery'
  | 'new-releases'
  | 'friends-activity'
  | 'personal-notes'
  | 'mini-player'
  | 'search-quick-access';

export interface PanelConfig {
  // Common config options all panels can use
  refreshInterval?: number;
  showHeader?: boolean;
  headerTitle?: string;
  
  // Panel-specific configurations (typed per panel type)
  [key: string]: any;
}

export interface Panel {
  id: string;
  type: PanelType;
  size: number; // percentage
  minSize?: number;
  maxSize?: number;
  config: PanelConfig;
  layout?: PanelLayout; // for nested panel groups
}

export interface PanelLayout {
  direction: 'horizontal' | 'vertical';
  panels: Panel[];
}

export interface DashboardLayout {
  id: string;
  userId: string;
  name: string;
  isDefault: boolean;
  layout: PanelLayout;
  createdAt: Date;
  updatedAt: Date;
}

export interface PanelDefinition {
  type: PanelType;
  displayName: string;
  description: string;
  category: 'music' | 'social' | 'analytics' | 'tools';
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType<PanelComponentProps>;
  defaultConfig: PanelConfig;
  defaultSize: number;
  minSize: number;
  maxSize: number;
  requiresAuth?: boolean;
}

export interface PanelComponentProps {
  panelId: string;
  config: PanelConfig;
  isEditMode?: boolean;
  onConfigChange?: (config: PanelConfig) => void;
  onRemove?: () => void;
}

export interface DashboardState {
  layout: PanelLayout;
  isEditMode: boolean;
  selectedPanelId: string | null;
}

export interface DashboardContextType {
  state: DashboardState;
  actions: {
    setLayout: (layout: PanelLayout) => void;
    toggleEditMode: () => void;
    addPanel: (type: PanelType, config?: PanelConfig) => void;
    removePanel: (panelId: string) => void;
    updatePanelConfig: (panelId: string, config: PanelConfig) => void;
    resizePanel: (panelId: string, size: number) => void;
    movePanel: (panelId: string, targetPosition: number) => void;
    selectPanel: (panelId: string | null) => void;
    saveLayout: () => Promise<void>;
    loadLayout: (layoutId: string) => Promise<void>;
  };
}
