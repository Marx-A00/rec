import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ----- Types -----

export type SessionStatus = 'IN_PROGRESS' | 'WON' | 'LOST';

export interface Guess {
  guessNumber: number;
  guessedText: string | null; // null if skip
  isCorrect: boolean;
  guessedAlbumId?: string; // album UUID for client-side validation
}

export type GameMode = 'daily' | 'archive';

// ----- Session Slice -----

interface SessionSlice {
  sessionId: string | null;
  challengeId: string | null;
  status: SessionStatus;
  attemptCount: number;
  won: boolean;
  mode: GameMode;
  archiveDate: string | null;
  resultSubmitted: boolean;

  setSession: (session: {
    id: string;
    challengeId: string;
    mode?: GameMode;
    archiveDate?: string | null;
  }) => void;
  updateAttemptCount: (count: number) => void;
  endSession: (won: boolean) => void;
  markResultSubmitted: () => void;
  resetSession: () => void;
}

const createSessionSlice = (set: unknown): SessionSlice => ({
  sessionId: null,
  challengeId: null,
  status: 'IN_PROGRESS',
  attemptCount: 0,
  won: false,
  mode: 'daily',
  archiveDate: null,
  resultSubmitted: false,

  setSession: session =>
    (set as (partial: Partial<UncoverGameStore>) => void)({
      sessionId: session.id,
      challengeId: session.challengeId,
      status: 'IN_PROGRESS' as const,
      mode: session.mode ?? 'daily',
      archiveDate: session.archiveDate ?? null,
      resultSubmitted: false,
    }),
  updateAttemptCount: count =>
    (set as (partial: Partial<UncoverGameStore>) => void)({
      attemptCount: count,
    }),
  endSession: won =>
    (set as (partial: Partial<UncoverGameStore>) => void)({
      status: (won ? 'WON' : 'LOST') as SessionStatus,
      won,
    }),
  markResultSubmitted: () =>
    (set as (partial: Partial<UncoverGameStore>) => void)({
      resultSubmitted: true,
    }),
  resetSession: () =>
    (set as (partial: Partial<UncoverGameStore>) => void)({
      sessionId: null,
      challengeId: null,
      status: 'IN_PROGRESS' as const,
      attemptCount: 0,
      won: false,
      mode: 'daily',
      archiveDate: null,
      resultSubmitted: false,
    }),
});

// ----- Guesses Slice -----

interface GuessesSlice {
  guesses: Guess[];

  addGuess: (guess: Guess) => void;
  setGuesses: (guesses: Guess[]) => void;
  clearGuesses: () => void;
}

const createGuessesSlice = (set: unknown): GuessesSlice => ({
  guesses: [],

  addGuess: guess =>
    (
      set as (
        fn: (state: UncoverGameStore) => Partial<UncoverGameStore>
      ) => void
    )((state: UncoverGameStore) => ({
      guesses: [...state.guesses, guess],
    })),
  setGuesses: guesses =>
    (set as (partial: Partial<UncoverGameStore>) => void)({ guesses }),
  clearGuesses: () =>
    (set as (partial: Partial<UncoverGameStore>) => void)({ guesses: [] }),
});

// ----- UI Slice -----

interface UISlice {
  isSubmitting: boolean;
  error: string | null;

  setSubmitting: (submitting: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

const createUISlice = (set: unknown): UISlice => ({
  isSubmitting: false,
  error: null,

  setSubmitting: submitting =>
    (set as (partial: Partial<UncoverGameStore>) => void)({
      isSubmitting: submitting,
    }),
  setError: error =>
    (set as (partial: Partial<UncoverGameStore>) => void)({ error }),
  clearError: () =>
    (set as (partial: Partial<UncoverGameStore>) => void)({ error: null }),
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
        mode: state.mode,
        archiveDate: state.archiveDate,
        resultSubmitted: state.resultSubmitted,
      }),
    }
  )
);
