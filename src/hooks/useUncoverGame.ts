'use client';

import { useCallback, useState } from 'react';
import { useSession } from 'next-auth/react';

import { useUncoverGameStore } from '@/stores/useUncoverGameStore';
import {
  useStartUncoverSessionMutation,
  useSubmitGuessMutation,
  useSkipGuessMutation,
} from '@/generated/graphql';
import { TOTAL_STAGES } from '@/lib/uncover/reveal-constants';

/**
 * Coordination hook for Uncover game.
 * Connects GraphQL mutations with Zustand store updates.
 *
 * Responsibilities:
 * - Start session and sync to store
 * - Submit guess and update store
 * - Skip guess and update store
 * - Calculate reveal stage from attempt count
 * - Handle loading/error states
 */
export function useUncoverGame() {
  const { data: session, status: authStatus } = useSession();
  const gameStore = useUncoverGameStore();

  // Local error state (in addition to store error)
  const [localError, setLocalError] = useState<string | null>(null);

  // GraphQL mutations
  const startMutation = useStartUncoverSessionMutation();
  const submitMutation = useSubmitGuessMutation();
  const skipMutation = useSkipGuessMutation();

  /**
   * Start a new session for today's challenge.
   * Syncs session and guesses to store.
   * Returns challenge image info for RevealImage component.
   */
  const startGame = useCallback(async () => {
    try {
      gameStore.setSubmitting(true);
      gameStore.clearError();
      setLocalError(null);

      const result = await startMutation.mutateAsync({});

      if (!result.startUncoverSession) {
        throw new Error('Failed to start session');
      }

      const {
        session: sessionData,
        imageUrl,
        cloudflareImageId,
        challengeId,
      } = result.startUncoverSession;

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
        error instanceof Error ? error.message : 'Failed to start game';
      gameStore.setError(errorMessage);
      setLocalError(errorMessage);
      throw error;
    } finally {
      gameStore.setSubmitting(false);
    }
  }, [gameStore, startMutation]);

  /**
   * Submit a guess for the current session.
   * Updates store with guess result and checks for game over.
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
    [gameStore, submitMutation]
  );

  /**
   * Skip the current guess.
   * Counts as a wrong guess, advances reveal stage.
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
  }, [gameStore, skipMutation]);

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
