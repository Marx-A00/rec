import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface TourState {
  // Step to resume tour from after navigation (persisted to localStorage)
  resumeStep: number | null;
  setResumeStep: (step: number | null) => void;
}

export const useTourStore = create<TourState>()(
  persist(
    set => ({
      resumeStep: null,
      setResumeStep: step => set({ resumeStep: step }),
    }),
    {
      name: 'tour-state', // localStorage key
      storage: createJSONStorage(() => localStorage),
    }
  )
);
