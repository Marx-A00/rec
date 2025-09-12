// src/contexts/DashboardContext.tsx
'use client';

import React, { createContext, useContext, useReducer, useCallback } from 'react';
// Using built-in crypto.randomUUID() instead of nanoid to avoid extra dependency
import { 
  DashboardContextType, 
  DashboardState, 
  PanelLayout, 
  Panel, 
  PanelType, 
  PanelConfig 
} from '@/types/dashboard';
import { panelRegistry } from '@/lib/dashboard/PanelRegistry';

// Action types for reducer
type DashboardAction =
  | { type: 'SET_LAYOUT'; payload: PanelLayout }
  | { type: 'TOGGLE_EDIT_MODE' }
  | { type: 'SET_EDIT_MODE'; payload: boolean }
  | { type: 'ADD_PANEL'; payload: { type: PanelType; config?: PanelConfig; position?: number } }
  | { type: 'REMOVE_PANEL'; payload: { panelId: string } }
  | { type: 'UPDATE_PANEL_CONFIG'; payload: { panelId: string; config: PanelConfig } }
  | { type: 'RESIZE_PANEL'; payload: { panelId: string; size: number } }
  | { type: 'MOVE_PANEL'; payload: { panelId: string; targetPosition: number } }
  | { type: 'SELECT_PANEL'; payload: { panelId: string | null } };

// Default layout matching current home page structure
const createDefaultLayout = (): PanelLayout => ({
  direction: 'vertical',
  panels: [
    {
      id: 'collection-panel',
      type: 'collection-albums',
      size: 35,
      minSize: 25,
      maxSize: 50,
      config: { showHeader: true, headerTitle: 'Your Collection' }
    },
    {
      id: 'main-content-group',
      type: 'collection-albums', // This will be overridden by nested layout
      size: 65,
      minSize: 50,
      config: {},
      layout: {
        direction: 'horizontal',
        panels: [
          {
            id: 'recommendations-panel',
            type: 'recommendations',
            size: 70,
            minSize: 50,
            config: { showHeader: true, headerTitle: 'Recent Recommendations' }
          },
          {
            id: 'activity-panel',
            type: 'activity-feed',
            size: 30,
            minSize: 25,
            maxSize: 50,
            config: { showHeader: true, headerTitle: 'Recent Activity' }
          }
        ]
      }
    }
  ]
});

const initialState: DashboardState = {
  layout: createDefaultLayout(),
  isEditMode: false,
  selectedPanelId: null,
};

// Reducer function
function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case 'SET_LAYOUT':
      return {
        ...state,
        layout: action.payload,
      };

    case 'TOGGLE_EDIT_MODE':
      return {
        ...state,
        isEditMode: !state.isEditMode,
        selectedPanelId: null, // Clear selection when toggling edit mode
      };

    case 'SET_EDIT_MODE':
      return {
        ...state,
        isEditMode: action.payload,
        selectedPanelId: action.payload ? state.selectedPanelId : null,
      };

    case 'ADD_PANEL': {
      const { type, config, position } = action.payload;
      const panelDef = panelRegistry.get(type);
      
      if (!panelDef) {
        console.error(`Panel type "${type}" not found in registry`);
        return state;
      }

      const newPanel: Panel = {
        id: crypto.randomUUID(),
        type,
        size: panelDef.defaultSize,
        minSize: panelDef.minSize,
        maxSize: panelDef.maxSize,
        config: { ...panelDef.defaultConfig, ...config },
      };

      // Add to the main layout (for now, we'll enhance this later for nested layouts)
      const newPanels = [...state.layout.panels];
      if (position !== undefined && position >= 0 && position <= newPanels.length) {
        newPanels.splice(position, 0, newPanel);
      } else {
        newPanels.push(newPanel);
      }

      return {
        ...state,
        layout: {
          ...state.layout,
          panels: newPanels,
        },
      };
    }

    case 'REMOVE_PANEL': {
      const { panelId } = action.payload;
      
      // Helper function to remove panel recursively
      const removePanelFromLayout = (layout: PanelLayout): PanelLayout => {
        const filteredPanels = layout.panels
          .filter(panel => panel.id !== panelId)
          .map(panel => ({
            ...panel,
            layout: panel.layout ? removePanelFromLayout(panel.layout) : undefined,
          }));

        return {
          ...layout,
          panels: filteredPanels,
        };
      };

      return {
        ...state,
        layout: removePanelFromLayout(state.layout),
        selectedPanelId: state.selectedPanelId === panelId ? null : state.selectedPanelId,
      };
    }

    case 'UPDATE_PANEL_CONFIG': {
      const { panelId, config } = action.payload;
      
      // Helper function to update panel config recursively
      const updatePanelInLayout = (layout: PanelLayout): PanelLayout => ({
        ...layout,
        panels: layout.panels.map(panel => {
          if (panel.id === panelId) {
            return { ...panel, config: { ...panel.config, ...config } };
          }
          if (panel.layout) {
            return { ...panel, layout: updatePanelInLayout(panel.layout) };
          }
          return panel;
        }),
      });

      return {
        ...state,
        layout: updatePanelInLayout(state.layout),
      };
    }

    case 'RESIZE_PANEL': {
      const { panelId, size } = action.payload;
      
      // Helper function to resize panel recursively
      const resizePanelInLayout = (layout: PanelLayout): PanelLayout => ({
        ...layout,
        panels: layout.panels.map(panel => {
          if (panel.id === panelId) {
            return { ...panel, size: Math.max(panel.minSize || 0, Math.min(panel.maxSize || 100, size)) };
          }
          if (panel.layout) {
            return { ...panel, layout: resizePanelInLayout(panel.layout) };
          }
          return panel;
        }),
      });

      return {
        ...state,
        layout: resizePanelInLayout(state.layout),
      };
    }

    case 'SELECT_PANEL':
      return {
        ...state,
        selectedPanelId: action.payload.panelId,
      };

    case 'MOVE_PANEL':
      // TODO: Implement panel reordering logic
      console.log('Move panel functionality not yet implemented');
      return state;

    default:
      return state;
  }
}

// Create context
const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

// Provider component
export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);

  // Action creators
  const actions = {
    setLayout: useCallback((layout: PanelLayout) => {
      dispatch({ type: 'SET_LAYOUT', payload: layout });
    }, []),

    toggleEditMode: useCallback(() => {
      dispatch({ type: 'TOGGLE_EDIT_MODE' });
    }, []),

    addPanel: useCallback((type: PanelType, config?: PanelConfig, position?: number) => {
      dispatch({ type: 'ADD_PANEL', payload: { type, config, position } });
    }, []),

    removePanel: useCallback((panelId: string) => {
      dispatch({ type: 'REMOVE_PANEL', payload: { panelId } });
    }, []),

    updatePanelConfig: useCallback((panelId: string, config: PanelConfig) => {
      dispatch({ type: 'UPDATE_PANEL_CONFIG', payload: { panelId, config } });
    }, []),

    resizePanel: useCallback((panelId: string, size: number) => {
      dispatch({ type: 'RESIZE_PANEL', payload: { panelId, size } });
    }, []),

    movePanel: useCallback((panelId: string, targetPosition: number) => {
      dispatch({ type: 'MOVE_PANEL', payload: { panelId, targetPosition } });
    }, []),

    selectPanel: useCallback((panelId: string | null) => {
      dispatch({ type: 'SELECT_PANEL', payload: { panelId } });
    }, []),

    saveLayout: useCallback(async () => {
      // TODO: Implement API call to save layout
      console.log('Saving layout:', state.layout);
    }, [state.layout]),

    loadLayout: useCallback(async (layoutId: string) => {
      // TODO: Implement API call to load layout
      console.log('Loading layout:', layoutId);
    }, []),
  };

  const contextValue: DashboardContextType = {
    state,
    actions,
  };

  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  );
}

// Hook to use the dashboard context
export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}

export default DashboardContext;
