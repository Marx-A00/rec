'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';

import { useUncoverGameStore } from '@/stores/useUncoverGameStore';
import {
  useStartArchiveSessionMutation,
  useSubmitGuessMutation,
  useSkipGuessMutation,
  useMyUncoverSessionsQuery,
} from '@/generated/graphql';
import { TOTAL_STAGES } from '@/lib/uncover/reveal-constants';

/**
 * Coordination hook for Archive game (past puzzles).
 * Similar to useUncoverGame but for playing historical challenges.
 *
 * Key differences from daily game:
 * - Takes challengeDate parameter
 * - Uses startArchiveSession mutation
 * - Passes mode='archive' to submit/skip mutations (tracked separately)
 * - Invalidates MyUncoverSessions query on completion (for calendar update)
 *
 * Responsibilities:
 * - Start archive session for specific date
 * - Submit guess with mode='archive'
 * - Skip guess with mode='archive'
 * - Calculate reveal stage from attempt count
 * - Invalidate calendar query on game completion
 */
export function useArchiveGame(challengeDate: Date) {
  const { data: session, status: authStatus } = useSession();
  const gameStore = useUncoverGameStore();
  const queryClient = useQueryClient();

  // Local error state
  const [localError, setLocalError] = useState<string | null>(null);

  // Track whether the store has been reset for this archive instance.
  // The shared Zustand store may contain stale state from the daily game
  // (persisted in localStorage), so we must clear it before starting.
  const hasReset = useRef(false);

  // GraphQL mutations
  const startMutation = useStartArchiveSessionMutation();
  const submitMutation = useSubmitGuessMutation();
  const skipMutation = useSkipGuessMutation();

  // Reset shared store on mount so stale daily-game state doesn't interfere
  useEffect(() => {
    if (!hasReset.current) {
      gameStore.resetSession();
      gameStore.clearGuesses();
      gameStore.clearError();
      hasReset.current = true;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Start an archive session for the specified date.
   * Syncs session and guesses to store.
   */
  const startGame = useCallback(async () => {
    try {
      gameStore.setSubmitting(true);
      gameStore.clearError();
      setLocalError(null);

      const result = await startMutation.mutateAsync({
        date: challengeDate,
      });

      if (!result.startArchiveSession) {
        throw new Error('Failed to start archive session');
      }

      const {
        session: sessionData,
        imageUrl,
        cloudflareImageId,
        challengeId,
      } = result.startArchiveSession;

      // Sync session to store
      gameStore.setSession({
        id: sessionData.id,
        challengeId: challengeId,
      });

      // Sync guesses to store (for resumed sessions)
      gameStore.clearGuesses();
      sessionData.guesses.forEach(guess => {
        gameStore.addGuess({
          guessNumber: guess.guessNumber,
          guessedText: guess.guessedText ?? null,
          isCorrect: guess.isCorrect,
        });
      });

      // Update attempt count
      gameStore.updateAttemptCount(sessionData.attemptCount);

      // Check if session is already completed (resumed session)
      if (sessionData.status === 'WON') {
        gameStore.endSession(true);
      } else if (sessionData.status === 'LOST') {
        gameStore.endSession(false);
      }

      return {
        imageUrl,
        cloudflareImageId: cloudflareImageId ?? undefined,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to start archive game';
      gameStore.setError(errorMessage);
      setLocalError(errorMessage);
      throw error;
    } finally {
      gameStore.setSubmitting(false);
    }
  }, [gameStore, startMutation, challengeDate]);

  /**
   * Submit a guess for the archive session.
   * Updates store with guess result and checks for game over.
   * Invalidates calendar query on game completion.
   */
  const submitGuess = useCallback(
    async (guessText: string, localAlbumId?: string) => {
      if (!gameStore.sessionId) {
        throw new Error('No active session');
      }

      try {
        gameStore.setSubmitting(true);
        gameStore.clearError();
        setLocalError(null);

        const result = await submitMutation.mutateAsync({
          sessionId: gameStore.sessionId,
          guessText,
          albumId: localAlbumId,
        });

        if (!result.submitGuess) {
          throw new Error('Failed to submit guess');
        }

        const { guess, session, gameOver } = result.submitGuess;

        // Add guess to store
        gameStore.addGuess({
          guessNumber: guess.guessNumber,
          guessedText: guess.guessedText ?? guessText,
          isCorrect: guess.isCorrect,
        });

        // Update attempt count
        gameStore.updateAttemptCount(session.attemptCount);

        // End session if game over
        if (gameOver) {
          gameStore.endSession(session.won);

          // Invalidate calendar query to update completed status
          queryClient.invalidateQueries({
            queryKey: useMyUncoverSessionsQuery.getKey(),
          });
        }

        return {
          isCorrect: guess.isCorrect,
          gameOver,
          won: session.won,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to submit guess';
        gameStore.setError(errorMessage);
        setLocalError(errorMessage);
        throw error;
      } finally {
        gameStore.setSubmitting(false);
      }
    },
    [gameStore, submitMutation, queryClient]
  );

  /**
   * Skip the current guess in archive mode.
   * Counts as a wrong guess, advances reveal stage.
   * Invalidates calendar query on game completion.
   */
  const skipGuess = useCallback(async () => {
    if (!gameStore.sessionId) {
      throw new Error('No active session');
    }

    try {
      gameStore.setSubmitting(true);
      gameStore.clearError();
      setLocalError(null);

      const result = await skipMutation.mutateAsync({
        sessionId: gameStore.sessionId,
      });

      if (!result.skipGuess) {
        throw new Error('Failed to skip guess');
      }

      const { guess, session, gameOver } = result.skipGuess;

      // Add skip to store
      gameStore.addGuess({
        guessNumber: guess.guessNumber,
        guessedText: null,
        isCorrect: false,
      });

      // Update attempt count
      gameStore.updateAttemptCount(session.attemptCount);

      // End session if game over
      if (gameOver) {
        gameStore.endSession(session.won);

        // Invalidate calendar query to update completed status
        queryClient.invalidateQueries({
          queryKey: useMyUncoverSessionsQuery.getKey(),
        });
      }

      return {
        gameOver,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to skip guess';
      gameStore.setError(errorMessage);
      setLocalError(errorMessage);
      throw error;
    } finally {
      gameStore.setSubmitting(false);
    }
  }, [gameStore, skipMutation, queryClient]);

  /**
   * Calculate reveal stage from attempt count.
   * Stages 1-4 are in-game (15% → 25% → 35% → 50%).
   * Stage 5 (full reveal) = game over.
   */
  const revealStage =
    gameStore.status === 'WON' || gameStore.status === 'LOST'
      ? TOTAL_STAGES // Full reveal on game over
      : Math.min(gameStore.attemptCount + 1, TOTAL_STAGES - 1);

  return {
    // Auth state
    isAuthenticated: !!session?.user,
    isAuthLoading: authStatus === 'loading',
    user: session?.user,

    // Game state from store
    sessionId: gameStore.sessionId,
    challengeId: gameStore.challengeId,
    status: gameStore.status,
    attemptCount: gameStore.attemptCount,
    won: gameStore.won,
    guesses: gameStore.guesses,

    // UI state
    isSubmitting: gameStore.isSubmitting,
    error: gameStore.error || localError,

    // Computed values
    revealStage,
    isGameOver: gameStore.status === 'WON' || gameStore.status === 'LOST',

    // Actions
    startGame,
    submitGuess,
    skipGuess,
    resetGame: gameStore.resetSession,
    clearError: () => {
      gameStore.clearError();
      setLocalError(null);
    },
  };
}
