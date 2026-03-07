'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';

import { useUncoverGameStore } from '@/stores/useUncoverGameStore';
import type { Guess } from '@/stores/useUncoverGameStore';
import {
  useArchivePuzzleQuery,
  useSubmitGameResultMutation,
  useMyUncoverSessionsQuery,
  UncoverGameMode,
} from '@/generated/graphql';
import { TOTAL_STAGES } from '@/lib/uncover/reveal-constants';
import {
  isCorrectGuess,
  getGameResult,
  isDuplicateGuess,
  MAX_ATTEMPTS,
  type ClientGuess,
} from '@/lib/uncover/client-game-logic';

/**
 * Coordination hook for Archive game (client-side, Wordle-style).
 *
 * Same instant-validation pattern as useUncoverGame but for past puzzles:
 * - Uses useArchivePuzzleQuery with a date parameter
 * - Submits results with mode=ARCHIVE (no streak impact)
 * - Invalidates calendar query on completion
 * - Resets shared store on mount to avoid stale daily-game state
 */
export function useArchiveGame(challengeDate: Date) {
  const { data: session, status: authStatus } = useSession();
  const gameStore = useUncoverGameStore();
  const queryClient = useQueryClient();

  const [localError, setLocalError] = useState<string | null>(null);
  const hasReset = useRef(false);
  const retryAttempted = useRef(false);

  // ISO date string for store persistence
  const dateString = challengeDate.toISOString();

  // Fetch archive puzzle data (includes correct answer)
  const puzzleQuery = useArchivePuzzleQuery(
    { date: challengeDate },
    { enabled: authStatus === 'authenticated' }
  );

  const submitResultMutation = useSubmitGameResultMutation();

  const puzzle = puzzleQuery.data?.archivePuzzle;
  const correctAlbumId = puzzle?.correctAlbumId ?? null;

  // Reset shared store on mount so stale daily-game state doesn't interfere
  useEffect(() => {
    if (!hasReset.current) {
      gameStore.resetSession();
      gameStore.clearGuesses();
      gameStore.clearError();
      hasReset.current = true;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ----- Submit result to server (fire-and-forget) -----

  const submitResultToServer = useCallback(
    async (
      challengeId: string,
      guesses: Guess[],
      won: boolean,
      attemptCount: number
    ) => {
      try {
        gameStore.setSubmitting(true);

        const guessInputs = guesses.map((g, i) => ({
          guessNumber: g.guessNumber ?? i + 1,
          albumId: g.guessedAlbumId ?? null,
          albumTitle: g.guessedText ?? null,
          artistName: null as string | null,
          isCorrect: g.isCorrect,
          isSkipped: !g.guessedText && !g.guessedAlbumId,
        }));

        await submitResultMutation.mutateAsync({
          input: {
            challengeId,
            guesses: guessInputs,
            won,
            attemptCount,
            mode: UncoverGameMode.Archive,
          },
        });

        gameStore.markResultSubmitted();

        // Invalidate calendar query so it shows the new completion
        queryClient.invalidateQueries({
          queryKey: useMyUncoverSessionsQuery.getKey(),
        });
      } catch (error) {
        console.error(
          '[useArchiveGame] Failed to submit result to server:',
          error
        );
      } finally {
        gameStore.setSubmitting(false);
      }
    },
    [gameStore, submitResultMutation, queryClient]
  );

  // ----- Retry failed submissions on mount -----

  useEffect(() => {
    if (retryAttempted.current) return;

    const {
      challengeId,
      status,
      resultSubmitted,
      guesses,
      won,
      attemptCount,
      mode,
    } = gameStore;

    if (
      challengeId &&
      mode === 'archive' &&
      (status === 'WON' || status === 'LOST') &&
      !resultSubmitted
    ) {
      retryAttempted.current = true;
      submitResultToServer(challengeId, guesses, won, attemptCount);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- Start game -----

  const startGame = useCallback(async () => {
    try {
      gameStore.clearError();
      setLocalError(null);

      let puzzleData = puzzle;
      if (!puzzleData) {
        const result = await puzzleQuery.refetch();
        puzzleData = result.data?.archivePuzzle;
      }

      if (!puzzleData) {
        throw new Error('No puzzle available for this date');
      }

      // Check if server has an existing completed result
      if (puzzleData.existingResult) {
        const existing = puzzleData.existingResult;

        gameStore.setSession({
          id: crypto.randomUUID(),
          challengeId: puzzleData.challengeId,
          mode: 'archive',
          archiveDate: dateString,
        });

        gameStore.clearGuesses();
        existing.guesses.forEach(g => {
          gameStore.addGuess({
            guessNumber: g.guessNumber,
            guessedText: g.albumTitle ?? null,
            isCorrect: g.isCorrect,
            guessedAlbumId: g.albumId ?? undefined,
          });
        });

        gameStore.updateAttemptCount(existing.attemptCount);
        gameStore.endSession(existing.won);
        gameStore.markResultSubmitted();

        return {
          imageUrl: puzzleData.imageUrl ?? '',
          cloudflareImageId: puzzleData.cloudflareImageId ?? undefined,
        };
      }

      // Fresh archive session
      gameStore.setSession({
        id: crypto.randomUUID(),
        challengeId: puzzleData.challengeId,
        mode: 'archive',
        archiveDate: dateString,
      });
      gameStore.clearGuesses();
      gameStore.updateAttemptCount(0);

      return {
        imageUrl: puzzleData.imageUrl ?? '',
        cloudflareImageId: puzzleData.cloudflareImageId ?? undefined,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to start archive game';
      gameStore.setError(errorMessage);
      setLocalError(errorMessage);
      return null;
    }
  }, [gameStore, puzzle, puzzleQuery, dateString]);

  // ----- Submit guess (instant) -----

  const submitGuess = useCallback(
    async (guessText: string, localAlbumId?: string) => {
      if (!gameStore.sessionId || !gameStore.challengeId) {
        throw new Error('No active session');
      }
      if (!correctAlbumId) {
        throw new Error('Puzzle data not loaded');
      }

      gameStore.clearError();
      setLocalError(null);

      // Check for duplicate
      if (localAlbumId) {
        const clientGuesses: ClientGuess[] = gameStore.guesses.map(g => ({
          guessNumber: g.guessNumber,
          albumId: g.guessedAlbumId ?? null,
          albumTitle: g.guessedText,
          artistName: null,
          isCorrect: g.isCorrect,
          isSkipped: !g.guessedText && !g.guessedAlbumId,
        }));

        if (isDuplicateGuess(localAlbumId, clientGuesses)) {
          const msg = 'You have already guessed this album';
          gameStore.setError(msg);
          setLocalError(msg);
          return { isCorrect: false, gameOver: false, won: false };
        }
      }

      const correct = localAlbumId
        ? isCorrectGuess(localAlbumId, correctAlbumId)
        : false;

      const newGuessNumber = gameStore.guesses.length + 1;

      gameStore.addGuess({
        guessNumber: newGuessNumber,
        guessedText: guessText,
        isCorrect: correct,
        guessedAlbumId: localAlbumId,
      });

      const newAttemptCount = gameStore.attemptCount + 1;
      gameStore.updateAttemptCount(newAttemptCount);

      const updatedGuesses: ClientGuess[] = [
        ...gameStore.guesses.map(g => ({
          guessNumber: g.guessNumber,
          albumId: g.guessedAlbumId ?? null,
          albumTitle: g.guessedText,
          artistName: null,
          isCorrect: g.isCorrect,
          isSkipped: !g.guessedText && !g.guessedAlbumId,
        })),
        {
          guessNumber: newGuessNumber,
          albumId: localAlbumId ?? null,
          albumTitle: guessText,
          artistName: null,
          isCorrect: correct,
          isSkipped: false,
        },
      ];

      const result = getGameResult(updatedGuesses, MAX_ATTEMPTS);

      if (result.gameOver) {
        gameStore.endSession(result.won);

        const allGuesses = [...gameStore.guesses];
        submitResultToServer(
          gameStore.challengeId,
          allGuesses,
          result.won,
          newAttemptCount
        );
      }

      return {
        isCorrect: correct,
        gameOver: result.gameOver,
        won: result.won,
      };
    },
    [gameStore, correctAlbumId, submitResultToServer]
  );

  // ----- Skip guess (instant) -----

  const skipGuess = useCallback(async () => {
    if (!gameStore.sessionId || !gameStore.challengeId) {
      throw new Error('No active session');
    }

    gameStore.clearError();
    setLocalError(null);

    const newGuessNumber = gameStore.guesses.length + 1;

    gameStore.addGuess({
      guessNumber: newGuessNumber,
      guessedText: null,
      isCorrect: false,
    });

    const newAttemptCount = gameStore.attemptCount + 1;
    gameStore.updateAttemptCount(newAttemptCount);

    const updatedGuesses: ClientGuess[] = [
      ...gameStore.guesses.map(g => ({
        guessNumber: g.guessNumber,
        albumId: g.guessedAlbumId ?? null,
        albumTitle: g.guessedText,
        artistName: null,
        isCorrect: g.isCorrect,
        isSkipped: !g.guessedText && !g.guessedAlbumId,
      })),
      {
        guessNumber: newGuessNumber,
        albumId: null,
        albumTitle: null,
        artistName: null,
        isCorrect: false,
        isSkipped: true,
      },
    ];

    const result = getGameResult(updatedGuesses, MAX_ATTEMPTS);

    if (result.gameOver) {
      gameStore.endSession(result.won);

      const allGuesses = [...gameStore.guesses];
      submitResultToServer(
        gameStore.challengeId,
        allGuesses,
        result.won,
        newAttemptCount
      );
    }

    return { gameOver: result.gameOver };
  }, [gameStore, submitResultToServer]);

  // ----- Reveal stage -----

  const revealStage =
    gameStore.status === 'WON' || gameStore.status === 'LOST'
      ? TOTAL_STAGES
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

    // Puzzle data
    correctAlbumId,
    correctAlbumTitle: puzzle?.correctAlbumTitle ?? null,
    correctAlbumArtist: puzzle?.correctAlbumArtist ?? null,

    // UI state
    isSubmitting: gameStore.isSubmitting,
    isPuzzleLoading: puzzleQuery.isLoading,
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
