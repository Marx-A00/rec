'use client';

import { useState } from 'react';
import { Album } from '@/types/album';

interface CollageState {
  selectedAlbums: (Album | null)[];
  userCollection: Album[];
  searchResults: Album[];
  searchQuery: string;
  isSearching: boolean;
}

export const useCollageGenerator = () => {
  const [selectedAlbums, setSelectedAlbums] = useState<(Album | null)[]>(
    new Array(25).fill(null)
  );
  const [userCollection, setUserCollection] = useState<Album[]>([]);
  const [searchResults, setSearchResults] = useState<Album[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const addAlbumToGrid = (album: Album) => {
    const firstEmptyIndex = selectedAlbums.findIndex(slot => slot === null);
    if (firstEmptyIndex !== -1) {
      const newAlbums = [...selectedAlbums];
      newAlbums[firstEmptyIndex] = album;
      setSelectedAlbums(newAlbums);
    }
  };

  const removeAlbumFromGrid = (index: number) => {
    const newAlbums = [...selectedAlbums];
    newAlbums[index] = null;
    setSelectedAlbums(newAlbums);
  };

  const clearGrid = () => {
    setSelectedAlbums(new Array(25).fill(null));
  };

  return {
    selectedAlbums,
    userCollection,
    searchResults,
    searchQuery,
    isSearching,
    addAlbumToGrid,
    removeAlbumFromGrid,
    clearGrid,
    setSearchQuery,
    setSearchResults,
    setIsSearching,
    setUserCollection
  };
}; 