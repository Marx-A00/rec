'use client';

import { useEffect, useState } from 'react';

import { Album } from '@/types/album';
interface RecommendationModalProps {
  isOpen: boolean;
  onClose: () => void;
  _isExiting: boolean;
}
export default function RecommendationModal({
  isOpen,
  onClose,
  _isExiting,
}: RecommendationModalProps) {
  const [_selectedBasisAlbum, _setSelectedBasisAlbum] = useState<Album | null>(
    null
  );
  const [_selectedRecommendedAlbum, _setSelectedRecommendedAlbum] =
    useState<Album | null>(null);
  const [_isSearchingForBasis, _setIsSearchingForBasis] =
    useState<boolean>(true);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);
}
