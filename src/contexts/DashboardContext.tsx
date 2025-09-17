// src/contexts/DashboardContext.tsx
'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { useSession } from 'next-auth/react';
// Using built-in crypto.randomUUID() instead of nanoid to avoid extra dependency
import {
  DashboardContextType,
  DashboardState,
  PanelLayout,
  Panel,
  PanelType,
  PanelConfig
} from '@/types/mosaic';
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
  | { type: 'REORDER_PANELS'; payload: { activeId: string; overId: string; layoutPath?: string[] } }
  | { type: 'CREATE_GROUP'; payload: { panelIds: string[]; direction: 'horizontal' | 'vertical'; position?: number } }
  | { type: 'UNGROUP_PANEL'; payload: { panelId: string; targetPosition?: number } }
  | { type: 'CHANGE_LAYOUT_DIRECTION'; payload: { layoutPath: string[]; direction: 'horizontal' | 'vertical' } }
  | { type: 'SMART_DROP'; payload: { draggedPanelId: string; targetPanelId: string; dropZone: 'top' | 'bottom' | 'left' | 'right' | 'center' } }
  | { type: 'SELECT_PANEL'; payload: { panelId: string | null } };

// Default layout - flattened so all panels can be reordered
const createDefaultLayout = (): PanelLayout => ({
  direction: 'vertical',
  panels: [
    {
      id: 'collection-panel',
      type: 'collection-albums',
      size: 40,
      minSize: 25,
      maxSize: 60,
      config: { showHeader: true, headerTitle: 'Your Collection' }
    },
    {
      id: 'recommendations-panel',
      type: 'recommendations',
      size: 35,
      minSize: 20,
      maxSize: 50,
      config: { showHeader: true, headerTitle: 'Recent Recommendations' }
    },
    {
      id: 'activity-panel',
      type: 'activity-feed',
      size: 25,
      minSize: 15,
      maxSize: 40,
      config: { showHeader: true, headerTitle: 'Recent Activity' }
    }
  ]
});

const initialState: DashboardState = {
  layout: createDefaultLayout(),
  isEditMode: false,
  selectedPanelId: null,
  isLoading: true,
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

      // Clean up empty layouts after removal
      const cleanLayout = (layout: PanelLayout): PanelLayout => {
        if (!layout.panels || layout.panels.length === 0) {
          return layout;
        }

        const cleanedPanels = layout.panels
          .map(panel => {
            if (panel.layout) {
              const cleanedNestedLayout = cleanLayout(panel.layout);
              // If nested layout is empty, remove this panel entirely
              if (cleanedNestedLayout.panels.length === 0) {
                return null;
              }
              // If nested layout has only one panel, flatten it completely
              if (cleanedNestedLayout.panels.length === 1) {
                const flattenedPanel = cleanedNestedLayout.panels[0];
                // Preserve the parent's size but use the child's properties
                return {
                  ...flattenedPanel,
                  size: panel.size,
                  minSize: panel.minSize,
                  maxSize: panel.maxSize,
                };
              }
              return { ...panel, layout: cleanedNestedLayout };
            }
            return panel;
          })
          .filter(Boolean) as Panel[];

        return { ...layout, panels: cleanedPanels };
      };

      const layoutAfterRemoval = removePanelFromLayout(state.layout);

      return {
        ...state,
        layout: cleanLayout(layoutAfterRemoval),
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

    case 'REORDER_PANELS': {
      const { activeId, overId } = action.payload;
      
      if (activeId === overId) return state;

      // Helper function to clean up empty layouts and flatten single-panel groups
      const cleanLayout = (layout: PanelLayout): PanelLayout => {
        if (!layout.panels || layout.panels.length === 0) {
          return layout;
        }

        const cleanedPanels = layout.panels
          .map(panel => {
            if (panel.layout) {
              const cleanedNestedLayout = cleanLayout(panel.layout);
              // If nested layout is empty, remove this panel entirely
              if (cleanedNestedLayout.panels.length === 0) {
                return null;
              }
              // If nested layout has only one panel, flatten it completely
              if (cleanedNestedLayout.panels.length === 1) {
                const flattenedPanel = cleanedNestedLayout.panels[0];
                // Preserve the parent's size but use the child's properties
                return {
                  ...flattenedPanel,
                  size: panel.size,
                  minSize: panel.minSize,
                  maxSize: panel.maxSize,
                };
              }
              return { ...panel, layout: cleanedNestedLayout };
            }
            return panel;
          })
          .filter(Boolean) as Panel[];

        return { ...layout, panels: cleanedPanels };
      };

      // Helper function to reorder panels within a layout
      const reorderPanelsInLayout = (layout: PanelLayout): PanelLayout => {
        const activeIndex = layout.panels.findIndex(panel => panel.id === activeId);
        const overIndex = layout.panels.findIndex(panel => panel.id === overId);
        
        if (activeIndex !== -1 && overIndex !== -1) {
          // Both panels are in this layout, reorder them
          return {
            ...layout,
            panels: arrayMove(layout.panels, activeIndex, overIndex),
          };
        }
        
        // Check nested layouts
        return {
          ...layout,
          panels: layout.panels.map(panel => ({
            ...panel,
            layout: panel.layout ? reorderPanelsInLayout(panel.layout) : undefined,
          })),
        };
      };

      return {
        ...state,
        layout: reorderPanelsInLayout(state.layout),
      };
    }

    case 'CREATE_GROUP': {
      const { panelIds, direction, position = 0 } = action.payload;
      
      // Helper function to create a group from specified panels
      const createGroupInLayout = (layout: PanelLayout): PanelLayout => {
        const panelsToGroup = layout.panels.filter(panel => panelIds.includes(panel.id));
        const remainingPanels = layout.panels.filter(panel => !panelIds.includes(panel.id));
        
        if (panelsToGroup.length < 2) {
          // Need at least 2 panels to create a group
          return layout;
        }

        // Create the new group panel
        const groupPanel: Panel = {
          id: crypto.randomUUID(),
          type: panelsToGroup[0].type, // Will be overridden by layout
          size: panelsToGroup.reduce((sum, panel) => sum + panel.size, 0),
          minSize: 20,
          maxSize: 80,
          config: {},
          layout: {
            direction,
            panels: panelsToGroup.map(panel => ({
              ...panel,
              size: panel.size / panelsToGroup.length * 100, // Redistribute sizes
            })),
          },
        };

        // Insert the group at the specified position
        const newPanels = [...remainingPanels];
        newPanels.splice(position, 0, groupPanel);

        return {
          ...layout,
          panels: newPanels,
        };
      };

      return {
        ...state,
        layout: createGroupInLayout(state.layout),
      };
    }

    case 'UNGROUP_PANEL': {
      const { panelId, targetPosition = 0 } = action.payload;
      
      // Helper function to ungroup a panel and move it to main layout
      const ungroupPanelInLayout = (layout: PanelLayout): PanelLayout => {
        let extractedPanel: Panel | null = null;
        
        const processedPanels = layout.panels.reduce((acc: Panel[], panel) => {
          if (panel.layout) {
            // Check if the panel to ungroup is in this nested layout
            const panelInGroup = panel.layout.panels.find(p => p.id === panelId);
            
            if (panelInGroup) {
              // Extract the panel
              extractedPanel = panelInGroup;
              
              // Remove the panel from the group
              const remainingGroupPanels = panel.layout.panels.filter(p => p.id !== panelId);
              
              if (remainingGroupPanels.length === 1) {
                // If only one panel left in group, dissolve the group
                acc.push(remainingGroupPanels[0]);
              } else if (remainingGroupPanels.length > 1) {
                // Keep the group with remaining panels
                acc.push({
                  ...panel,
                  layout: {
                    ...panel.layout,
                    panels: remainingGroupPanels,
                  },
                });
              }
            } else {
              // Recursively process nested layouts
              acc.push({
                ...panel,
                layout: ungroupPanelInLayout(panel.layout),
              });
            }
          } else {
            acc.push(panel);
          }
          
          return acc;
        }, []);

        // Insert extracted panel at target position
        if (extractedPanel) {
          processedPanels.splice(targetPosition, 0, extractedPanel);
        }

        return {
          ...layout,
          panels: processedPanels,
        };
      };

      return {
        ...state,
        layout: ungroupPanelInLayout(state.layout),
      };
    }

    case 'CHANGE_LAYOUT_DIRECTION': {
      const { layoutPath, direction } = action.payload;
      
      // Helper function to change direction at a specific path
      const changeDirectionInLayout = (layout: PanelLayout, path: string[], depth = 0): PanelLayout => {
        if (depth === path.length) {
          return {
            ...layout,
            direction,
          };
        }
        
        const panelId = path[depth];
        return {
          ...layout,
          panels: layout.panels.map(panel => 
            panel.id === panelId && panel.layout
              ? {
                  ...panel,
                  layout: changeDirectionInLayout(panel.layout, path, depth + 1),
                }
              : panel
          ),
        };
      };

      return {
        ...state,
        layout: layoutPath.length === 0 
          ? { ...state.layout, direction }
          : changeDirectionInLayout(state.layout, layoutPath),
      };
    }

    case 'SMART_DROP': {
      const { draggedPanelId, targetPanelId, dropZone } = action.payload;
      
      // Helper function to find and extract a panel from the layout
      const extractPanel = (layout: PanelLayout): { panel: Panel | null; newLayout: PanelLayout } => {
        let extractedPanel: Panel | null = null;
        
        const newPanels = layout.panels.reduce((acc: Panel[], panel) => {
          if (panel.id === draggedPanelId) {
            extractedPanel = panel;
            return acc; // Don't include this panel
          }
          
          if (panel.layout) {
            const result = extractPanel(panel.layout);
            if (result.panel) {
              extractedPanel = result.panel;
              // If the nested layout is now empty, don't include this panel
              if (result.newLayout.panels.length === 0) {
                return acc;
              }
              // If only one panel left in nested layout, flatten it
              if (result.newLayout.panels.length === 1) {
                acc.push(result.newLayout.panels[0]);
              } else {
                acc.push({ ...panel, layout: result.newLayout });
              }
            } else {
              acc.push(panel);
            }
          } else {
            acc.push(panel);
          }
          
          return acc;
        }, []);

        return {
          panel: extractedPanel,
          newLayout: { ...layout, panels: newPanels },
        };
      };

      // Helper function to insert panel based on drop zone
      const insertPanelInLayout = (layout: PanelLayout, draggedPanel: Panel): PanelLayout => {
        const newPanels = layout.panels.map(panel => {
          if (panel.id === targetPanelId) {
            // This is where we need to create the split
            switch (dropZone) {
              case 'center':
                // Replace the target panel
                return draggedPanel;
                
              case 'top':
              case 'bottom': {
                // Create vertical split - don't create a wrapper panel, just modify the layout
                const topPanel = dropZone === 'top' ? { ...draggedPanel, size: 50 } : { ...panel, size: 50 };
                const bottomPanel = dropZone === 'top' ? { ...panel, size: 50 } : { ...draggedPanel, size: 50 };
                
                return {
                  id: crypto.randomUUID(),
                  type: panel.type, // Keep the original panel type
                  size: panel.size,
                  minSize: panel.minSize,
                  maxSize: panel.maxSize,
                  config: {},
                  layout: {
                    direction: 'vertical' as const,
                    panels: [topPanel, bottomPanel],
                  },
                };
              }
              
              case 'left':
              case 'right': {
                // Create horizontal split - don't create a wrapper panel, just modify the layout
                const leftPanel = dropZone === 'left' ? { ...draggedPanel, size: 50 } : { ...panel, size: 50 };
                const rightPanel = dropZone === 'left' ? { ...panel, size: 50 } : { ...draggedPanel, size: 50 };
                
                return {
                  id: crypto.randomUUID(),
                  type: panel.type, // Keep the original panel type
                  size: panel.size,
                  minSize: panel.minSize,
                  maxSize: panel.maxSize,
                  config: {},
                  layout: {
                    direction: 'horizontal' as const,
                    panels: [leftPanel, rightPanel],
                  },
                };
              }
              
              default:
                return panel;
            }
          }
          
          // Recursively handle nested layouts
          if (panel.layout) {
            return {
              ...panel,
              layout: insertPanelInLayout(panel.layout, draggedPanel),
            };
          }
          
          return panel;
        });

        return { ...layout, panels: newPanels };
      };

      // Extract the dragged panel first
      const { panel: draggedPanel, newLayout } = extractPanel(state.layout);
      
      if (!draggedPanel) {
        console.warn('Could not find dragged panel:', draggedPanelId);
        return state;
      }

      // Insert the panel at the target location
      const finalLayout = insertPanelInLayout(newLayout, draggedPanel);

      // Reuse the cleanup function to prevent "No panels configured" message
      const cleanLayoutForSmartDrop = (layout: PanelLayout): PanelLayout => {
        if (!layout.panels || layout.panels.length === 0) {
          return layout;
        }

        const cleanedPanels = layout.panels
          .map(panel => {
            if (panel.layout) {
              const cleanedNestedLayout = cleanLayoutForSmartDrop(panel.layout);
              // If nested layout is empty, remove this panel entirely
              if (cleanedNestedLayout.panels.length === 0) {
                return null;
              }
              // If nested layout has only one panel, flatten it completely
              if (cleanedNestedLayout.panels.length === 1) {
                const flattenedPanel = cleanedNestedLayout.panels[0];
                // Preserve the parent's size but use the child's properties
                return {
                  ...flattenedPanel,
                  size: panel.size,
                  minSize: panel.minSize,
                  maxSize: panel.maxSize,
                };
              }
              return { ...panel, layout: cleanedNestedLayout };
            }
            return panel;
          })
          .filter(Boolean) as Panel[];

        return { ...layout, panels: cleanedPanels };
      };

      return {
        ...state,
        layout: cleanLayoutForSmartDrop(finalLayout),
      };
    }

    default:
      return state;
  }
}

// Create context
const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

// Provider component
// GraphQL queries/mutations for settings
const LOAD_SETTINGS_QUERY = `
  query LoadDashboardSettings {
    mySettings {
      id
      dashboardLayout
    }
  }
`;

const SAVE_LAYOUT_MUTATION = `
  mutation UpdateDashboardLayout($layout: JSON!) {
    updateDashboardLayout(layout: $layout) {
      id
      dashboardLayout
    }
  }
`;

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);
  const { data: session } = useSession();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoadedRef = useRef(false);

  // Load dashboard layout from database on mount
  useEffect(() => {
    if (!session?.user || hasLoadedRef.current) return;

    const loadLayout = async () => {
      try {
        const response = await fetch('/api/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            query: LOAD_SETTINGS_QUERY
          })
        });

        const { data } = await response.json();
        if (data?.mySettings?.dashboardLayout) {
          dispatch({ type: 'SET_LAYOUT', payload: data.mySettings.dashboardLayout });
        }
        hasLoadedRef.current = true;
      } catch (error) {
        console.error('Failed to load dashboard layout:', error);
      }
    };

    loadLayout();
  }, [session]);

  // Auto-save layout changes with debounce
  useEffect(() => {
    if (!session?.user || !hasLoadedRef.current) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for saving
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch('/api/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            query: SAVE_LAYOUT_MUTATION,
            variables: { layout: state.layout }
          })
        });
        console.log('Dashboard layout saved');
      } catch (error) {
        console.error('Failed to save dashboard layout:', error);
      }
    }, 2000); // 2 second debounce

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state.layout, session]);

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

    reorderPanels: useCallback((activeId: string, overId: string, layoutPath?: string[]) => {
      dispatch({ type: 'REORDER_PANELS', payload: { activeId, overId, layoutPath } });
    }, []),

    createGroup: useCallback((panelIds: string[], direction: 'horizontal' | 'vertical', position?: number) => {
      dispatch({ type: 'CREATE_GROUP', payload: { panelIds, direction, position } });
    }, []),

    ungroupPanel: useCallback((panelId: string, targetPosition?: number) => {
      dispatch({ type: 'UNGROUP_PANEL', payload: { panelId, targetPosition } });
    }, []),

    changeLayoutDirection: useCallback((layoutPath: string[], direction: 'horizontal' | 'vertical') => {
      dispatch({ type: 'CHANGE_LAYOUT_DIRECTION', payload: { layoutPath, direction } });
    }, []),

    smartDrop: useCallback((draggedPanelId: string, targetPanelId: string, dropZone: 'top' | 'bottom' | 'left' | 'right' | 'center') => {
      dispatch({ type: 'SMART_DROP', payload: { draggedPanelId, targetPanelId, dropZone } });
    }, []),

    saveLayout: useCallback(async () => {
      if (!session?.user) {
        console.error('No session user, cannot save');
        return;
      }

      console.log('Saving layout for user:', session.user.id);
      console.log('Layout to save:', state.layout);

      try {
        const response = await fetch('/api/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            query: SAVE_LAYOUT_MUTATION,
            variables: { layout: state.layout }
          })
        });

        const result = await response.json();
        console.log('Save response:', result);

        if (result.errors) {
          console.error('GraphQL errors:', result.errors);
          throw new Error(result.errors[0].message);
        }

        console.log('Layout saved manually - settings ID:', result.data?.updateDashboardLayout?.id);
      } catch (error) {
        console.error('Failed to save layout:', error);
        throw error;
      }
    }, [state.layout, session]),

    loadLayout: useCallback(async () => {
      // Already handled in useEffect
      console.log('Layout loading handled automatically');
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
