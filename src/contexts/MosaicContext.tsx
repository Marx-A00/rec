'use client';

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { FlatPanel, PanelType, PanelConfig } from '@/types/mosaic';

interface MosaicState {
  tiles: FlatPanel[];
  isEditMode: boolean;
  selectedTileId: string | null;
}

type MosaicAction =
  | { type: 'SET_TILES'; tiles: FlatPanel[] }
  | { type: 'ADD_TILE'; tile: FlatPanel }
  | { type: 'REMOVE_TILE'; id: string }
  | { type: 'UPDATE_TILE'; id: string; updates: Partial<FlatPanel> }
  | { type: 'MOVE_TILE'; id: string; x: number; y: number }
  | { type: 'RESIZE_TILE'; id: string; width: number; height: number }
  | { type: 'UPDATE_TILE_CONFIG'; id: string; config: PanelConfig }
  | { type: 'TOGGLE_EDIT_MODE' }
  | { type: 'SELECT_TILE'; id: string | null };

interface MosaicContextType {
  state: MosaicState;
  actions: {
    setTiles: (tiles: FlatPanel[]) => void;
    addTile: (type: PanelType, position?: { x: number; y: number; width: number; height: number }) => void;
    removeTile: (id: string) => void;
    updateTile: (id: string, updates: Partial<FlatPanel>) => void;
    moveTile: (id: string, x: number, y: number) => void;
    resizeTile: (id: string, width: number, height: number) => void;
    updateTileConfig: (id: string, config: PanelConfig) => void;
    toggleEditMode: () => void;
    selectTile: (id: string | null) => void;
    swapTiles: (id1: string, id2: string) => void;
  };
}

function mosaicReducer(state: MosaicState, action: MosaicAction): MosaicState {
  switch (action.type) {
    case 'SET_TILES':
      return { ...state, tiles: action.tiles };

    case 'ADD_TILE':
      return { ...state, tiles: [...state.tiles, action.tile] };

    case 'REMOVE_TILE':
      return {
        ...state,
        tiles: state.tiles.filter(tile => tile.id !== action.id),
        selectedTileId: state.selectedTileId === action.id ? null : state.selectedTileId,
      };

    case 'UPDATE_TILE':
      return {
        ...state,
        tiles: state.tiles.map(tile =>
          tile.id === action.id ? { ...tile, ...action.updates } : tile
        ),
      };

    case 'MOVE_TILE':
      return {
        ...state,
        tiles: state.tiles.map(tile =>
          tile.id === action.id ? { ...tile, x: action.x, y: action.y } : tile
        ),
      };

    case 'RESIZE_TILE':
      return {
        ...state,
        tiles: state.tiles.map(tile =>
          tile.id === action.id ? { ...tile, width: action.width, height: action.height } : tile
        ),
      };

    case 'UPDATE_TILE_CONFIG':
      return {
        ...state,
        tiles: state.tiles.map(tile =>
          tile.id === action.id ? { ...tile, config: action.config } : tile
        ),
      };

    case 'TOGGLE_EDIT_MODE':
      return {
        ...state,
        isEditMode: !state.isEditMode,
        selectedTileId: !state.isEditMode ? state.selectedTileId : null,
      };

    case 'SELECT_TILE':
      return { ...state, selectedTileId: action.id };

    default:
      return state;
  }
}

// Default tiles configuration
const defaultTiles: FlatPanel[] = [
  {
    id: 'quick-stats-1',
    type: 'quick-stats',
    x: 1,
    y: 1,
    width: 4,
    height: 2,
    config: {},
  },
  {
    id: 'collection-albums-1',
    type: 'collection-albums',
    x: 5,
    y: 1,
    width: 4,
    height: 4,
    config: {},
  },
  {
    id: 'recommendations-1',
    type: 'recommendations',
    x: 9,
    y: 1,
    width: 4,
    height: 4,
    config: {},
  },
  {
    id: 'activity-feed-1',
    type: 'activity-feed',
    x: 1,
    y: 3,
    width: 4,
    height: 4,
    config: {},
  },
];

const MosaicContext = createContext<MosaicContextType | undefined>(undefined);

export function MosaicProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(mosaicReducer, {
    tiles: defaultTiles,
    isEditMode: false,
    selectedTileId: null,
  });

  const actions = {
    setTiles: useCallback((tiles: FlatPanel[]) => {
      dispatch({ type: 'SET_TILES', tiles });
    }, []),

    addTile: useCallback((type: PanelType, position?: { x: number; y: number; width: number; height: number }) => {
      const newTile: FlatPanel = {
        id: `${type}-${Date.now()}`,
        type,
        x: position?.x || 1,
        y: position?.y || 1,
        width: position?.width || 4,
        height: position?.height || 3,
        config: {},
      };
      dispatch({ type: 'ADD_TILE', tile: newTile });
    }, []),

    removeTile: useCallback((id: string) => {
      dispatch({ type: 'REMOVE_TILE', id });
    }, []),

    updateTile: useCallback((id: string, updates: Partial<FlatPanel>) => {
      dispatch({ type: 'UPDATE_TILE', id, updates });
    }, []),

    moveTile: useCallback((id: string, x: number, y: number) => {
      dispatch({ type: 'MOVE_TILE', id, x, y });
    }, []),

    resizeTile: useCallback((id: string, width: number, height: number) => {
      dispatch({ type: 'RESIZE_TILE', id, width, height });
    }, []),

    updateTileConfig: useCallback((id: string, config: PanelConfig) => {
      dispatch({ type: 'UPDATE_TILE_CONFIG', id, config });
    }, []),

    toggleEditMode: useCallback(() => {
      dispatch({ type: 'TOGGLE_EDIT_MODE' });
    }, []),

    selectTile: useCallback((id: string | null) => {
      dispatch({ type: 'SELECT_TILE', id });
    }, []),

    swapTiles: useCallback((id1: string, id2: string) => {
      // This should be handled by the state, not using a function dispatch
      // For now, we'll implement this differently
      console.log('Swap tiles:', id1, id2);
      // TODO: Implement swap tiles properly
    }, []),
  };

  return (
    <MosaicContext.Provider value={{ state, actions }}>
      {children}
    </MosaicContext.Provider>
  );
}

export function useMosaic() {
  const context = useContext(MosaicContext);
  if (!context) {
    throw new Error('useMosaic must be used within a MosaicProvider');
  }
  return context;
}