"use client";

import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  onClear?: () => void;
  className?: string;
  autoFocus?: boolean;
  debounceMs?: number;
  resultsCount?: number;
  highlightedIndex?: number;
  onNavigate?: (direction: 'up' | 'down') => void;
  onSelectHighlighted?: () => void;
  onEscape?: () => void;
}

export default function SearchBar({
  placeholder = "Search albums, artists, or genres...",
  onSearch,
  onClear,
  className = "",
  autoFocus = false,
  debounceMs = 300,
  resultsCount = 0,
  highlightedIndex = -1,
  onNavigate,
  onSelectHighlighted,
  onEscape,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  // Debounced search effect - only search when user stops typing
  useEffect(() => {
    if (!onSearch || !query.trim()) return;

    const timer = setTimeout(() => {
      if (query.trim().length > 2) {
        onSearch(query.trim());
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query]); // Remove onSearch and debounceMs from dependencies

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleClear = () => {
    setQuery("");
    if (onClear) {
      onClear();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      handleClear();
      onEscape?.();
    } else if (e.key === "ArrowDown" || (e.ctrlKey && e.key === "n") || (e.ctrlKey && e.key === "j")) {
      e.preventDefault();
      onNavigate?.('down');
    } else if (e.key === "ArrowUp" || (e.ctrlKey && e.key === "p") || (e.ctrlKey && e.key === "k")) {
      e.preventDefault();
      onNavigate?.('up');
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && resultsCount > 0) {
        onSelectHighlighted?.();
      }
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div
        className={`relative flex items-center bg-zinc-900 border rounded-lg transition-all duration-200 ${
          isFocused
            ? "shadow-lg"
            : "border-zinc-700 hover:border-zinc-600"
        }`}
        style={isFocused ? {
          borderColor: '#317039',
          boxShadow: '0 10px 15px -3px rgba(49, 112, 57, 0.2), 0 4px 6px -2px rgba(49, 112, 57, 0.1)'
        } : {}}
      >
        <Search className="absolute left-3 h-4 w-4 text-zinc-400" />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full pl-10 pr-10 py-3 bg-transparent text-white placeholder-zinc-400 focus:outline-none"
          role="combobox"
          aria-expanded={resultsCount > 0}
          aria-activedescendant={highlightedIndex >= 0 ? `search-result-${highlightedIndex}` : undefined}
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 p-1 text-zinc-400 hover:text-white transition-colors"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {/* Keyboard navigation hint */}
      {resultsCount > 0 && (
        <div className="absolute top-full right-0 mt-1 text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded shadow">
          Use ↑↓, C-p/n, C-k/j to navigate, Enter to select, Esc to close
        </div>
      )}
    </div>
  );
} 