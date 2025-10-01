'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, FC } from 'react';

export interface HeaderState {
  leftContent: ReactNode | null;
  centerContent: ReactNode | null;
  rightContent: ReactNode | null;
  isVisible: boolean;
}

export interface HeaderContextValue {
  state: HeaderState;
  setLeftContent: (content: ReactNode | null) => void;
  setCenterContent: (content: ReactNode | null) => void;
  setRightContent: (content: ReactNode | null) => void;
  setHeaderVisible: (visible: boolean) => void;
  clearHeader: () => void;
}

const initialState: HeaderState = {
  leftContent: null,
  centerContent: null,
  rightContent: null,
  isVisible: true
};

const HeaderContext = createContext<HeaderContextValue | undefined>(undefined);

export const HeaderProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<HeaderState>(initialState);

  const setLeftContent = useCallback((content: ReactNode | null) => {
    setState(prev => ({ ...prev, leftContent: content }));
  }, []);

  const setCenterContent = useCallback((content: ReactNode | null) => {
    setState(prev => ({ ...prev, centerContent: content }));
  }, []);

  const setRightContent = useCallback((content: ReactNode | null) => {
    setState(prev => ({ ...prev, rightContent: content }));
  }, []);

  const setHeaderVisible = useCallback((visible: boolean) => {
    setState(prev => ({ ...prev, isVisible: visible }));
  }, []);

  const clearHeader = useCallback(() => {
    setState(initialState);
  }, []);

  const value: HeaderContextValue = {
    state,
    setLeftContent,
    setCenterContent,
    setRightContent,
    setHeaderVisible,
    clearHeader
  };

  return (
    <HeaderContext.Provider value={value}>
      {children}
    </HeaderContext.Provider>
  );
};

export const useHeader = () => {
  const context = useContext(HeaderContext);
  if (!context) {
    throw new Error('useHeader must be used within a HeaderProvider');
  }
  return context;
};

/**
 * Hook to manage header content with cleanup on unmount
 * @param position - The header section to manage ('left' | 'center' | 'right')
 * @param content - The content to display
 * @param deps - Optional dependency array to control when content updates
 */
export const useHeaderContent = (
  position: 'left' | 'center' | 'right',
  content: ReactNode | null,
  deps?: React.DependencyList
) => {
  const header = useHeader();

  React.useEffect(() => {
    switch (position) {
      case 'left':
        header.setLeftContent(content);
        break;
      case 'center':
        header.setCenterContent(content);
        break;
      case 'right':
        header.setRightContent(content);
        break;
    }

    // Cleanup on unmount
    return () => {
      switch (position) {
        case 'left':
          header.setLeftContent(null);
          break;
        case 'center':
          header.setCenterContent(null);
          break;
        case 'right':
          header.setRightContent(null);
          break;
      }
    };
  }, deps || [content]); // eslint-disable-line react-hooks/exhaustive-deps
};

export default HeaderContext;