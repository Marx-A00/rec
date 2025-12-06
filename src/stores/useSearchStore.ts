import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type SearchType = 'albums' | 'artists' | 'tracks' | 'users';

interface SearchState {
  // User's preferred search type (persisted)
  preferredSearchType: SearchType;
  setPreferredSearchType: (type: SearchType) => void;

  // Recent searches (for autocomplete/history - future feature)
  recentSearches: string[];
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set) => ({
      // Default to albums
      preferredSearchType: 'albums',
      setPreferredSearchType: (type) => set({ preferredSearchType: type }),

      // Recent searches
      recentSearches: [],
      addRecentSearch: (query) =>
        set((state) => ({
          recentSearches: [
            query,
            ...state.recentSearches.filter((q) => q !== query),
          ].slice(0, 10), // Keep last 10 searches
        })),
      clearRecentSearches: () => set({ recentSearches: [] }),
    }),
    {
      name: 'search-preferences', // localStorage key
      storage: createJSONStorage(() => localStorage),
    }
  )
);
