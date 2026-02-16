import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ----- Types -----

export type SessionStatus = 'IN_PROGRESS' | 'WON' | 'LOST';

export interface Guess {
  guessNumber: number;
  albumId: string | null; // null if skip
  albumTitle: string;
  artistName: string;
  isCorrect: boolean;
}

// ----- Session Slice -----

interface SessionSlice {
  sessionId: string | null;
  challengeId: string | null;
  status: SessionStatus;
  attemptCount: number;
  won: boolean;

  setSession: (session: { id: string; challengeId: string }) => void;
  updateAttemptCount: (count: number) => void;
  endSession: (won: boolean) => void;
  resetSession: () => void;
}

const createSessionSlice = (set: any): SessionSlice => ({
  sessionId: null,
  challengeId: null,
  status: 'IN_PROGRESS',
  attemptCount: 0,
  won: false,

  setSession: session =>
    set({
      sessionId: session.id,
      challengeId: session.challengeId,
      status: 'IN_PROGRESS' as const,
    }),
  updateAttemptCount: count => set({ attemptCount: count }),
  endSession: won =>
    set({
      status: (won ? 'WON' : 'LOST') as SessionStatus,
      won,
    }),
  resetSession: () =>
    set({
      sessionId: null,
      challengeId: null,
      status: 'IN_PROGRESS' as const,
      attemptCount: 0,
      won: false,
    }),
});

// ----- Guesses Slice -----

interface GuessesSlice {
  guesses: Guess[];

  addGuess: (guess: Guess) => void;
  setGuesses: (guesses: Guess[]) => void;
  clearGuesses: () => void;
}

const createGuessesSlice = (set: any): GuessesSlice => ({
  guesses: [],

  addGuess: guess =>
    set((state: any) => ({
      guesses: [...state.guesses, guess],
    })),
  setGuesses: guesses => set({ guesses }),
  clearGuesses: () => set({ guesses: [] }),
});

// ----- UI Slice -----

interface UISlice {
  isSubmitting: boolean;
  error: string | null;

  setSubmitting: (submitting: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

const createUISlice = (set: any): UISlice => ({
  isSubmitting: false,
  error: null,

  setSubmitting: submitting => set({ isSubmitting: submitting }),
  setError: error => set({ error }),
  clearError: () => set({ error: null }),
});

// ----- Combined Store -----

export type UncoverGameStore = SessionSlice & GuessesSlice & UISlice;

export const useUncoverGameStore = create<UncoverGameStore>()(
  persist(
    (set, get) => ({
      ...createSessionSlice(set),
      ...createGuessesSlice(set),
      ...createUISlice(set),
    }),
    {
      name: 'uncover-game-state',
      storage: createJSONStorage(() => localStorage),
      // Only persist session and guesses, NOT UI state
      partialize: state => ({
        sessionId: state.sessionId,
        challengeId: state.challengeId,
        status: state.status,
        attemptCount: state.attemptCount,
        won: state.won,
        guesses: state.guesses,
      }),
    }
  )
);
