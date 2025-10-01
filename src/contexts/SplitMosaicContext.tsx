'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { SplitNode, PanelContent, SplitDirection, SplitMosaicState } from '@/types/split-mosaic';

interface SplitMosaicContextType {
  state: SplitMosaicState;
  actions: {
    setLayout: (root: SplitNode | null) => void;
    splitPanel: (panelId: string, direction: SplitDirection, newPanel: PanelContent) => void;
    removePanel: (panelId: string) => void;
    toggleEditMode: () => void;
    saveLayout: () => void;
    loadLayout: () => void;
    resetLayout: () => void;
  };
}

const SplitMosaicContext = createContext<SplitMosaicContextType | undefined>(undefined);

const STORAGE_KEY = 'split-mosaic-layout';

// Default initial panel
const createDefaultPanel = (): SplitNode => ({
  id: 'panel-default',
  type: 'panel',
  content: {
    id: 'content-default',
    type: 'quick-stats',
    title: 'Dashboard Overview',
  },
});

export function SplitMosaicProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SplitMosaicState>({
    root: createDefaultPanel(),
    activePanel: null,
    isEditMode: false,
  });

  // Helper function to generate unique IDs
  const generateUniqueId = useCallback((prefix: string) => {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }, []);

  // Helper function to find and split a panel
  const splitPanel = useCallback((panelId: string, direction: SplitDirection, newPanel: PanelContent) => {
    setState(prevState => {
      if (!prevState.root) return prevState;

      const splitNode = (node: SplitNode): SplitNode => {
        // If this is the panel to split
        if (node.id === panelId && node.type === 'panel') {
          // Create a copy of the original node to preserve it
          const originalNode: SplitNode = {
            ...node,
            id: generateUniqueId('node'),
          };

          // Create new panel node
          const newPanelNode: SplitNode = {
            id: generateUniqueId('node'),
            type: 'panel',
            content: newPanel,
          };

          // Return a split node with the original and new panel
          return {
            id: generateUniqueId('split'),
            type: 'split',
            direction,
            children: [originalNode, newPanelNode],
            sizes: [50, 50], // Start with 50/50 split
          };
        }

        // Recursively search children
        if (node.children) {
          return {
            ...node,
            children: node.children.map(splitNode),
          };
        }

        return node;
      };

      return {
        ...prevState,
        root: splitNode(prevState.root),
      };
    });
  }, [generateUniqueId]);

  // Helper function to remove a panel
  const removePanel = useCallback((panelId: string) => {
    setState(prevState => {
      if (!prevState.root) return prevState;

      // Special case: if root is the panel to remove, clear everything
      if (prevState.root.id === panelId) {
        return { ...prevState, root: null };
      }

      const removeNode = (node: SplitNode): SplitNode | null => {
        // If this is a split node
        if (node.type === 'split' && node.children) {
          // Check if any child is the panel to remove
          const childToRemoveIndex = node.children.findIndex(child => child.id === panelId);

          if (childToRemoveIndex !== -1) {
            // Found the panel to remove
            const remainingChildren = node.children.filter((_, index) => index !== childToRemoveIndex);

            // If only one child remains, return it directly (flatten)
            if (remainingChildren.length === 1) {
              return remainingChildren[0];
            }

            // If multiple children remain, keep the split
            if (remainingChildren.length > 1) {
              return {
                ...node,
                children: remainingChildren,
              };
            }

            // No children remain (shouldn't happen)
            return null;
          }

          // Panel not found at this level, recurse into children
          const newChildren = node.children
            .map(child => child.type === 'split' ? removeNode(child) : child)
            .filter(Boolean) as SplitNode[];

          // Check if any child was modified (panel was removed deeper in tree)
          if (newChildren.length !== node.children.length) {
            // If only one child remains, return it directly (flatten)
            if (newChildren.length === 1) {
              return newChildren[0];
            }

            return {
              ...node,
              children: newChildren,
            };
          }

          // No changes at this level
          return node;
        }

        // This is a panel node, return as is if not the one to remove
        return node;
      };

      const newRoot = removeNode(prevState.root);
      return {
        ...prevState,
        root: newRoot,
      };
    });
  }, []);

  // Toggle edit mode
  const toggleEditMode = useCallback(() => {
    setState(prev => ({ ...prev, isEditMode: !prev.isEditMode }));
  }, []);

  // Save layout to localStorage
  const saveLayout = useCallback(() => {
    if (state.root) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.root));
      console.log('Layout saved');
    }
  }, [state.root]);

  // Load layout from localStorage
  const loadLayout = useCallback(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const layout = JSON.parse(saved);
        setState(prev => ({ ...prev, root: layout }));
        console.log('Layout loaded');
      } catch (error) {
        console.error('Failed to load layout:', error);
      }
    }
  }, []);

  // Reset to default layout
  const resetLayout = useCallback(() => {
    setState(prev => ({ ...prev, root: createDefaultPanel() }));
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Set entire layout (for resize operations)
  const setLayout = useCallback((root: SplitNode | null) => {
    setState(prev => ({ ...prev, root }));
  }, []);

  // Load saved layout on mount
  useEffect(() => {
    loadLayout();
  }, []);

  const value: SplitMosaicContextType = {
    state,
    actions: {
      setLayout,
      splitPanel,
      removePanel,
      toggleEditMode,
      saveLayout,
      loadLayout,
      resetLayout,
    },
  };

  return (
    <SplitMosaicContext.Provider value={value}>
      {children}
    </SplitMosaicContext.Provider>
  );
}

export function useSplitMosaic() {
  const context = useContext(SplitMosaicContext);
  if (!context) {
    throw new Error('useSplitMosaic must be used within a SplitMosaicProvider');
  }
  return context;
}