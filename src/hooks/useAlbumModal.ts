'use client';

import { useState } from 'react';

import { CollectionAlbum } from '@/types';
import { Release } from '@/types/album';

export function useAlbumModal() {
  const [selectedItem, setSelectedItem] = useState<
    Release | CollectionAlbum | null
  >(null);

  const [isExiting, setIsExiting] = useState(false);

  const openModal = (item: Release | CollectionAlbum) => {
    setSelectedItem(item);
  };

  const closeModal = () => {
    setIsExiting(true);
    setTimeout(() => {
      setSelectedItem(null);
      setIsExiting(false);
    }, 300);
  };

  return {
    selectedItem,
    isExiting,
    isOpen: !!selectedItem,
    openModal,
    closeModal,
  };
}
