"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SearchBar from "./SearchBar";
import SearchResults from "./SearchResults";
import { Album } from "@/types/album";

interface AlbumSearchProps {
  className?: string;
  onAlbumSelect?: (album: Album) => void;
  placeholder?: string;
  showResults?: boolean;
}

export default function AlbumSearch({
  className = "",
  onAlbumSelect,
  placeholder = "Search albums, artists, or genres...",
  showResults = true,
}: AlbumSearchProps) {
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResultsDropdown, setShowResultsDropdown] = useState(false);
  const router = useRouter();

  const searchAlbums = async (query: string) => {
    // Clear results if query is empty
    if (!query.trim()) {
      setSearchResults([]);
      setShowResultsDropdown(false);
      return;
    }

    // Don't search if already loading
    if (isLoading) return;

    console.log('Searching for:', query);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/search?query=${encodeURIComponent(query)}&type=all`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to search");
      }

      const data = await response.json();
      // Show all result types
      const allResults = data.results || [];
      setSearchResults(allResults);
      setShowResultsDropdown(true);
    } catch (err: any) {
      console.error("Error searching albums:", err);
      setError(`Failed to search albums: ${err.message}`);
      setSearchResults([]);
      setShowResultsDropdown(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResultSelect = (result: any) => {
    setShowResultsDropdown(false);
    
    // Handle different result types
    if (result.type === 'album') {
      if (onAlbumSelect) {
        onAlbumSelect(result);
      } else {
        // Store album data in sessionStorage and navigate to album details page
        sessionStorage.setItem(`album-${result.id}`, JSON.stringify(result));
        router.push(`/albums/${result.id}`);
      }
    } else if (result.type === 'artist') {
      // Store artist data and navigate to artist page
      sessionStorage.setItem(`artist-${result.id}`, JSON.stringify(result));
      router.push(`/artists/${result.id}`);
    } else if (result.type === 'label') {
      // Store label data and navigate to label page
      sessionStorage.setItem(`label-${result.id}`, JSON.stringify(result));
      router.push(`/labels/${result.id}`);
    } else {
      // For unknown types, try to handle as album for now
      console.log('Unknown result type:', result.type, result);
    }
  };

  const handleClear = () => {
    setSearchResults([]);
    setShowResultsDropdown(false);
    setError(null);
  };

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-search-container]')) {
        setShowResultsDropdown(false);
      }
    };

    if (showResultsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showResultsDropdown]);

  return (
    <div className={`relative ${className}`} data-search-container>
      <SearchBar
        placeholder={placeholder}
        onSearch={searchAlbums}
        onClear={handleClear}
        debounceMs={500}
      />
      
      {error && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-red-900 border border-red-700 rounded-lg p-3 text-red-200 text-sm z-50">
          {error}
        </div>
      )}

      {showResults && showResultsDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 z-40">
          <SearchResults
            results={searchResults}
            isLoading={isLoading}
            onAlbumSelect={handleResultSelect}
          />
        </div>
      )}
    </div>
  );
} 