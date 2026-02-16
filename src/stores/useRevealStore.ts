import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type RevealStyle = 'pixelation' | 'blur';

interface RevealState {
  /** User's preferred reveal style (persisted to localStorage) */
  preferredStyle: RevealStyle;
  setPreferredStyle: (style: RevealStyle) => void;
}

export const useRevealStore = create<RevealState>()(
  persist(
    set => ({
      preferredStyle: 'pixelation',
      setPreferredStyle: style => set({ preferredStyle: style }),
    }),
    {
      name: 'reveal-preferences',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
