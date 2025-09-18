// Split-pane based mosaic types

export type SplitDirection = 'horizontal' | 'vertical';

export interface PanelContent {
  id: string;
  type: string;
  title?: string;
  config?: Record<string, any>;
}

export interface SplitNode {
  id: string;
  type: 'split' | 'panel';
  direction?: SplitDirection; // Only for split nodes
  children?: SplitNode[]; // Only for split nodes
  sizes?: number[]; // Percentage sizes for children
  content?: PanelContent; // Only for panel nodes
  minSize?: number; // Minimum size in pixels
  maxSize?: number; // Maximum size in pixels
}

export interface SplitAction {
  type: 'split' | 'remove' | 'move' | 'resize';
  panelId: string;
  direction?: SplitDirection;
  newPanel?: PanelContent;
  sizes?: number[];
  targetId?: string;
}

export interface SplitMosaicState {
  root: SplitNode | null;
  activePanel: string | null;
  isEditMode: boolean;
}