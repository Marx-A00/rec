import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface TourState {
  // Step to resume tour from after navigation
  resumeStep: number | null;
  setResumeStep: (step: number | null) => void;

  // Tour completion status
  isCompleted: boolean;
  setCompleted: (completed: boolean) => void;

  // Clear all tour state
  reset: () => void;
}

export const useTourStore = create<TourState>()(
  persist(
    set => ({
      resumeStep: null,
      setResumeStep: step => set({ resumeStep: step }),

      isCompleted: false,
      setCompleted: completed => set({ isCompleted: completed }),

      reset: () => set({ resumeStep: null, isCompleted: false }),
    }),
    {
      name: 'tour-state', // localStorage key
      storage: createJSONStorage(() => localStorage),
    }
  )
);
