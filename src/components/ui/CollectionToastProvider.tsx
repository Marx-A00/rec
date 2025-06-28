'use client';

import { createContext, useContext, ReactNode } from 'react';

import CollectionToast, { useCollectionToast } from './CollectionToast';

interface CollectionToastContextType {
  showCollectionToast: (
    message: string,
    type?: 'success' | 'error',
    options?: {
      showNavigation?: boolean;
      navigationLabel?: string;
      navigationUrl?: string;
    }
  ) => void;
  hideCollectionToast: () => void;
}

const CollectionToastContext = createContext<
  CollectionToastContextType | undefined
>(undefined);

interface CollectionToastProviderProps {
  children: ReactNode;
}

export function CollectionToastProvider({
  children,
}: CollectionToastProviderProps) {
  const { toast, showCollectionToast, hideCollectionToast } =
    useCollectionToast();

  return (
    <CollectionToastContext.Provider
      value={{ showCollectionToast, hideCollectionToast }}
    >
      {children}
      <CollectionToast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideCollectionToast}
        showNavigation={toast.showNavigation}
        navigationLabel={toast.navigationLabel}
        navigationUrl={toast.navigationUrl}
      />
    </CollectionToastContext.Provider>
  );
}

export function useCollectionToastContext() {
  const context = useContext(CollectionToastContext);
  if (context === undefined) {
    throw new Error(
      'useCollectionToastContext must be used within a CollectionToastProvider'
    );
  }
  return context;
}
