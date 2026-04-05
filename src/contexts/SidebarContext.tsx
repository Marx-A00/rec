'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  FC,
} from 'react';

export interface SidebarContextValue {
  isExpanded: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextValue | undefined>(
  undefined
);

export const SidebarProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleSidebar = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    setIsExpanded(false);
  }, []);

  const value: SidebarContextValue = {
    isExpanded,
    toggleSidebar,
    closeSidebar,
  };

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

export default SidebarContext;
