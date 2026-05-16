import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface HintState {
  dismissedHints: string[];
  dismissHint: (id: string) => void;
  hasSeenHint: (id: string) => boolean;
  resetHints: () => void;
}

export const useHintStore = create<HintState>()(
  persist(
    (set, get) => ({
      dismissedHints: [],
      dismissHint: (id: string) =>
        set(state => ({
          dismissedHints: state.dismissedHints.includes(id)
            ? state.dismissedHints
            : [...state.dismissedHints, id],
        })),
      hasSeenHint: (id: string) => get().dismissedHints.includes(id),
      resetHints: () => set({ dismissedHints: [] }),
    }),
    {
      name: 'contextual-hints',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
