'use client';

import { useState } from 'react';

export function useRecommendationModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const openModal = () => {
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsExiting(false);
    }, 300);
  };

  return {
    isOpen,
    isExiting,
    openModal,
    closeModal,
  };
}
