import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ----- Types -----

export type SessionStatus = 'IN_PROGRESS' | 'WON' | 'LOST';

export interface Guess {
  guessNumber: number;
  guessedText: string | null; // null if skip
  isCorrect: boolean;
  guessedAlbumId?: string; // album UUID for client-side validation
  guessedArtistName?: string; // artist name for partial-match hints
  guessedYear?: number; // release year for decade-match hints
}

export type GameMode = 'daily' | 'archive';

export interface CompletedSession {
  won: boolean;
  attemptCount: number;
  guesses: Guess[];
  resultSubmitted: boolean;
}

export interface SuspendedSession {
  sessionId: string;
  challengeId: string;
  attemptCount: number;
  guesses: Guess[];
}

// ----- Store -----

export interface UncoverGameStore {
  // Active session
  sessionId: string | null;
  challengeId: string | null;
  status: SessionStatus;
  attemptCount: number;
  won: boolean;
  mode: GameMode;
  archiveDate: string | null;
  resultSubmitted: boolean;

  setActiveSession: (session: {
    id: string;
    challengeId: string;
    mode?: GameMode;
    archiveDate?: string | null;
  }) => void;
  updateAttemptCount: (count: number) => void;
  endActiveSession: (won: boolean) => void;
  markActiveResultSubmitted: () => void;
  resetActiveSession: () => void;

  // Guesses (tied to active session)
  guesses: Guess[];
  addGuess: (guess: Guess) => void;
  setGuesses: (guesses: Guess[]) => void;
  clearGuesses: () => void;

  // Completed sessions (persistent history — survives resets)
  completedSessions: Record<string, CompletedSession>;
  saveCompletedSession: (challengeId: string, session: CompletedSession) => void;
  markCompletedSessionSubmitted: (challengeId: string) => void;
  removeCompletedSession: (challengeId: string) => void;

  // Suspended daily session (stashed when visiting archive mid-game)
  suspendedDailySession: SuspendedSession | null;
  suspendDailySession: () => void;
  restoreDailySession: () => SuspendedSession | null;

  // UI (transient — not persisted)
  isSubmitting: boolean;
  error: string | null;
  setSubmitting: (submitting: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useUncoverGameStore = create<UncoverGameStore>()(
  persist(
    (set, get) => ({
      // --- Active Session ---
      sessionId: null,
      challengeId: null,
      status: 'IN_PROGRESS' as SessionStatus,
      attemptCount: 0,
      won: false,
      mode: 'daily' as GameMode,
      archiveDate: null,
      resultSubmitted: false,

      setActiveSession: session =>
        set({
          sessionId: session.id,
          challengeId: session.challengeId,
          status: 'IN_PROGRESS' as SessionStatus,
          mode: session.mode ?? 'daily',
          archiveDate: session.archiveDate ?? null,
          resultSubmitted: false,
        }),

      updateAttemptCount: count => set({ attemptCount: count }),

      endActiveSession: won =>
        set({
          status: (won ? 'WON' : 'LOST') as SessionStatus,
          won,
        }),

      markActiveResultSubmitted: () => set({ resultSubmitted: true }),

      resetActiveSession: () =>
        set({
          sessionId: null,
          challengeId: null,
          status: 'IN_PROGRESS' as SessionStatus,
          attemptCount: 0,
          won: false,
          mode: 'daily' as GameMode,
          archiveDate: null,
          resultSubmitted: false,
        }),

      // --- Guesses ---
      guesses: [],

      addGuess: guess =>
        set(state => ({ guesses: [...state.guesses, guess] })),

      setGuesses: guesses => set({ guesses }),

      clearGuesses: () => set({ guesses: [] }),

      // --- Completed Sessions ---
      completedSessions: {},

      saveCompletedSession: (challengeId, session) =>
        set(state => ({
          completedSessions: {
            ...state.completedSessions,
            [challengeId]: session,
          },
        })),

      markCompletedSessionSubmitted: challengeId =>
        set(state => {
          const existing = state.completedSessions[challengeId];
          if (!existing) return {};
          return {
            completedSessions: {
              ...state.completedSessions,
              [challengeId]: { ...existing, resultSubmitted: true },
            },
          };
        }),

      removeCompletedSession: challengeId =>
        set(state => {
          const { [challengeId]: _, ...rest } = state.completedSessions;
          return { completedSessions: rest };
        }),

      // --- Suspended Daily Session ---
      suspendedDailySession: null,

      suspendDailySession: () =>
        set(state => {
          if (
            state.mode !== 'daily' ||
            state.status !== 'IN_PROGRESS' ||
            !state.sessionId ||
            !state.challengeId
          ) {
            return {};
          }
          return {
            suspendedDailySession: {
              sessionId: state.sessionId,
              challengeId: state.challengeId,
              attemptCount: state.attemptCount,
              guesses: state.guesses,
            },
          };
        }),

      restoreDailySession: () => {
        const suspended = get().suspendedDailySession;
        if (suspended) {
          set({ suspendedDailySession: null });
        }
        return suspended;
      },

      // --- UI ---
      isSubmitting: false,
      error: null,

      setSubmitting: submitting => set({ isSubmitting: submitting }),
      setError: error => set({ error }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'uncover-game-state',
      storage: createJSONStorage(() => localStorage),
      // Persist session, guesses, and completed history — NOT UI state
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
        completedSessions: state.completedSessions,
        suspendedDailySession: state.suspendedDailySession,
      }),
    }
  )
);
