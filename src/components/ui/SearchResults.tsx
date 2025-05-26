"use client";

import Image from "next/image";
import { Music } from "lucide-react";
import { Album } from "@/types/album";

interface SearchResultsProps {
  results: Album[];
  isLoading: boolean;
  onAlbumSelect?: (album: Album) => void;
  className?: string;
}

export default function SearchResults({
  results,
  isLoading,
  onAlbumSelect,
  className = "",
}: SearchResultsProps) {
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
      {results.map((album) => (
        <div
          key={album.id}
          onClick={() => onAlbumSelect?.(album)}
          className="flex items-center space-x-3 p-3 hover:bg-zinc-800 cursor-pointer border-b border-zinc-800 last:border-b-0 transition-colors"
        >
          <div className="relative w-12 h-12 flex-shrink-0">
            {album.image?.url ? (
              <Image
                src={album.image.url}
                alt={album.image.alt || `${album.title} cover`}
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
              className={`w-full h-full bg-zinc-800 rounded flex items-center justify-center ${album.image?.url ? 'hidden' : ''}`}
            >
              <Music className="h-6 w-6 text-zinc-600" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-medium truncate">{album.title}</h3>
            <p className="text-zinc-400 text-sm truncate">{album.artist}</p>
            {album.releaseDate && (
              <p className="text-zinc-500 text-xs">
                {new Date(album.releaseDate).getFullYear()}
              </p>
            )}
          </div>
          {album.genre && album.genre.length > 0 && (
            <div className="flex-shrink-0">
              <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">
                {album.genre[0]}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
} 