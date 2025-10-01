// src/types/dashboard.ts

export type PanelType = 
  | 'collection-albums'
  | 'recommendations' 
  | 'activity-feed'
  | 'recently-played'
  | 'quick-stats'
  | 'friends-activity'
  | 'friend-discovery'
  | 'favorite-artists'
  | 'trending-albums'
  | 'genre-discovery'
  | 'new-releases'
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

// New flat panel structure for simplified dashboard
export interface FlatPanel {
  id: string;
  type: PanelType;
  x: number; // grid column start
  y: number; // grid row start
  width: number; // grid column span
  height: number; // grid row span
  config: PanelConfig;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
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
  isLoading?: boolean;
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
    reorderPanels: (activeId: string, overId: string, layoutPath?: string[]) => void;
    createGroup: (panelIds: string[], direction: 'horizontal' | 'vertical', position?: number) => void;
    ungroupPanel: (panelId: string, targetPosition?: number) => void;
    changeLayoutDirection: (layoutPath: string[], direction: 'horizontal' | 'vertical') => void;
    smartDrop: (draggedPanelId: string, targetPanelId: string, dropZone: 'top' | 'bottom' | 'left' | 'right' | 'center') => void;
    selectPanel: (panelId: string | null) => void;
    saveLayout: () => Promise<void>;
    loadLayout: (layoutId: string) => Promise<void>;
  };
}
