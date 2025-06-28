'use client';

import { useState } from 'react';

export function useRecommendationDrawer() {
  const [isOpen, setIsOpen] = useState(false);

  const openDrawer = () => {
    setIsOpen(true);
  };

  const closeDrawer = () => {
    setIsOpen(false);
  };

  const handleSuccess = () => {
    // Close drawer on successful recommendation creation
    setIsOpen(false);
  };

  return {
    isOpen,
    openDrawer,
    closeDrawer,
    handleSuccess,
  };
}
