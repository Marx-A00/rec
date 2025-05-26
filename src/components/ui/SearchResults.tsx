"use client";

import Image from "next/image";
import { Music, User, Building2, Tag } from "lucide-react";
import { Album } from "@/types/album";

interface SearchResultsProps {
  results: any[];
  isLoading: boolean;
  onAlbumSelect?: (result: any) => void;
  className?: string;
}

export default function SearchResults({
  results,
  isLoading,
  onAlbumSelect,
  className = "",
}: SearchResultsProps) {
  
  const getResultIcon = (type: string) => {
    switch (type) {
      case 'album':
        return <Music className="h-6 w-6 text-zinc-600" />;
      case 'artist':
        return <User className="h-6 w-6 text-zinc-600" />;
      case 'label':
        return <Building2 className="h-6 w-6 text-zinc-600" />;
      default:
        return <Tag className="h-6 w-6 text-zinc-600" />;
    }
  };

  const getResultTypeColor = (type: string) => {
    switch (type) {
      case 'album':
        return 'bg-blue-800 text-blue-200';
      case 'artist':
        return 'bg-green-800 text-green-200';
      case 'label':
        return 'bg-purple-800 text-purple-200';
      default:
        return 'bg-zinc-800 text-zinc-300';
    }
  };
  if (isLoading) {
    return (
      <div className={`bg-zinc-900 border border-zinc-700 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
          <span className="text-zinc-400">Searching...</span>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return null;
  }

  return (
    <div className={`bg-zinc-900 border border-zinc-700 rounded-lg max-h-96 overflow-y-auto ${className}`}>
      {results.map((result) => (
        <div
          key={result.id}
          onClick={() => onAlbumSelect?.(result)}
          className="flex items-center space-x-3 p-3 hover:bg-zinc-800 cursor-pointer border-b border-zinc-800 last:border-b-0 transition-colors"
        >
          <div className="relative w-12 h-12 flex-shrink-0">
            {result.image?.url ? (
              <Image
                src={result.image.url}
                alt={result.image.alt || `${result.title} cover`}
                fill
                className="object-cover rounded"
                sizes="48px"
                onError={(e) => {
                  // Hide the image and show fallback on error
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div 
              className={`w-full h-full bg-zinc-800 rounded flex items-center justify-center ${result.image?.url ? 'hidden' : ''}`}
            >
              {getResultIcon(result.type)}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-medium truncate">{result.title}</h3>
            <p className="text-zinc-400 text-sm truncate">
              {result.subtitle || result.artist}
            </p>
            {result.releaseDate && (
              <p className="text-zinc-500 text-xs">
                {new Date(result.releaseDate).getFullYear()}
              </p>
            )}
          </div>
          <div className="flex-shrink-0 flex flex-col items-end space-y-1">
            {/* Result type badge */}
            <span className={`text-xs px-2 py-1 rounded capitalize ${getResultTypeColor(result.type)}`}>
              {result.type}
            </span>
            {/* Genre badge for albums */}
            {result.genre && result.genre.length > 0 && result.type === 'album' && (
              <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">
                {result.genre[0]}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
} 